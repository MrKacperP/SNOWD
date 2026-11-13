import { Stack, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, interpolate, LinearTransition, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Job } from "@/lib/types";
import { isOpenOrder, orderActionNeeded } from "@/lib/workOrders";
import {
  ActiveJobCard,
  BlueHeader,
  BookCard,
  Celebration,
  ControlRow,
  DashboardSkeleton,
  HomeTitle,
  HomeTopBar,
  InfoList,
  MessageCard,
  type Control,
  type InfoItem,
} from "~/components/dashboard";
import { EarningsChart } from "~/components/EarningsChart";
import { ORDER_STEPS, stepIndex } from "~/components/OrderProgress";
import { Screen, SwipeTabs } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useChats, useJobs, usePeople } from "~/lib/data";
import { spotlight } from "~/lib/headerTone";
import { db } from "~/lib/firebase";
import { useNotifications } from "~/lib/notifications";
import { useAppTheme } from "~/lib/appearance";
import { useProperties } from "~/lib/properties";
import { brand, ds, gap, stepColor } from "~/lib/theme";

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};


const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const { jobs, loading, reload } = useJobs(uid, profile?.role);
  const { chats, reload: reloadChats } = useChats(uid);
  const people = usePeople(jobs.map((j) => (operator ? j.clientId : j.operatorId)));
  const { unread } = useNotifications(uid);
  const { properties, selectedLocation } = useProperties(!!uid && !operator);
  const [celebration, setCelebration] = useState("");
  const scrollY = useSharedValue(0);
  // Once the title has scrolled away, a frosted strip keeps the status bar readable.
  const statusScrim = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [140, 190], [0, 1], "clamp") }));
  // Shovelers are always available while they use the app: there's no on/off switch to forget.
  useEffect(() => {
    if (operator && uid && profile?.isAvailable === false) void updateDoc(doc(db, "users", uid), { isAvailable: true }).catch(() => {});
  }, [operator, uid, profile?.isAvailable]);

  const open = useMemo(() => jobs.filter(isOpenOrder), [jobs]);
  const done = useMemo(() => jobs.filter((j) => j.status === "completed"), [jobs]);
  const featured = spotlight(open, uid);
  const others = open.filter((j) => j.id !== featured?.id);
  const requests = open.filter((j) => j.status === "pending" && orderActionNeeded(j, uid)).length;
  const unreadChats = chats.reduce((sum, c) => sum + (c.unreadCount?.[uid] || 0), 0);
  const firstName = (profile?.displayName || "").split(" ")[0];
  // Shovelers see their business logo; customers see the photo of their home (the selected one first).
  const home = properties.find((p) => p.address === selectedLocation?.address) || properties[0];
  const homePhoto = properties.map((p) => p.photos?.[0]).find(Boolean);
  const picture = operator ? profile?.logoUrl || profile?.avatar : home?.photos?.[0] || homePhoto || profile?.avatar;
  // The header takes the live job's progress colour, and SNOWD blue when nothing is on the go.
  const theme = useAppTheme();
  const headerTone = featured && theme.jobColouredHeader ? stepColor(featured.status) : undefined;

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(""), 12000);
    return () => clearTimeout(timer);
  }, [celebration]);
  const onFinished = useCallback((message: string, key: string) => {
    if (key === "finish" || key === "cash") setCelebration(message);
  }, []);

  const jobsLine = open.length ? `${plural(open.length, operator ? "job" : "order")} on the go` : operator ? "No jobs right now" : "Nothing booked";
  const status = operator ? jobsLine : featured ? ORDER_STEPS[stepIndex(featured)]?.client.replace(/\.$/, "") || jobsLine : jobsLine;

  const controls: Control[] = operator
    ? [
        { key: "jobs", icon: "list.clipboard", label: "Jobs", onPress: () => router.navigate("/jobs") },
        { key: "invite", icon: "qrcode", label: "Invite", onPress: () => router.push("/settings/clients") },
        { key: "prices", icon: "tag", label: "Prices", onPress: () => router.push("/settings/prices") },
        { key: "area", icon: "map", label: "Area", onPress: () => router.push("/settings/service-area") },
      ]
    : [
        { key: "book", icon: "magnifyingglass", label: "Book", onPress: () => router.navigate("/find") },
        { key: "homes", icon: "house", label: "Properties", onPress: () => router.push("/settings/properties") },
        { key: "pay", icon: "receipt", label: "Payments", onPress: () => router.push("/settings/transactions") },
        { key: "cards", icon: "creditcard", label: "Cards", onPress: () => router.push("/settings/payments") },
      ];

  const info: InfoItem[] = operator
    ? [
        { key: "jobs", icon: "checkmark.circle", label: "Jobs", value: `${done.length} done${requests ? ` · ${requests} new` : ""}`, onPress: () => router.navigate("/jobs") },
        ...(others.length ? [{ key: "more", icon: "list.bullet" as const, label: "Up next", value: plural(others.length, "job"), onPress: () => router.navigate("/jobs") }] : []),
        ...(!profile?.idVerified
          ? [{ key: "id", icon: "person.badge.shield.checkmark" as const, label: profile?.verificationStatus === "pending" ? "ID in review" : "Verify your ID", value: "", iconColor: brand.gold, onPress: profile?.verificationStatus === "pending" ? undefined : () => router.push("/settings/verification") }]
          : []),
      ]
    : [
        { key: "orders", icon: "list.clipboard", label: "Orders", value: `${open.length} open · ${done.length} done`, onPress: () => router.navigate("/jobs") },
        { key: "unread", icon: "bubble.left", label: "Messages", value: unreadChats ? `${unreadChats} unread` : "All read", onPress: () => router.navigate("/messages") },
      ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeTabs tab="/home">
        <Screen
          contentInsetAdjustmentBehavior="never"
          scrollY={scrollY}
          // Once the dashboard has loaded (cards change height), bring it back to the very top.
          topKey={loading ? "loading" : "ready"}
          contentStyle={{ padding: 0, paddingBottom: insets.bottom + 96, gap: 0 }}
          onRefresh={() => {
            reload();
            reloadChats();
          }}
        >
          <BlueHeader
            topInset={insets.top}
            tone={headerTone}
            // The work order (or the book card) sits inside the gradient, which runs to its bottom.
            footer={
              loading ? (
                <DashboardSkeleton />
              ) : featured ? (
                <ActiveJobCard key={featured.id} job={featured} uid={uid} other={people[operator ? featured.clientId : featured.operatorId]} onFinished={onFinished} />
              ) : operator ? (
                <MessageCard title="No active job" body="New requests will show up here, and we’ll notify you." />
              ) : (
                <BookCard city={profile?.city} onBook={() => router.navigate("/find")} />
              )
            }
          >
            <HomeTopBar
              unread={unread}
              onBell={() => router.push("/notifications")}
              avatar={picture}
              name={operator ? profile?.businessName || profile?.displayName : profile?.displayName}
              pictureLabel={operator ? "Your business profile" : "Your properties"}
              onProfile={() => (operator || !properties.length ? router.navigate("/profile") : router.push("/settings/properties"))}
            />
            <HomeTitle title={firstName ? `Hi, ${firstName}` : greeting()} status={status} />
          </BlueHeader>

          <Animated.View layout={LinearTransition.duration(240)} entering={FadeIn.duration(300)} style={{ gap: gap.x4, paddingHorizontal: gap.x4, paddingTop: gap.x4 }}>
            {celebration ? <Celebration message={celebration} onDismiss={() => setCelebration("")} /> : null}
            {/* Quick controls come after the job: the work itself is the priority. */}
            <ControlRow items={controls} />
            {operator && !loading ? <EarningsChart compact jobs={jobs} onPress={() => router.push("/settings/transactions")} /> : null}
            {!loading ? <InfoList items={info} /> : null}
          </Animated.View>
        </Screen>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.scrim, { height: insets.top }, statusScrim]} />
        </View>
      </SwipeTabs>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(246,248,251,0.96)", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ds.border },
});
