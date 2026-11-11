import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import type { Job } from "@/lib/types";
import { isOpenOrder, orderActionNeeded, orderNumber, scheduleText } from "@/lib/workOrders";
import { CardSkeletons, PENGUIN, Snowfall } from "~/components/brand";
import { JobActionButtons, useJobActions } from "~/components/JobActions";
import { JobCard } from "~/components/JobCard";
import { ORDER_STEPS, ProgressBar, stepIndex } from "~/components/OrderProgress";
import { Avatar, Card, Icon, Screen, SectionTitle, SwipeTabs } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { personName, useChats, useJobs, usePeople, type Person } from "~/lib/data";
import { db } from "~/lib/firebase";
import { money } from "~/lib/format";
import { useNotifications } from "~/lib/notifications";
import { colors, hero, radius, shadow, space, stepColor, type } from "~/lib/theme";

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

const TIPS = {
  client: [
    "Park off the driveway the night before a storm so your shoveler can clear edge to edge.",
    "Leave a gate code in the chat so nobody waits in the cold.",
    "Booking right after the snow stops usually gets the fastest visit.",
    "Salt works best under −10°C when it’s mixed with a little sand.",
  ],
  operator: [
    "A clear before and after photo is the best review you can ask for.",
    "Turn “Taking new jobs” off when you’re booked up, so customers aren’t left waiting.",
    "Reply to requests within 10 minutes and you’ll win more of them.",
    "Customers love a quick “on my way” message with your ETA.",
  ],
};

