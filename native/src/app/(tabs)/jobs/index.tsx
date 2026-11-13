import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { orderSection } from "@/lib/workOrders";
import { JobCard } from "~/components/JobCard";
import { CardSkeletons } from "~/components/brand";
import { HeaderPill, TabHeader } from "~/components/TabHeader";
import { Button, Empty, Screen, SectionTitle, SwipeTabs } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useJobs, usePeople } from "~/lib/data";
import { useLiveHeaderTone } from "~/lib/headerTone";

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
  const { jobs, loading, reload } = useJobs(uid, profile?.role);
  const tone = useLiveHeaderTone(jobs, uid);
  const [filter, setFilter] = useState<"open" | "history">("open");
  const people = usePeople(jobs.map((j) => (operator ? j.clientId : j.operatorId)));

  const openCount = useMemo(() => jobs.filter((j) => orderSection(j, uid) !== "history").length, [jobs, uid]);

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
      <Stack.Screen options={{ headerShown: false, title: operator ? "Jobs" : "Orders" }} />
      <SwipeTabs tab="/jobs">
      <Screen onRefresh={reload} contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 0, paddingBottom: 120 }}>
        <TabHeader tone={tone} title={operator ? "Jobs" : "Orders"} subtitle={openCount ? `${openCount} on the go` : operator ? "Nothing on the go right now" : "Nothing booked right now"}>
          <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
            <HeaderPill label="Current" count={openCount} selected={filter === "open"} onPress={() => setFilter("open")} />
            <HeaderPill label="Past" selected={filter === "history"} onPress={() => setFilter("history")} />
          </View>
        </TabHeader>
        <View style={{ padding: 16, gap: 16 }}>
        {loading ? <CardSkeletons /> : null}
        {!loading && !grouped.length ? (
          <Empty
            icon="list.clipboard"
            title={filter === "open" ? (operator ? "No current jobs" : "No current orders") : operator ? "No past jobs yet" : "No past orders yet"}
            body={filter === "history" ? "Finished and cancelled visits are kept here." : operator ? "New requests from customers appear here." : "Find a shoveler near you to book a visit."}
            action={!operator && filter === "open" ? <Button title="Find a shoveler" icon="map.fill" onPress={() => router.navigate("/find")} /> : undefined}
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
        </View>
      </Screen>
      </SwipeTabs>
    </>
  );
}
