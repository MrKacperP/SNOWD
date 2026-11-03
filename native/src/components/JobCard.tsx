import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS, type Job } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber, scheduleText } from "@/lib/workOrders";
import { personName, type Person } from "~/lib/data";
import { money } from "~/lib/format";
import { colors, type } from "~/lib/theme";
import { Avatar, Badge, Card, Icon, type Tone } from "./ui";

export function statusTone(job: Job, uid: string): Tone {
  if (orderActionNeeded(job, uid)) return "orange";
  if (job.status === "completed") return "green";
  if (job.status === "cancelled") return "red";
  if (job.status === "en-route" || job.status === "in-progress") return "blue";
  return "gray";
}

export function JobCard({ job, uid, other }: { job: Job; uid: string; other?: Person }) {
  const router = useRouter();
  const action = orderActionNeeded(job, uid);
  const services = (job.serviceTypes || []).map((s) => SERVICE_LABELS[s] || s).join(" · ");
  return (
    <Card onPress={() => router.push(`/job/${job.id}`)} style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={42} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.headline} numberOfLines={1}>{personName(other)}</Text>
          <Text style={type.caption} numberOfLines={1}>{orderNumber(job)} · {services || "Snow clearing"}</Text>
        </View>
        <Text style={[type.headline, { fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, job.operatorId === uid))}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="calendar" size={13} color={colors.muted} />
        <Text style={[type.caption, { flex: 1 }]} numberOfLines={1}>{scheduleText(job)}</Text>
        <Badge label={orderLabel(job)} tone={statusTone(job, uid)} />
      </View>
      {action ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.sunSoft, borderRadius: 10, padding: 10 }}>
          <Icon name="exclamationmark.circle.fill" size={15} color="#c25a12" />
          <Text style={{ color: "#c25a12", fontWeight: "700", fontSize: 14 }}>{action}</Text>
        </View>
      ) : null}
    </Card>
  );
}
