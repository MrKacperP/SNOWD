import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActionSheetIOS, Alert, Linking, Platform, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber, propertySizeLabel, scheduleText, terminalOrderDateText } from "@/lib/workOrders";
import { statusTone } from "~/components/JobCard";
import { Avatar, Badge, Button, Card, Icon, Loading, Notice, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { personName, useJob, usePeople } from "~/lib/data";
import { money } from "~/lib/format";
import { completeWithPhoto, orderAction, payForJob, sendOnMyWay } from "~/lib/orders";
import { pickPhoto } from "~/lib/photos";
import { colors, radius, space, type } from "~/lib/theme";

const STEPS = [
  ["pending", "Requested"],
  ["accepted", "Confirmed"],
  ["en-route", "On the way"],
  ["in-progress", "Clearing"],
  ["completed", "Done"],
] as const;

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
  if (!job) return <Screen><Notice text="This work order couldn’t be found." /></Screen>;

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
  const stepIndex = STEPS.findIndex(([s]) => s === job.status);
  const target = typeof job.clientLat === "number" && typeof job.clientLng === "number" ? { latitude: job.clientLat, longitude: job.clientLng } : null;
  const operatorPin = typeof job.operatorApproxLat === "number" && typeof job.operatorApproxLng === "number" ? { latitude: job.operatorApproxLat, longitude: job.operatorApproxLng } : null;

  const buttons: ReactNode[] = [];
  if (awaitingMe || proposalForMe) {
    const approveAction = proposalForMe ? "approve-time" : "accept";
    buttons.push(
      <Button key="accept" title={proposalForMe ? "Approve new time" : "Accept request"} icon="checkmark" loading={busy === "accept"} onPress={() => run("accept", () => orderAction(job, approveAction, { proposalId: job.scheduleProposal?.id, cashPaymentAcknowledged: true }), "Booking confirmed.")} />,
      <Button key="decline" title="Decline" variant="danger" loading={busy === "decline"} onPress={() => confirm("Decline this request?", "The customer will be told you’re not available.", "Decline", () => void run("decline", () => orderAction(job, proposalForMe ? "decline-time" : "decline", { proposalId: job.scheduleProposal?.id }), "Request declined."), true)} />,
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
  if (target && operator && !closed)
    buttons.push(
      <Button
        key="directions"
        title="Directions"
        icon="arrow.triangle.turn.up.right.diamond.fill"
        variant="secondary"
        onPress={() => void Linking.openURL(Platform.OS === "ios" ? `maps://?daddr=${target.latitude},${target.longitude}` : `geo:${target.latitude},${target.longitude}?q=${encodeURIComponent(job.address)}`)}
      />,
    );
  buttons.push(<Button key="chat" title={`Message ${personName(other).split(" ")[0]}`} icon="bubble.left.fill" variant="secondary" onPress={() => router.push(`/chat/${job.chatId}`)} />);
  if (!closed)
    buttons.push(<Button key="cancel" title="Cancel order" variant="ghost" loading={busy === "cancel"} onPress={() => confirm("Cancel this order?", "Any card hold is released. This can’t be undone.", "Cancel order", () => void run("cancel", () => api("/api/jobs/cancel", { jobId: job.id }), "Order cancelled."), true)} />);

  return (
    <>
      <Stack.Screen options={{ title: orderNumber(job) }} />
      <Screen>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={52} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={type.title} numberOfLines={1}>{personName(other)}</Text>
              <Badge label={orderLabel(job)} tone={statusTone(job, uid)} />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[type.title, { fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, operator))}</Text>
              <Text style={type.caption}>{job.paymentMethod === "cash" ? "Cash" : "Card"}</Text>
            </View>
          </View>
          {job.status !== "cancelled" ? (
            <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
              {STEPS.map(([key, label], i) => (
                <View key={key} style={{ flex: 1, gap: 6 }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= stepIndex ? colors.accent : colors.border }} />
                  <Text style={{ fontSize: 10, fontWeight: i === stepIndex ? "700" : "500", color: i <= stepIndex ? colors.ink : colors.faint }} numberOfLines={1}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {job.status === "en-route" && job.eta ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.accentSoft, padding: 12, borderRadius: radius.md }}>
              <Icon name="car.fill" size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: "700" }}>Arriving in about {job.eta} min</Text>
            </View>
          ) : null}
        </Card>

        {action ? <Notice tone="orange" text={action} /> : null}
        <Notice text={error} />
        <Notice tone="green" text={success} />
        <View style={{ gap: 10 }}>{buttons}</View>

        {target ? (
          <View style={{ height: 180, borderRadius: radius.lg, overflow: "hidden" }}>
            <MapView style={{ flex: 1 }} initialRegion={{ ...target, latitudeDelta: 0.02, longitudeDelta: 0.02 }} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
              <Marker coordinate={target} title="Service address" />
              {operatorPin && job.status === "en-route" ? <Marker coordinate={operatorPin} pinColor={colors.accent} title="Shoveler" /> : null}
            </MapView>
          </View>
        ) : null}

        <Card style={{ gap: 0, padding: 0 }}>
          <Detail icon="calendar" label="When" value={terminalOrderDateText(job) || scheduleText(job)} />
          <Detail icon="mappin.and.ellipse" label="Where" value={[job.address, job.city, job.province, job.postalCode].filter(Boolean).join(", ")} />
          <Detail icon="snowflake" label="Services" value={(job.serviceTypes || []).map((s) => SERVICE_LABELS[s] || s).join(", ") || "Snow clearing"} />
          <Detail icon="car.fill" label="Property" value={propertySizeLabel(job.propertySize)} />
          {job.specialInstructions ? <Detail icon="text.bubble" label="Notes" value={job.specialInstructions} /> : null}
          {other?.phone && !closed ? <Detail icon="phone.fill" label="Phone" value={other.phone} onPress={() => void Linking.openURL(`tel:${other.phone!.replace(/[^\d+]/g, "")}`)} last /> : null}
        </Card>

        {job.completionPhotoUrl ? (
          <Card>
            <Text style={type.headline}>Finished work</Text>
            <Image source={{ uri: job.completionPhotoUrl }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" />
          </Card>
        ) : null}
      </Screen>
    </>
  );
}

function Detail({ icon, label, value, onPress, last }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string; onPress?: () => void; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: space.lg, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.border }}>
      <Icon name={icon} size={16} color={colors.muted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.caption}>{label}</Text>
        <Text style={[type.body, onPress && { color: colors.accent }]} onPress={onPress}>{value}</Text>
      </View>
    </View>
  );
}
