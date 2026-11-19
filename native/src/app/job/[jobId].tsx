import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActionSheetIOS, Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS } from "@/lib/types";
import { orderLabel, orderNumber, propertySizeLabel, scheduleText, terminalOrderDateText } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { JobActionButtons, useJobActions } from "~/components/JobActions";
import { CurrentStep } from "~/components/OrderProgress";
import { JobMiniMap } from "~/components/JobMiniMap";
import { RateJob } from "~/components/RateJob";
import { paymentActions } from "~/lib/jobActions";
import { TabHeader } from "~/components/TabHeader";
import { Avatar, Badge, Button, Card, Empty, Icon, Loading, Notice, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { personName, useJob, usePeople } from "~/lib/data";
import { money } from "~/lib/format";
import { colors, radius, shadow, space, stepColor, type } from "~/lib/theme";
import { useAppTheme } from "~/lib/appearance";

type IconName = Parameters<typeof Icon>[0]["name"];

export default function JobScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { job, loading } = useJob(jobId);
  const operator = !!job && job.operatorId === uid;
  const otherId = job ? (operator ? job.clientId : job.operatorId) : "";
  const other = usePeople(otherId ? [otherId] : [])[otherId];
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoOpen, setPhotoOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const appTheme = useAppTheme();
  const actionState = useJobActions(job);
  const payState = useJobActions(job, { list: paymentActions });

  if (loading) return <Loading />;
  if (!job)
    return (
      <Screen>
        <Empty icon="doc.questionmark" title="We couldn’t find this order" body="It may have been removed. Your other orders are safe." action={<Button title="See my orders" onPress={() => router.replace("/jobs")} />} />
      </Screen>
    );

  const cancelOrder = async () => {
    setBusy("cancel");
    setError("");
    try {
      await api("/api/jobs/cancel", { jobId: job.id });
      setSuccess("Order cancelled.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  };
  // A sheet that asks once before cancelling.
  const confirmCancel = () => {
    void Haptics.selectionAsync();
    const title = "Cancel this order?";
    const message = "Any card hold is released. This can’t be undone.";
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title, message, options: ["Cancel order", "Keep order"], destructiveButtonIndex: 0, cancelButtonIndex: 1 }, (i) => {
        if (i === 0) void cancelOrder();
      });
    } else {
      Alert.alert(title, message, [
        { text: "Keep order", style: "cancel" },
        { text: "Cancel order", style: "destructive", onPress: () => void cancelOrder() },
      ]);
    }
  };

  const closed = ["completed", "cancelled"].includes(job.status);
  // The header takes this order's progress colour while it's live, matching its progress bar.
  const headerTone = !closed && appTheme.jobColouredHeader ? stepColor(job.status) : undefined;
  const target = typeof job.clientLat === "number" && typeof job.clientLng === "number" ? { latitude: job.clientLat, longitude: job.clientLng } : null;
  const fullAddress = [job.address, job.city, job.province, job.postalCode].filter(Boolean).join(", ");
  // Opens the address in Maps: driving directions for the shoveler, the spot on the map for the customer.
  const openMap = () => {
    void Haptics.selectionAsync();
    const q = encodeURIComponent(fullAddress);
    const ll = target ? `${target.latitude},${target.longitude}` : "";
    const url =
      Platform.OS === "ios"
        ? operator
          ? `maps://?daddr=${ll || q}&q=${q}`
          : `maps://?${ll ? `ll=${ll}&` : ""}q=${q}`
        : `geo:${ll || "0,0"}?q=${q}`;
    void Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${q}`));
  };
  const phone = other?.phone && !closed ? other.phone : "";
  const view = workOrderPresentation(job, uid);
  const cash = job.paymentMethod === "cash";
  const paid = job.paymentStatus === "paid";
  const held = job.paymentStatus === "held";
  const released = job.paymentStatus === "refunded";
  // One plain sentence about the money, so nobody wonders whether or when they are charged.
  const paymentHelp = cash
    ? paid
      ? "Paid in cash."
      : operator
        ? "The customer pays you in cash when the work is done."
        : "Pay your shoveler in cash when the work is done."
    : paid
      ? operator ? "Paid by card. Your payout is on its way." : "Paid by card. Your receipt is in Payment history."
      : held
        ? operator ? "Card authorized. You’re paid after the photo of the finished work." : "Card authorized, not charged. You’re charged only after the work is done."
        : released
          ? "The card hold was released. Nothing was charged."
          : operator ? "The customer still needs to authorize their card." : "Authorize your card to confirm. You’re charged only after the work is done.";

  // The arrival time is the one thing people check most, so it sits right under the order number.
  const eta =
    job.status === "en-route" && job.eta
      ? `Arriving in about ${job.eta} min`
      : job.status === "accepted" && job.nearbyEta
        ? operator ? `You’re under 1 km away · about ${job.nearbyEta} min` : `Your shoveler is under 1 km away · about ${job.nearbyEta} min`
        : "";
  const payKeys = new Set(payState.actions.map((a) => a.key));
  const barState = { ...actionState, actions: actionState.actions.filter((a) => !payKeys.has(a.key)) };
  // Every button that moves the order on (including paying) lives in the bar at the bottom, under your thumb.
  const hasBar = barState.actions.length + payState.actions.length > 0;
  // The map helps while the shoveler is getting there; once they've arrived it's no longer needed.
  const showMap = !!target && ["pending", "accepted", "en-route"].includes(job.status);
  const what = [(job.serviceTypes || []).map((s) => SERVICE_LABELS[s] || s).join(", ") || "Snow clearing", propertySizeLabel(job.propertySize)].filter(Boolean).join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: `Order #${orderNumber(job)}`, headerShown: false }} />
      <Screen contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentStyle={{ padding: 0, gap: space.md, paddingBottom: hasBar ? (barState.actions.length && payState.actions.length ? 172 : 104) + insets.bottom : space.xl }} onRefresh={() => undefined}>
        {/* The order number on a coloured band: back on the left, the "…" menu on the right. */}
        <TabHeader
          tone={headerTone}
          title={`Order #${orderNumber(job)}`}
          subtitle={eta || undefined}
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/jobs"))}
          footer={
            <Card style={{ gap: space.md }}>
              {/* Where the order stands: the bar, then only the step happening now. */}
              <CurrentStep job={job} operator={operator} note={job.status === "cancelled" ? `${view.title}. ${view.description}` : view.description || undefined} />
              <View style={styles.rule} />
              {/* Who it's with, and one tap to reach them. */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={42} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={type.caption}>{operator ? "Customer" : "Your shoveler"}</Text>
                  <Text style={[type.headline, { fontSize: 17 }]} numberOfLines={1}>{personName(other)}</Text>
                </View>
                <RoundAction icon="bubble.left.fill" label="Message" onPress={() => router.push(`/chat/${job.chatId}`)} />
                {phone ? <RoundAction icon="phone.fill" label="Call" onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)} /> : null}
                {fullAddress && !closed && !showMap ? <RoundAction icon="arrow.triangle.turn.up.right.diamond.fill" label="Directions" onPress={openMap} /> : null}
              </View>
            </Card>
          }
        />
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
          {/* Where: the live mini map, only while the shoveler is getting there. Tapping it opens Maps. */}
          {showMap && target ? <JobMiniMap job={job} operator={operator} target={target} onPress={openMap} label={operator ? "Directions" : "Open in Maps"} /> : null}

          <Notice text={error || (hasBar ? "" : actionState.error)} />
          <Notice tone="green" text={success || (hasBar ? "" : actionState.success)} />

          {/* The receipt: price and payment on top, then the details in one tidy list. */}
          <Card style={{ gap: 0, padding: 0 }}>
            <View style={{ padding: space.lg, paddingBottom: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.caption}>{operator ? "You earn" : paid ? "You paid" : "Price"}</Text>
                  <Text style={[type.title, { fontSize: 26, lineHeight: 31, color: colors.ink, fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, operator))}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name={cash ? "banknote.fill" : "creditcard.fill"} size={15} color={colors.muted} />
                    <Text style={[type.callout, { fontWeight: "600" }]}>{cash ? "Cash" : "Card"}</Text>
                  </View>
                  <Badge label={paid ? "Paid" : held ? "On hold" : released ? "Released" : "Not paid"} tone={paid ? "green" : held ? "blue" : "gray"} />
                </View>
              </View>
              <Text style={type.caption} numberOfLines={2}>{paymentHelp}</Text>
            </View>
            <View style={styles.rule} />
            <Detail icon="calendar" label="When" value={terminalOrderDateText(job) || scheduleText(job) || orderLabel(job)} />
            <Detail icon="mappin.and.ellipse" label="Where" value={fullAddress} onPress={fullAddress ? openMap : undefined} />
            <Detail icon="snowflake" label="What" value={what} last={!job.specialInstructions && !job.completionPhotoUrl} />
            {job.specialInstructions ? <Detail icon="text.bubble" label="Notes" value={job.specialInstructions} last={!job.completionPhotoUrl} /> : null}
            {job.completionPhotoUrl ? (
              <Pressable accessibilityRole="button" accessibilityLabel="View the photo of the finished work" onPress={() => setPhotoOpen(true)} style={({ pressed }) => [styles.detail, pressed && { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="photo" size={16} color={colors.muted} />
                <Text style={[type.caption, { width: 52 }]}>Photo</Text>
                <Text style={[type.body, { flex: 1, fontSize: 15, color: colors.accent, fontWeight: "600" }]}>Finished work</Text>
                <Image source={{ uri: job.completionPhotoUrl }} style={styles.thumb} contentFit="cover" />
              </Pressable>
            ) : null}
          </Card>

          {/* The customer rates a finished job once; it shows on the shoveler's profile. */}
          {job.status === "completed" && !operator ? <RateJob job={job} name={personName(other)} /> : null}
          {!closed ? (
            <Pressable accessibilityRole="button" disabled={busy === "cancel"} onPress={confirmCancel} hitSlop={6} style={{ alignSelf: "center", paddingVertical: 4, paddingHorizontal: 12 }}>
              <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 15 }}>{busy === "cancel" ? "Cancelling…" : "Cancel this order"}</Text>
            </Pressable>
          ) : null}
        </View>
      </Screen>

      {/* The next step sits at the bottom of the screen, under your thumb. */}
      {hasBar ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
          <Notice text={actionState.error || payState.error} />
          <Notice tone="green" text={actionState.success || payState.success} />
          {barState.actions.length ? <JobActionButtons state={barState} showNotices={false} /> : null}
          {payState.actions.length ? <JobActionButtons state={payState} showNotices={false} /> : null}
        </View>
      ) : null}

      {/* The finished-work photo, full screen on tap. */}
      {job.completionPhotoUrl ? (
        <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close photo" onPress={() => setPhotoOpen(false)} style={styles.viewer}>
            <Image accessibilityLabel="Photo of the finished work" source={{ uri: job.completionPhotoUrl }} style={{ width: "100%", aspectRatio: 3 / 4, maxHeight: "80%" }} contentFit="contain" />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Tap to close</Text>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

/** A small round contact button that sits on the same line as the person's name. */
function RoundAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [styles.round, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
    >
      <Icon name={icon} size={18} color={colors.accent} />
    </Pressable>
  );
}

function Detail({ icon, label, value, last, onPress }: { icon: IconName; label: string; value: string; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.detail, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <Icon name={icon} size={16} color={colors.muted} />
      <Text style={[type.caption, { width: 52 }]}>{label}</Text>
      <Text style={[type.body, { flex: 1, fontSize: 15, lineHeight: 20 }, onPress ? { color: colors.accent, fontWeight: "600" } : null]} numberOfLines={2}>{value}</Text>
      {onPress ? <Icon name="chevron.right" size={12} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  detail: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.lg, paddingVertical: 11, minHeight: 46, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.lg },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 10, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow, shadowOpacity: 0.12, shadowOffset: { width: 0, height: -4 } },
});
