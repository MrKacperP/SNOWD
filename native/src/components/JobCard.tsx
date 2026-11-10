import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS, type Job } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber, scheduleText } from "@/lib/workOrders";
import { personName, type Person } from "~/lib/data";
import { money } from "~/lib/format";
import { colors, type } from "~/lib/theme";
import { OrderProgress } from "./OrderProgress";
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
  const open = !["completed", "cancelled"].includes(job.status);
  return (
    <Card onPress={() => router.push(`/job/${job.id}`)} style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={46} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.headline} numberOfLines={1}>{personName(other)}</Text>
          <Text style={type.caption} numberOfLines={1}>#{orderNumber(job)} · {services || "Snow clearing"}</Text>
        </View>
        <Text style={[type.headline, { fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, job.operatorId === uid))}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="calendar" size={14} color={colors.muted} />
        <Text style={[type.caption, { flex: 1 }]} numberOfLines={2}>{scheduleText(job)}</Text>
        {/* Open orders say their status in the progress line below; a second label here only gets cut off. */}
        {open ? null : <Badge label={orderLabel(job)} tone={statusTone(job, uid)} />}
      </View>
      {open ? <OrderProgress job={job} operator={job.operatorId === uid} /> : null}
      {action ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.sunSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 }}>
          <Icon name="exclamationmark.circle.fill" size={17} color={colors.sunText} />
          <Text style={{ flex: 1, color: colors.sunText, fontWeight: "700", fontSize: 15 }}>{action}</Text>
          <Icon name="chevron.right" size={13} color={colors.sunText} />
        </View>
      ) : null}
    </Card>
  );
}
