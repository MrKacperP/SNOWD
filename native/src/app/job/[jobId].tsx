import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActionSheetIOS, Alert, Linking, Platform, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber, propertySizeLabel, scheduleText, terminalOrderDateText } from "@/lib/workOrders";
import { workOrderPresentation } from "@/lib/workOrderPresentation";
import { statusTone } from "~/components/JobCard";
import { OrderProgress } from "~/components/OrderProgress";
import { Avatar, Badge, Button, Card, Empty, Icon, Loading, Notice, QuickAction, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { personName, useJob, usePeople } from "~/lib/data";
import { money } from "~/lib/format";
import { completeWithPhoto, orderAction, payForJob, sendOnMyWay } from "~/lib/orders";
import { pickPhoto } from "~/lib/photos";
import { colors, radius, space, type } from "~/lib/theme";

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

  if (loading) return <Loading />;
  if (!job)
    return (
      <Screen>
        <Empty icon="doc.questionmark" title="We couldn’t find this order" body="It may have been removed. Your other orders are safe." action={<Button title="See my orders" onPress={() => router.replace("/jobs")} />} />
      </Screen>
    );

  const run = async (key: string, task: () => Promise<unknown>, done: string) => {
    setBusy(key);
    setError("");
    setSuccess("");
    try {
      const result = await task();
      if (result !== false) {
        setSuccess(done);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy("");
    }
  };

  const confirm = (title: string, message: string, label: string, onYes: () => void, destructive = false) =>
    Alert.alert(title, message, [
      { text: "Not now", style: "cancel" },
      { text: label, style: destructive ? "destructive" : "default", onPress: onYes },
    ]);

  const finishWithPhoto = () =>
    ActionSheetIOS.showActionSheetWithOptions({ title: "Add a photo of the finished work", options: ["Take photo", "Choose from library", "Cancel"], cancelButtonIndex: 2 }, (i) => {
      if (i === 2) return;
      void run(
        "finish",
        async () => {
          const photo = await pickPhoto(i === 0 ? "camera" : "library");
          if (!photo) return false;
          await completeWithPhoto(job, photo);
        },
        job.paymentMethod === "cash" ? "Work completed. Confirm the cash once you’ve received it." : "Work completed and payment captured.",
      );
    });

  const action = orderActionNeeded(job, uid);
  const closed = ["completed", "cancelled"].includes(job.status);
  const proposalForMe = job.scheduleProposal?.recipientId === uid;
  const awaitingMe = job.status === "pending" && !job.scheduleProposal && (job.awaitingResponseFrom || job.operatorId) === uid;
  const cardUnpaid = job.paymentMethod !== "cash" && !["held", "paid"].includes(job.paymentStatus);
  const target = typeof job.clientLat === "number" && typeof job.clientLng === "number" ? { latitude: job.clientLat, longitude: job.clientLng } : null;
  const operatorPin = typeof job.operatorApproxLat === "number" && typeof job.operatorApproxLng === "number" ? { latitude: job.operatorApproxLat, longitude: job.operatorApproxLng } : null;

  // What this person can do next, most important first. Everything else is a shortcut or sits at the bottom.
  const buttons: ReactNode[] = [];
  if (awaitingMe || proposalForMe) {
    const approveAction = proposalForMe ? "approve-time" : "accept";
    buttons.push(
      <Button key="accept" title={proposalForMe ? "Approve new time" : "Accept request"} icon="checkmark" loading={busy === "accept"} disabled={!!busy && busy !== "accept"} onPress={() => run("accept", () => orderAction(job, approveAction, { proposalId: job.scheduleProposal?.id, cashPaymentAcknowledged: true }), "Booking confirmed.")} />,
      <Button key="decline" title="Decline" variant="danger" loading={busy === "decline"} disabled={!!busy && busy !== "decline"} onPress={() => confirm("Decline this request?", "The customer will be told you’re not available.", "Decline", () => void run("decline", () => orderAction(job, proposalForMe ? "decline-time" : "decline", { proposalId: job.scheduleProposal?.id }), "Request declined."), true)} />,
    );
  }
  if (!operator && job.status === "accepted" && cardUnpaid)
    buttons.push(<Button key="pay" title={`Pay ${money(job.price)}`} icon="creditcard.fill" loading={busy === "pay"} onPress={() => run("pay", () => payForJob(job, profile?.displayName), "Payment authorized. You’re only charged once the work is done.")} />);
  if (operator && job.status === "accepted")
    buttons.push(<Button key="go" title="I’m on my way" icon="car.fill" loading={busy === "go"} onPress={() => run("go", () => sendOnMyWay(job), "The customer has your ETA.")} />);
  if (operator && job.status === "en-route")
    buttons.push(<Button key="start" title="Start clearing" icon="snowflake" loading={busy === "start"} onPress={() => run("start", () => orderAction(job, "in-progress"), "Work started.")} />);
  if (operator && job.status === "in-progress")
    buttons.push(<Button key="finish" title="Finish with photo" icon="camera.fill" loading={busy === "finish"} onPress={finishWithPhoto} />);
  if (operator && job.status === "completed" && job.paymentMethod === "cash" && job.paymentStatus === "pending")
    buttons.push(<Button key="cash" title="Confirm cash received" icon="banknote.fill" loading={busy === "cash"} onPress={() => run("cash", () => api("/api/jobs/confirm-cash", { jobId: job.id }), "Cash payment confirmed.")} />);

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

  return (
    <>
      <Stack.Screen options={{ title: `Order #${orderNumber(job)}` }} />
      <Screen>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={56} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={type.caption}>{operator ? "Customer" : "Your shoveler"}</Text>
              <Text style={type.title} numberOfLines={2}>{personName(other)}</Text>
            </View>
            {closed ? <Badge label={orderLabel(job)} tone={statusTone(job, uid)} /> : null}
          </View>
        </Card>

        {job.status === "cancelled" ? (
          <Notice text={`${view.title} ${view.description}`} />
        ) : (
          <Card style={{ gap: space.lg }}>
            <Text accessibilityRole="header" style={[type.title, { fontSize: 24 }]}>{view.title}</Text>
            {job.status === "en-route" && job.eta ? (
              <View accessible style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.accentSoft, padding: 14, borderRadius: radius.md }}>
                <Icon name="car.fill" size={18} color={colors.accent} />
                <Text style={{ flex: 1, color: colors.accent, fontWeight: "700", fontSize: 17 }}>Arriving in about {job.eta} min</Text>
              </View>
            ) : null}
            <OrderProgress job={job} operator={operator} detailed note={view.description || undefined} />
          </Card>
        )}

        {action ? <Notice tone="orange" text={`Your turn: ${action.charAt(0).toLowerCase()}${action.slice(1)}.`} /> : null}
        <Notice text={error} />
        <Notice tone="green" text={success} />
        {buttons.length ? <View style={{ gap: 10 }}>{buttons}</View> : null}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction icon="bubble.left.fill" label={`Message ${firstName}`} onPress={() => router.push(`/chat/${job.chatId}`)} />
          {phone ? <QuickAction icon="phone.fill" label="Call" onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)} /> : null}
          {target && operator && !closed ? (
            <QuickAction
              icon="arrow.triangle.turn.up.right.diamond.fill"
              label="Directions"
              onPress={() => void Linking.openURL(Platform.OS === "ios" ? `maps://?daddr=${target.latitude},${target.longitude}` : `geo:${target.latitude},${target.longitude}?q=${encodeURIComponent(job.address)}`)}
            />
          ) : null}
        </View>

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

        {target ? (
          <View accessible accessibilityLabel={`Map of ${job.address}`} style={{ height: 180, borderRadius: radius.lg, overflow: "hidden" }}>
            <MapView style={{ flex: 1 }} initialRegion={{ ...target, latitudeDelta: 0.02, longitudeDelta: 0.02 }} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
              <Marker coordinate={target} title="Service address" />
              {operatorPin && job.status === "en-route" ? <Marker coordinate={operatorPin} pinColor={colors.accent} title="Shoveler" /> : null}
            </MapView>
          </View>
        ) : null}

        <SectionTitle>Order details</SectionTitle>
        <Card style={{ gap: 0, padding: 0 }}>
          <Detail icon="calendar" label="When" value={terminalOrderDateText(job) || scheduleText(job)} />
          <Detail icon="mappin.and.ellipse" label="Where" value={[job.address, job.city, job.province, job.postalCode].filter(Boolean).join(", ")} />
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
          <Button title="Cancel this order" variant="ghost" loading={busy === "cancel"} onPress={() => confirm("Cancel this order?", "Any card hold is released. This can’t be undone.", "Cancel order", () => void run("cancel", () => api("/api/jobs/cancel", { jobId: job.id }), "Order cancelled."), true)} />
        ) : null}
      </Screen>
    </>
  );
}

function Detail({ icon, label, value, last }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string; last?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", gap: 12, padding: space.lg, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.border }}>
      <View style={{ paddingTop: 2 }}>
        <Icon name={icon} size={17} color={colors.muted} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.caption}>{label}</Text>
        <Text style={type.body}>{value}</Text>
      </View>
    </View>
  );
}
