import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS, type Job } from "@/lib/types";
import { orderActionNeeded, orderLabel, orderNumber, scheduleText } from "@/lib/workOrders";
import { personName, type Person } from "~/lib/data";
import { money } from "~/lib/format";
import { brand, colors, depth, font } from "~/lib/theme";
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
    <Card onPress={() => router.push(`/job/${job.id}`)} style={[{ gap: 14, padding: 20, borderRadius: 24 }, depth.low]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[font.bodyStrong, { fontSize: 20, lineHeight: 26, fontWeight: "700" }]} numberOfLines={2}>{personName(other)}</Text>
          <Text style={font.label}>{services || "Snow clearing"} · #{orderNumber(job)}</Text>
        </View>
        <Text style={[font.bodyStrong, { fontWeight: "800", color: brand.royal, fontVariant: ["tabular-nums"] }]}>{money(jobDisplayPrice(job, job.operatorId === uid))}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="calendar" size={16} color={brand.slate} />
        <Text style={[font.label, { flex: 1, fontWeight: "500" }]}>{scheduleText(job)}</Text>
        {/* Open orders say their status in the progress line below; a second label here only gets cut off. */}
        {open ? null : <Badge label={orderLabel(job)} tone={statusTone(job, uid)} />}
      </View>
      {open ? <OrderProgress job={job} operator={job.operatorId === uid} /> : null}
      {action ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.sunSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 }}>
          <Icon name="exclamationmark.circle.fill" size={18} color={brand.gold} />
          <Text style={{ flex: 1, color: brand.gold, fontWeight: "700", fontSize: 17, lineHeight: 22 }}>{action}</Text>
          <Icon name="chevron.right" size={13} color={colors.sunText} />
        </View>
      ) : null}
    </Card>
  );
}