/** Which open order deserves the spotlight: one waiting on you, then one underway, then the next one. */
function spotlight(open: Job[], uid: string) {
  const rank = (j: Job) => (orderActionNeeded(j, uid) ? 0 : j.status === "in-progress" ? 1 : j.status === "en-route" ? 2 : j.status === "accepted" ? 3 : 4);
  return [...open].sort((a, b) => rank(a) - rank(b))[0];
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const { jobs, loading, reload } = useJobs(uid, profile?.role);
  const { chats, reload: reloadChats } = useChats(uid);
  const people = usePeople(jobs.map((j) => (operator ? j.clientId : j.operatorId)));
  const open = useMemo(() => jobs.filter(isOpenOrder), [jobs]);
  const done = jobs.filter((j) => j.status === "completed");
  const featured = spotlight(open, uid);
  const others = open.filter((j) => j.id !== featured?.id);
  const attention = jobs.filter((j) => orderActionNeeded(j, uid)).length;
  const earned = done.reduce((sum, j) => sum + jobDisplayPrice(j, true), 0);
  const unreadChats = chats.reduce((sum, c) => sum + (c.unreadCount?.[uid] || 0), 0);
  const firstName = (profile?.displayName || "").split(" ")[0];
  const { unread } = useNotifications(uid);
  const tips = TIPS[operator ? "operator" : "client"];
  const tip = tips[new Date().getDate() % tips.length];
  const available = profile?.isAvailable !== false;

  const stats = operator
    ? [
        { icon: "tray.full.fill", label: "Requests", value: String(open.filter((j) => j.status === "pending").length), tint: stepColor("pending").text, onPress: () => router.navigate("/jobs") },
        { icon: "checkmark.seal.fill", label: "Jobs done", value: String(done.length), tint: stepColor("completed").text, onPress: () => router.navigate("/jobs") },
        { icon: "star.fill", label: "Rating", value: profile?.reviewCount ? (profile.rating || 0).toFixed(1) : "New", tint: colors.sunText, onPress: () => router.push(`/operator/${uid}`) },
      ]
    : [
        { icon: "list.clipboard.fill", label: "Open orders", value: String(open.length), tint: stepColor("en-route").text, onPress: () => router.navigate("/jobs") },
        { icon: "checkmark.seal.fill", label: "Cleared", value: String(done.length), tint: stepColor("completed").text, onPress: () => router.navigate("/jobs") },
        { icon: "bubble.left.fill", label: "Unread", value: String(unreadChats), tint: stepColor("in-progress").text, onPress: () => router.navigate("/messages") },
      ];

  const shortcuts = operator
    ? [
        { icon: "tag.fill", label: "Prices", path: "/settings/prices" },
        { icon: "map.fill", label: "Area", path: "/settings/service-area" },
        { icon: "paintpalette.fill", label: "Brand", path: "/settings/branding" },
        { icon: "chart.bar.fill", label: "Earnings", path: "/settings/transactions" },
      ]
    : [
        { icon: "magnifyingglass", label: "Find", path: "/find" },
        { icon: "house.fill", label: "Homes", path: "/settings/properties" },
        { icon: "creditcard.fill", label: "Payments", path: "/settings/transactions" },
        { icon: "bell.fill", label: "Updates", path: "/notifications" },
      ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeTabs tab="/home">
        <Screen
          contentInsetAdjustmentBehavior="never"
          contentStyle={{ padding: 0, gap: space.lg, paddingBottom: insets.bottom + 90 }}
          onRefresh={() => {
            reload();
            reloadChats();
          }}
        >
          {/* Hero: night-sky gradient with falling snow, the greeting and the one thing to do next. */}
          <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
            <Snowfall count={22} height={300} />
            <Image source={PENGUIN} style={styles.penguin} contentFit="contain" accessibilityIgnoresInvertColors />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.logo} accessibilityRole="header">SNOWD</Text>
              <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={unread ? `${unread} unread updates` : "Updates"} onPress={() => router.push("/notifications")} style={styles.bell}>
                <Icon name={unread ? "bell.badge.fill" : "bell.fill"} size={19} color="#fff" />
                {unread ? (
                  <View style={styles.bellDot}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{unread > 9 ? "9+" : unread}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
            <View style={{ gap: 4, marginTop: space.lg, paddingRight: 90 }}>
              <Text style={styles.hello}>{greeting()}{firstName ? `, ${firstName}` : ""} ❄️</Text>
              <Text style={styles.headline}>
                {operator
                  ? attention
                    ? `${attention} job${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} you`
                    : open.length
                      ? `${open.length} job${open.length === 1 ? "" : "s"} on the go`
                      : available
                        ? "Ready for the next storm"
                        : "You’re off the clock"
                  : featured
                    ? ORDER_STEPS[stepIndex(featured)]?.client.replace(/\.$/, "") || "Your order is moving"
                    : "Need snow cleared?"}
              </Text>
            </View>

            {operator ? (
              <View style={styles.heroRow}>
                <View style={styles.glass}>
                  <Text style={styles.glassLabel}>Taking new jobs</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.glassValue}>{available ? "On" : "Off"}</Text>
                    <Switch
                      accessibilityLabel="Taking new jobs"
                      value={available}
                      trackColor={{ true: "#3ddc97", false: "rgba(255,255,255,0.3)" }}
                      onValueChange={(value) => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        void updateDoc(doc(db, "users", uid), { isAvailable: value }).catch(() => {});
                      }}
                    />
                  </View>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Earned so far ${money(earned)}`} onPress={() => router.push("/settings/transactions")} style={({ pressed }) => [styles.glass, pressed && { opacity: 0.85 }]}>
                  <Text style={styles.glassLabel}>Earned so far</Text>
                  <Text style={styles.glassValue} numberOfLines={1} adjustsFontSizeToFit>{money(earned)}</Text>
                </Pressable>
              </View>
            ) : !featured ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Find a shoveler" onPress={() => router.navigate("/find")} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
                <Icon name="magnifyingglass" size={16} color={hero.mid} />
                <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>Find a shoveler near {profile?.city || "you"}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: space.lg, gap: space.lg, marginTop: -space.xxl }}>
            {operator && !profile?.idVerified ? (
              <Card onPress={profile?.verificationStatus === "pending" ? undefined : () => router.push("/settings/verification")} style={{ backgroundColor: colors.sunSoft, borderColor: colors.sunBorder, flexDirection: "row", alignItems: "center" }}>
                <Icon name="person.badge.shield.checkmark.fill" size={24} color={colors.sunText} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.headline}>{profile?.verificationStatus === "pending" ? "Your ID is in review" : "Verify your ID to get jobs"}</Text>
                  <Text style={type.caption}>{profile?.verificationStatus === "pending" ? "We’ll let you know as soon as you’re approved." : "Customers can find you once you’re verified."}</Text>
                </View>
                {profile?.verificationStatus !== "pending" ? <Icon name="chevron.right" size={13} color={colors.sunText} /> : null}
              </Card>
            ) : null}

            {loading ? <CardSkeletons count={2} /> : featured ? <Spotlight job={featured} uid={uid} other={people[operator ? featured.clientId : featured.operatorId]} /> : null}

            {/* Three numbers at a glance; each opens the place it counts. */}
            <View style={{ flexDirection: "row", gap: space.sm }}>
              {stats.map((s) => (
                <Pressable key={s.label} accessibilityRole="button" accessibilityLabel={`${s.label}: ${s.value}`} onPress={() => { void Haptics.selectionAsync(); s.onPress(); }} style={({ pressed }) => [styles.stat, pressed && { transform: [{ scale: 0.97 }] }]}>
                  <Icon name={s.icon as never} size={16} color={s.tint} />
                  <Text style={[type.title, { fontVariant: ["tabular-nums"] }]} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
                  <Text style={type.caption} numberOfLines={1}>{s.label}</Text>
                </Pressable>
              ))}
            </View>

            {others.length ? (
              <>
                <SectionTitle action={<Text onPress={() => router.navigate("/jobs")} style={{ color: colors.accent, fontWeight: "700", fontSize: 15 }}>See all</Text>}>{operator ? "More jobs" : "More orders"}</SectionTitle>
                {others.slice(0, 4).map((job) => (
                  <JobCard key={job.id} job={job} uid={uid} other={people[operator ? job.clientId : job.operatorId]} />
                ))}
              </>
            ) : null}

            <SectionTitle>Shortcuts</SectionTitle>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              {shortcuts.map((s) => (
                <Pressable key={s.label} accessibilityRole="button" accessibilityLabel={s.label} onPress={() => { void Haptics.selectionAsync(); router.push(s.path as never); }} style={({ pressed }) => [styles.shortcut, pressed && { transform: [{ scale: 0.95 }] }]}>
                  <View style={styles.shortcutIcon}>
                    <Icon name={s.icon as never} size={20} color={colors.accent} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }} numberOfLines={1}>{s.label}</Text>
                </Pressable>
              ))}
            </View>

            {!loading && !jobs.length ? (
              <>
                <SectionTitle>How SNOWD works</SectionTitle>
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  {(operator
                    ? [["person.badge.shield.checkmark.fill", "Get verified", "pending"], ["bell.fill", "Accept jobs", "accepted"], ["camera.fill", "Snap & get paid", "completed"]]
                    : [["map.fill", "Pick a shoveler", "pending"], ["paperplane.fill", "Send a request", "en-route"], ["checkmark.seal.fill", "Pay when done", "completed"]]
                  ).map(([icon, title, step], i) => (
                    <View key={title} accessible accessibilityLabel={`Step ${i + 1}: ${title}`} style={[styles.howCard, { backgroundColor: stepColor(step).soft }]}>
                      <Text style={{ fontSize: 28, fontWeight: "900", color: stepColor(step).bar, opacity: 0.35 }}>{i + 1}</Text>
                      <Icon name={icon as never} size={20} color={stepColor(step).text} />
                      <Text style={{ fontSize: 14, fontWeight: "800", color: stepColor(step).text }}>{title}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* A small daily tip from the penguin. */}
            <View style={styles.tip}>
              <Image source={PENGUIN} style={{ width: 40, height: 43 }} contentFit="contain" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.overline, { color: hero.mid }]}>Penguin tip</Text>
                <Text style={[type.callout, { color: colors.ink }]}>{tip}</Text>
              </View>
            </View>
          </View>
        </Screen>
      </SwipeTabs>
    </>
  );
}

/** The order that matters most right now, with its colour-coded progress and the next step one tap away. */
function Spotlight({ job, uid, other }: { job: Job; uid: string; other?: Person }) {
  const router = useRouter();
  const state = useJobActions(job);
  const operator = job.operatorId === uid;
  const step = ORDER_STEPS[stepIndex(job)];
  const tone = stepColor(job.status);
  const action = orderActionNeeded(job, uid);
  const eta = job.status === "en-route" && job.eta ? `Arriving in about ${job.eta} min` : job.status === "accepted" && job.nearbyEta ? `Under 1 km away · about ${job.nearbyEta} min` : "";
  return (
    <View style={[styles.spot, { borderColor: tone.bar }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Order ${orderNumber(job)}, ${step?.label}. Open order`} onPress={() => router.push(`/job/${job.id}`)} style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={[styles.stepPill, { backgroundColor: tone.soft }]}>
              <Icon name={step?.icon || "snowflake"} size={11} color={tone.text} weight="bold" />
              <Text style={{ color: tone.text, fontWeight: "800", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>{step?.label}</Text>
            </View>
            <Text style={type.headline} numberOfLines={1}>{personName(other)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[type.headline, { fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, operator))}</Text>
            <Text style={type.caption}>#{orderNumber(job)}</Text>
          </View>
        </View>
        <ProgressBar job={job} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name={eta ? "car.fill" : "calendar"} size={13} color={eta ? tone.text : colors.muted} />
          <Text style={[type.caption, eta ? { color: tone.text, fontWeight: "700" } : null, { flex: 1 }]} numberOfLines={1}>{eta || scheduleText(job)}</Text>
          <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 14 }}>Open ›</Text>
        </View>
      </Pressable>
      {action ? <Text style={{ color: colors.sunText, fontWeight: "700", fontSize: 15 }}>Your turn: {action.charAt(0).toLowerCase() + action.slice(1)}</Text> : null}
      <JobActionButtons state={state} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl + space.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    backgroundColor: hero.mid,
    backgroundImage: `linear-gradient(160deg, ${hero.top} 0%, ${hero.mid} 55%, ${hero.bottom} 100%)`,
  },
  penguin: { position: "absolute", right: -8, bottom: 18, width: 108, height: 116, transform: [{ rotate: "-10deg" }] },
  logo: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#ff8b45", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: hero.mid },
  hello: { color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: "600" },
  headline: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: -0.6, lineHeight: 35 },
  heroRow: { flexDirection: "row", gap: space.sm, marginTop: space.lg, paddingRight: 70 },
  glass: { flex: 1, gap: 4, padding: space.md, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  glassLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  glassValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  cta: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: space.lg, minHeight: 50, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: "#fff", ...shadow, shadowOpacity: 0.2 },
  spot: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, gap: space.md, borderTopWidth: 5, ...shadow, shadowOpacity: 0.12, shadowRadius: 18 },
  stepPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  stat: { flex: 1, gap: 2, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow },
  shortcut: { flex: 1, alignItems: "center", gap: 6, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  shortcutIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  howCard: { flex: 1, gap: 6, padding: space.md, borderRadius: radius.lg, minHeight: 120 },
  tip: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: "#eef4ff", borderWidth: 1, borderColor: colors.accentBorder },
});
