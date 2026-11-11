import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber, propertySizeLabel, scheduleText, terminalOrderDateText } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { statusTone } from "~/components/JobCard";
import { JobActionButtons, useJobActions } from "~/components/JobActions";
import { ORDER_STEPS, OrderProgress, stepIndex } from "~/components/OrderProgress";
import { Avatar, Badge, Button, Card, Empty, Icon, Loading, Notice, QuickAction, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { personName, useJob, usePeople } from "~/lib/data";
import { money } from "~/lib/format";
import { colors, radius, shadow, space, stepColor, type } from "~/lib/theme";

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
  const actionState = useJobActions(job);

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
  const firstName = personName(other).split(" ")[0];
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
  const hasBar = actionState.actions.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: `Order #${orderNumber(job)}` }} />
      <Screen contentStyle={{ paddingBottom: hasBar ? 150 + insets.bottom : space.xxl }} onRefresh={() => undefined}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={56} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={type.caption}>{operator ? "Customer" : "Your shoveler"}</Text>
              <Text style={type.title} numberOfLines={2}>{personName(other)}</Text>
            </View>
            {closed ? <Badge label={orderLabel(job)} tone={statusTone(job, uid)} /> : null}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <QuickAction icon="bubble.left.fill" label={`Message ${firstName}`} onPress={() => router.push(`/chat/${job.chatId}`)} />
            {phone ? <QuickAction icon="phone.fill" label="Call" onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)} /> : null}
            {fullAddress && !closed ? <QuickAction icon={operator ? "arrow.triangle.turn.up.right.diamond.fill" : "map.fill"} label={operator ? "Directions" : "Map"} onPress={openMap} /> : null}
          </View>
        </Card>

        {job.status === "cancelled" ? (
          <Notice text={`${view.title} ${view.description}`} />
        ) : (
          <Card style={{ gap: space.lg, borderTopWidth: 5, borderTopColor: tone.bar }}>
            <Text accessibilityRole="header" style={[type.title, { fontSize: 24, color: tone.text }]}>{view.title}</Text>
            {etaLine ? (
              <View accessible style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tone.soft, padding: 14, borderRadius: radius.md }}>
                <Icon name={etaLine.icon} size={18} color={tone.text} />
                <Text style={{ flex: 1, color: tone.text, fontWeight: "800", fontSize: 17 }}>{etaLine.text}</Text>
              </View>
            ) : null}
            <OrderProgress job={job} operator={operator} detailed note={view.description || undefined} />
          </Card>
        )}

        {action ? <Notice tone="orange" text={`Your turn: ${action.charAt(0).toLowerCase()}${action.slice(1)}.`} /> : null}
        <Notice text={error || (hasBar ? "" : actionState.error)} />
        <Notice tone="green" text={success || (hasBar ? "" : actionState.success)} />

        {target ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Map of ${fullAddress}. Open in Maps`} onPress={openMap} style={{ height: 190, borderRadius: radius.lg, overflow: "hidden" }}>
            <MapView pointerEvents="none" style={{ flex: 1 }} initialRegion={{ ...target, latitudeDelta: 0.012, longitudeDelta: 0.012 }} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
              <Marker coordinate={target} title="Service address" tracksViewChanges={false}>
                <View style={pinStyle(stepColor(job.status).bar)}>
                  <Icon name="house.fill" size={16} color="#fff" />
                </View>
              </Marker>
              {operatorPin && ["accepted", "en-route"].includes(job.status) ? (
                <Marker coordinate={operatorPin} title="Shoveler" tracksViewChanges={false}>
                  <View style={pinStyle(colors.ink)}>
                    <Icon name="car.fill" size={14} color="#fff" />
                  </View>
                </Marker>
              ) : null}
            </MapView>
            <View style={{ position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, ...shadow }}>
              <Icon name="arrow.up.right.square.fill" size={14} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 14 }}>{operator ? "Directions" : "Open in Maps"}</Text>
            </View>
          </Pressable>
        ) : null}

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: paid ? colors.mintSoft : colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={paid ? "checkmark.circle.fill" : cash ? "banknote.fill" : "creditcard.fill"} size={20} color={paid ? colors.mint : colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.caption}>{operator ? "You earn" : paid ? "You paid" : "You pay"} · {cash ? "Cash" : "Card"}</Text>
              <Text style={[type.title, { fontSize: 26, fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, operator))}</Text>
            </View>
            <Badge label={paid ? "Paid" : job.paymentStatus === "held" ? "On hold" : job.paymentStatus === "refunded" ? "Released" : "Not paid yet"} tone={paid ? "green" : job.paymentStatus === "held" ? "blue" : "gray"} />
          </View>
          <Text style={type.callout}>{paymentHelp}</Text>
        </Card>

        <SectionTitle>Order details</SectionTitle>
        <Card style={{ gap: 0, padding: 0 }}>
          <Detail icon="calendar" label="When" value={terminalOrderDateText(job) || scheduleText(job)} />
          <Detail icon="mappin.and.ellipse" label="Where" value={fullAddress} onPress={fullAddress ? openMap : undefined} action={operator ? "Get directions" : "Open in Maps"} />
          <Detail icon="snowflake" label="What" value={(job.serviceTypes || []).map((s) => SERVICE_LABELS[s] || s).join(", ") || "Snow clearing"} />
          <Detail icon="car.fill" label="Property" value={propertySizeLabel(job.propertySize)} last={!job.specialInstructions} />
          {job.specialInstructions ? <Detail icon="text.bubble" label="Notes" value={job.specialInstructions} last /> : null}
        </Card>

        {job.completionPhotoUrl ? (
          <Card>
            <Text accessibilityRole="header" style={type.headline}>Finished work</Text>
            <Image accessibilityLabel="Photo of the finished work" source={{ uri: job.completionPhotoUrl }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" />
          </Card>
        ) : null}

        {!closed ? (
          <Button title="Cancel this order" variant="ghost" loading={busy === "cancel"} onPress={() => confirm("Cancel this order?", "Any card hold is released. This can’t be undone.", "Cancel order", () => void cancelOrder(), true)} />
        ) : null}
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
          <JobActionButtons state={actionState} showNotices={false} />
        </View>
      ) : null}
    </View>
  );
}

const pinStyle = (bg: string) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, borderWidth: 3, borderColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const, ...shadow, shadowOpacity: 0.25 });

function Detail({ icon, label, value, last, onPress, action }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string; last?: boolean; onPress?: () => void; action?: string }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}${onPress && action ? `. ${action}` : ""}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: "row", gap: 12, padding: space.lg, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={{ paddingTop: 2 }}>
        <Icon name={icon} size={17} color={onPress ? colors.accent : colors.muted} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.caption}>{label}</Text>
        <Text style={[type.body, onPress ? { color: colors.accent, fontWeight: "600" } : null]}>{value}</Text>
        {onPress && action ? <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "700" }}>{action} ›</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 10, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow, shadowOpacity: 0.12, shadowOffset: { width: 0, height: -4 } },
});
