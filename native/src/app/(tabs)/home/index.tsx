import { Stack, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useMemo } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { isOpenOrder, orderActionNeeded } from "@/lib/workOrders";
import { JobCard } from "~/components/JobCard";
import { Button, Card, Empty, Icon, Notice, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useJobs, usePeople } from "~/lib/data";
import { db } from "~/lib/firebase";
import { money } from "~/lib/format";
import { useNotifications } from "~/lib/notifications";
import { colors, radius, space, type } from "~/lib/theme";

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

export default function Home() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const { jobs, loading } = useJobs(uid, profile?.role);
  const people = usePeople(jobs.map((j) => (operator ? j.clientId : j.operatorId)));
  const open = useMemo(() => jobs.filter(isOpenOrder), [jobs]);
  const attention = open.filter((j) => orderActionNeeded(j, uid)).length + jobs.filter((j) => j.status === "completed" && orderActionNeeded(j, uid)).length;
  const earned = jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + jobDisplayPrice(j, true), 0);
  const firstName = (profile?.displayName || "").split(" ")[0];
  const { unread } = useNotifications(uid);

  return (
    <>
      <Stack.Screen
        options={{
          title: firstName ? `${greeting()}, ${firstName}` : greeting(),
          headerRight: () => (
            <Pressable hitSlop={10} accessibilityLabel={unread ? `${unread} unread updates` : "Updates"} onPress={() => router.push("/notifications")} style={{ paddingHorizontal: 6 }}>
              <Icon name={unread ? "bell.badge.fill" : "bell"} size={20} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {operator && !profile?.idVerified ? (
          <Card style={{ backgroundColor: colors.sunSoft, borderColor: "#ffd9bf" }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Icon name="person.badge.shield.checkmark.fill" size={22} color="#c25a12" />
              <Text style={[type.headline, { flex: 1 }]}>Finish verification to get jobs</Text>
            </View>
            <Text style={type.callout}>
              {profile?.verificationStatus === "pending" ? "Your ID is being reviewed. We’ll let you know as soon as you’re approved." : "Customers can find you once your ID is verified and payouts are connected."}
            </Text>
            {profile?.verificationStatus !== "pending" ? <Button title="Verify my ID" variant="dark" small onPress={() => router.push("/settings/verification")} /> : null}
          </Card>
        ) : null}

        {operator ? (
          <View style={{ flexDirection: "row", gap: space.md }}>
            <Card style={{ flex: 1, gap: 4 }}>
              <Text style={type.caption}>Available for jobs</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[type.title, { color: profile?.isAvailable === false ? colors.muted : colors.mint }]}>{profile?.isAvailable === false ? "Off" : "On"}</Text>
                <Switch value={profile?.isAvailable !== false} trackColor={{ true: colors.mint }} onValueChange={(value) => void updateDoc(doc(db, "users", uid), { isAvailable: value }).catch(() => {})} />
              </View>
            </Card>
            <Card style={{ flex: 1, gap: 4 }}>
              <Text style={type.caption}>Earned</Text>
              <Text style={[type.title, { fontVariant: ["tabular-nums"] }]}>{money(earned)}</Text>
            </Card>
          </View>
        ) : (
          <Card onPress={() => router.push("/find")} style={{ backgroundColor: colors.ink, borderColor: colors.ink, padding: space.xl }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="snowflake" size={22} color="#fff" />
            </View>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.4 }}>Need snow cleared?</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 20 }}>See verified shovelers near {profile?.city || "you"} and book in a minute.</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: "#9db4ff", fontWeight: "700", fontSize: 15 }}>Find a shoveler</Text>
              <Icon name="arrow.right" size={13} color="#9db4ff" />
            </View>
          </Card>
        )}

        {attention ? <Notice tone="orange" text={`${attention} order${attention === 1 ? " needs" : "s need"} your attention.`} /> : null}

        <SectionTitle action={jobs.length ? <Button title="See all" variant="ghost" small onPress={() => router.push("/jobs")} /> : undefined}>
          {operator ? "Your jobs" : "Your orders"}
        </SectionTitle>
        {!loading && !open.length ? (
          <Empty icon="checkmark.seal" title="You’re all caught up" body={operator ? "Stay available and new requests will arrive here." : "No open orders right now."} />
        ) : null}
        {open.slice(0, 5).map((job) => (
          <JobCard key={job.id} job={job} uid={uid} other={people[operator ? job.clientId : job.operatorId]} />
        ))}
      </Screen>
    </>
  );
}
