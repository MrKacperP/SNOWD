import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber, propertySizeLabel, scheduleText, terminalOrderDateText } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { JobActionButtons, useJobActions } from "~/components/JobActions";
import { ORDER_STEPS, OrderProgress, stepIndex } from "~/components/OrderProgress";
import { JobMiniMap } from "~/components/JobMiniMap";
import { paymentActions } from "~/lib/jobActions";
import { TabHeader } from "~/components/TabHeader";
import { Avatar, Badge, Button, Card, Empty, Icon, Loading, Notice, QuickAction, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { personName, useJob, usePeople } from "~/lib/data";
import { money } from "~/lib/format";
import { colors, radius, shadow, space, stepColor, type } from "~/lib/theme";
import { useAppTheme } from "~/lib/appearance";

export default function JobScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const { job, loading } = useJob(jobId);
  const operator = !!job && job.operatorId === uid;
  const otherId = job ? (operator ? job.clientId : job.operatorId) : "";
  const other = usePeople(otherId ? [otherId] : [])[otherId];
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const confirm = (title: string, message: string, label: string, onYes: () => void, destructive = false) =>
    Alert.alert(title, message, [
      { text: "Not now", style: "cancel" },
      { text: label, style: destructive ? "destructive" : "default", onPress: onYes },
    ]);

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

  const action = orderActionNeeded(job, uid);
  const closed = ["completed", "cancelled"].includes(job.status);
  // The header takes this order's progress colour while it's live, matching its progress bar.
  const headerTone = !closed && appTheme.jobColouredHeader ? stepColor(job.status) : undefined;
  const target = typeof job.clientLat === "number" && typeof job.clientLng === "number" ? { latitude: job.clientLat, longitude: job.clientLng } : null;
  const operatorPin = typeof job.operatorApproxLat === "number" && typeof job.operatorApproxLng === "number" ? { latitude: job.operatorApproxLat, longitude: job.operatorApproxLng } : null;
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
  // One plain sentence about the money, so nobody wonders whether or when they are charged.
  const paymentHelp = cash
    ? paid
      ? "Paid in cash."
      : operator
        ? "The customer pays you in cash when the work is done."
        : "Pay your shoveler in cash when the work is done."
    : paid
      ? operator ? "Paid by card. Your payout is on its way." : "Paid by card. Your receipt is in Payment history."
      : job.paymentStatus === "held"
        ? operator ? "The card is authorized. You’re paid after the photo of the finished work." : "Your card is authorized, not charged. You’re charged only after the work is done."
        : job.paymentStatus === "refunded"
          ? "The card hold was released. Nothing was charged."
          : operator ? "The customer still needs to authorize their card." : "Authorize your card to confirm. You’re charged only after the work is done.";

  const tone = stepColor(job.status);
  const etaLine = job.status === "en-route" && job.eta
    ? { icon: "car.fill" as const, text: `Arriving in about ${job.eta} min` }
    : job.status === "accepted" && job.nearbyEta
      ? { icon: "location.fill" as const, text: operator ? `You’re under 1 km away · about ${job.nearbyEta} min drive` : `Your shoveler is under 1 km away · about ${job.nearbyEta} min` }
      : null;
  const payKeys = new Set(payState.actions.map((a) => a.key));
  const barState = { ...actionState, actions: actionState.actions.filter((a) => !payKeys.has(a.key)) };
  const hasBar = barState.actions.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: `Order #${orderNumber(job)}`, headerShown: false }} />
      <Screen contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 0, gap: space.md, paddingBottom: hasBar ? 150 + insets.bottom : space.xxl }} onRefresh={() => undefined}>
        {/* The order number on a coloured band, with back on the left. */}
        <TabHeader
          tone={headerTone}
          title={`Order #${orderNumber(job)}`}
          subtitle={job.status === "cancelled" ? view.title : `${ORDER_STEPS[stepIndex(job)]?.label || orderLabel(job)} · Step ${stepIndex(job) + 1} of ${ORDER_STEPS.length}`}
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/jobs"))}
        />
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={46} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={type.caption}>{operator ? "Customer" : "Your shoveler"}{closed ? ` · ${orderLabel(job)}` : ""}</Text>
              <Text style={[type.title, { fontSize: 21, lineHeight: 26 }]} numberOfLines={2}>{personName(other)}</Text>
            </View>
            {/* The job's price sits beside the name, so who and how much read together. */}
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={type.caption}>{operator ? "You earn" : paid ? "You paid" : "Price"}</Text>
              <Text style={[type.title, { fontSize: 21, lineHeight: 26, color: colors.accent, fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, operator))}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <QuickAction icon="bubble.left.fill" label="Message" onPress={() => router.push(`/chat/${job.chatId}`)} />
            {phone ? <QuickAction icon="phone.fill" label="Call" onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)} /> : null}
            {fullAddress && !closed ? <QuickAction icon="arrow.triangle.turn.up.right.diamond.fill" label="Directions" onPress={openMap} /> : null}
          </View>
        </Card>

        {/* One screen, top to bottom: who, where (live mini map), then how far along the order is. */}
        {target ? <JobMiniMap job={job} operator={operator} target={target} onPress={openMap} label={operator ? "Directions" : "Open in Maps"} /> : null}

        {job.status === "cancelled" ? (
          <Notice text={`${view.title} ${view.description}`} />
        ) : (
          <Card style={{ gap: space.md, borderTopWidth: 5, borderTopColor: tone.bar }}>
            <Text accessibilityRole="header" style={[type.title, { fontSize: 20, lineHeight: 25, color: tone.text }]}>{view.title}</Text>
            {etaLine ? (
              <View accessible style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tone.soft, padding: 14, borderRadius: radius.md }}>
                <Icon name={etaLine.icon} size={18} color={tone.text} />
                <Text style={{ flex: 1, color: tone.text, fontWeight: "800", fontSize: 17 }}>{etaLine.text}</Text>
              </View>
            ) : null}
            <OrderProgress job={job} operator={operator} detailed dense note={view.description || undefined} />
          </Card>
        )}

        <Notice text={error || (hasBar ? "" : actionState.error)} />
        <Notice tone="green" text={success || (hasBar ? "" : actionState.success)} />

        {/* Payment: how it's paid, where it stands, and (once clearing starts) pay early or mark it received. */}
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[styles.iconTile, { backgroundColor: paid ? colors.mintSoft : colors.accentSoft }]}>
              <Icon name={paid ? "checkmark.circle.fill" : cash ? "banknote.fill" : "creditcard.fill"} size={19} color={paid ? colors.mint : colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.headline}>Payment · {cash ? "Cash" : "Card"}</Text>
              <Text style={type.caption} numberOfLines={2}>{paymentHelp}</Text>
            </View>
            <Badge label={paid ? "Paid" : job.paymentStatus === "held" ? "On hold" : job.paymentStatus === "refunded" ? "Released" : "Not paid"} tone={paid ? "green" : job.paymentStatus === "held" ? "blue" : "gray"} />
          </View>
          {payState.actions.length ? <JobActionButtons state={payState} /> : null}
        </Card>

        {/* The details, in one tidy list. */}
        <Card style={{ gap: 0, padding: 0 }}>
          <Detail icon="calendar" label="When" value={terminalOrderDateText(job) || scheduleText(job)} />
          <Detail icon="mappin.and.ellipse" label="Where" value={fullAddress} onPress={fullAddress ? openMap : undefined} />
          <Detail icon="snowflake" label="What" value={[(job.serviceTypes || []).map((s) => SERVICE_LABELS[s] || s).join(", ") || "Snow clearing", propertySizeLabel(job.propertySize)].filter(Boolean).join(" · ")} last={!job.specialInstructions && !job.completionPhotoUrl} />
          {job.specialInstructions ? <Detail icon="text.bubble" label="Notes" value={job.specialInstructions} last={!job.completionPhotoUrl} /> : null}
          {job.completionPhotoUrl ? (
            <View style={{ padding: space.lg, gap: 8 }}>
              <Text style={type.caption}>Finished work</Text>
              <Image accessibilityLabel="Photo of the finished work" source={{ uri: job.completionPhotoUrl }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" />
            </View>
          ) : null}
        </Card>

        {!closed ? (
          <Pressable accessibilityRole="button" disabled={busy === "cancel"} onPress={() => confirm("Cancel this order?", "Any card hold is released. This can’t be undone.", "Cancel order", () => void cancelOrder(), true)} style={{ alignSelf: "center", padding: 10 }}>
            <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 15 }}>{busy === "cancel" ? "Cancelling…" : "Cancel this order"}</Text>
          </Pressable>
        ) : null}
        </View>
      </Screen>

      {/* The next step sits at the bottom of the screen, under your thumb. */}
      {hasBar ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
          <Notice text={actionState.error} />
          <Notice tone="green" text={actionState.success} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone.bar }} />
            <Text style={[type.caption, { flex: 1, fontWeight: "700", color: tone.text }]} numberOfLines={1}>
              Next step · {ORDER_STEPS[stepIndex(job) + 1]?.label || ORDER_STEPS[stepIndex(job)]?.label}
            </Text>
          </View>
          <JobActionButtons state={barState} showNotices={false} />
        </View>
      ) : null}
    </View>
  );
}


function Detail({ icon, label, value, last, onPress }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.lg, paddingVertical: 13, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <Icon name={icon} size={16} color={colors.muted} />
      <Text style={[type.caption, { width: 58 }]}>{label}</Text>
      <Text style={[type.body, { flex: 1, fontSize: 15 }, onPress ? { color: colors.accent, fontWeight: "600" } : null]} numberOfLines={3}>{value}</Text>
      {onPress ? <Icon name="chevron.right" size={12} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconTile: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 10, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow, shadowOpacity: 0.12, shadowOffset: { width: 0, height: -4 } },
});
