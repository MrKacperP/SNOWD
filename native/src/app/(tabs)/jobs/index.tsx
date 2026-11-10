import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { orderSection } from "@/lib/workOrders";
import { JobCard } from "~/components/JobCard";
import { Button, Chip, Empty, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useJobs, usePeople } from "~/lib/data";

const SECTIONS = [
  ["attention", "Needs your reply"],
  ["progress", "Happening now"],
  ["upcoming", "Confirmed"],
  ["waiting", "Waiting for a reply"],
  ["history", "Past orders"],
] as const;

export default function Jobs() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const { jobs, loading } = useJobs(uid, profile?.role);
  const [filter, setFilter] = useState<"open" | "history">("open");
  const people = usePeople(jobs.map((j) => (operator ? j.clientId : j.operatorId)));

  const grouped = useMemo(() => {
    const map = new Map<string, typeof jobs>();
    for (const job of jobs) {
      const section = orderSection(job, uid);
      if ((filter === "history") !== (section === "history")) continue;
      map.set(section, [...(map.get(section) || []), job]);
    }
    return SECTIONS.filter(([key]) => map.get(key)?.length).map(([key, title]) => ({ key, title, jobs: map.get(key)! }));
  }, [jobs, uid, filter]);

  return (
    <>
      <Stack.Screen options={{ title: operator ? "Jobs" : "Orders" }} />
      <Screen>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="Current" icon="clock" selected={filter === "open"} onPress={() => setFilter("open")} />
          <Chip label="Past" icon="checkmark.circle" selected={filter === "history"} onPress={() => setFilter("history")} />
        </View>
        {!loading && !grouped.length ? (
          <Empty
            icon="list.clipboard"
            title={filter === "open" ? (operator ? "No current jobs" : "No current orders") : operator ? "No past jobs yet" : "No past orders yet"}
            body={filter === "history" ? "Finished and cancelled visits are kept here." : operator ? "New requests from customers appear here." : "Find a shoveler near you to book a visit."}
            action={!operator && filter === "open" ? <Button title="Find a shoveler" icon="map.fill" onPress={() => router.push("/find")} /> : undefined}
          />
        ) : null}
        {grouped.map((group) => (
          <View key={group.key} style={{ gap: 12 }}>
            <SectionTitle>{group.title}</SectionTitle>
            {group.jobs.map((job) => (
              <JobCard key={job.id} job={job} uid={uid} other={people[operator ? job.clientId : job.operatorId]} />
            ))}
          </View>
        ))}
      </Screen>
    </>
  );
}
