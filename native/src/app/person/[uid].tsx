import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { dateMillis, isOpenOrder, orderLabel, orderNumber } from "@/lib/workOrders";
import { TabHeader } from "~/components/TabHeader";
import { Avatar, Button, Group, Loading, Row, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { personName, useJobs, type Person } from "~/lib/data";
import { db } from "~/lib/firebase";
import { colors, space, type } from "~/lib/theme";

/** A customer's profile, opened from the top of a chat: who they are and your jobs together. */
export default function PersonScreen() {
  const { uid: personId } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const [person, setPerson] = useState<(Person & { createdAt?: unknown; phone?: string; city?: string; province?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const { jobs } = useJobs(uid, profile?.role);

  useEffect(() => {
    if (!personId) return;
    getDoc(doc(db, "users", personId))
      .then((snap) => setPerson(snap.exists() ? ({ uid: snap.id, ...snap.data() } as never) : null))
      .catch(() => setPerson(null))
      .finally(() => setLoading(false));
  }, [personId]);

  const together = useMemo(() => jobs.filter((j) => j.clientId === personId || j.operatorId === personId).sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt)), [jobs, personId]);
  const chatId = together.find((j) => j.chatId)?.chatId;

  if (loading) return <Loading />;
  const name = personName(person || undefined);
  const since = dateMillis(person?.createdAt);
  const place = [person?.city, person?.province].filter(Boolean).join(", ");
  const open = together.filter(isOpenOrder);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: name }} />
      <Screen contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 0, gap: space.lg }}>
        <TabHeader title="Profile" onBack={() => (router.canGoBack() ? router.back() : router.replace("/messages"))}>
          <View style={{ alignItems: "center", gap: 6, paddingBottom: space.sm }}>
            <View style={{ borderWidth: 4, borderColor: "rgba(255,255,255,0.95)", borderRadius: 60 }}>
              <Avatar uri={person?.logoUrl || person?.avatar} name={name} size={96} />
            </View>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 6 }}>{name}</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 15 }}>
              {[person?.role === "operator" ? "Shoveler" : "Customer", place, since ? `Member since ${new Date(since).getFullYear()}` : ""].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </TabHeader>

        <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {chatId ? <Button title="Message" icon="bubble.left.fill" style={{ flex: 1 }} onPress={() => router.push(`/chat/${chatId}`)} /> : null}
            {person?.phone && open.length ? <Button title="Call" icon="phone.fill" variant="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`tel:${person.phone!.replace(/[^\d+]/g, "")}`)} /> : null}
          </View>

          <SectionTitle>Jobs together</SectionTitle>
          {together.length ? (
            <Group>
              {together.slice(0, 12).map((job, i) => (
                <Row key={job.id} icon={isOpenOrder(job) ? "snowflake" : job.status === "completed" ? "checkmark.seal.fill" : "xmark.octagon"} label={`#${orderNumber(job)} · ${orderLabel(job)}`} value={dateMillis(job.createdAt) ? new Date(dateMillis(job.createdAt)).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : ""} onPress={() => router.push(`/job/${job.id}`)} last={i === Math.min(together.length, 12) - 1} />
              ))}
            </Group>
          ) : (
            <Text style={[type.callout, { color: colors.muted }]}>No jobs together yet.</Text>
          )}
        </View>
      </Screen>
    </>
  );
}
