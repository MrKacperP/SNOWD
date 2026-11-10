import { Text, View } from "react-native";
import type { Job, JobStatus } from "@/lib/types";
import { colors, type } from "~/lib/theme";
import { Icon } from "./ui";

/** The five stages every work order moves through, in the same words the website uses. */
export const ORDER_STEPS: { status: JobStatus; label: string; client: string; operator: string }[] = [
  { status: "pending", label: "Requested", client: "Waiting for your shoveler to confirm.", operator: "Accept or decline this request." },
  { status: "accepted", label: "Confirmed", client: "Booked. They’ll tell you when they leave.", operator: "Tap “I’m on my way” when you leave." },
  { status: "en-route", label: "On the way", client: "Your shoveler is driving to you.", operator: "Tap “Start clearing” when you arrive." },
  { status: "in-progress", label: "Clearing", client: "Snow is being cleared now.", operator: "Take a photo of the cleared area to finish." },
  { status: "completed", label: "Done", client: "All clear. Thanks for using SNOWD.", operator: "Finished. Nice work." },
];

export const stepIndex = (job: Pick<Job, "status">) => ORDER_STEPS.findIndex((step) => step.status === job.status);

/**
 * Where a work order stands.
 * Compact: a five-part bar and one line saying the step and what comes next (for lists).
 * Detailed: every step by name with ticks, and a sentence under the current one (for the order screen).
 */
export function OrderProgress({ job, operator, detailed, note }: { job: Job; operator: boolean; detailed?: boolean; note?: string }) {
  const current = stepIndex(job);
  if (current < 0) return null;
  const next = ORDER_STEPS[current + 1];
  const summary = `Step ${current + 1} of ${ORDER_STEPS.length}: ${ORDER_STEPS[current].label}${next ? `. Next: ${next.label}` : ""}`;

  if (!detailed) {
    return (
      <View accessible accessibilityRole="progressbar" accessibilityLabel={summary} accessibilityValue={{ min: 1, max: ORDER_STEPS.length, now: current + 1 }} style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {ORDER_STEPS.map((step, i) => (
            <View key={step.status} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= current ? (job.status === "completed" ? colors.mint : colors.accent) : colors.border }} />
          ))}
        </View>
        <Text style={type.caption}>
          <Text style={{ color: job.status === "completed" ? colors.mint : colors.accent, fontWeight: "700" }}>{ORDER_STEPS[current].label}</Text>
          {`  ·  Step ${current + 1} of ${ORDER_STEPS.length}`}
          {next ? `  ·  Next: ${next.label}` : ""}
        </Text>
      </View>
    );
  }

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={summary} accessibilityValue={{ min: 1, max: ORDER_STEPS.length, now: current + 1 }}>
      {ORDER_STEPS.map((step, i) => {
        const done = i < current || job.status === "completed";
        const here = i === current && !done;
        const last = i === ORDER_STEPS.length - 1;
        return (
          <View key={step.status} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 26 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? colors.mint : here ? colors.accent : colors.surface,
                  borderWidth: done || here ? 0 : 2,
                  borderColor: colors.borderStrong,
                }}
              >
                {done ? <Icon name="checkmark" size={12} color="#fff" weight="bold" /> : here ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} /> : null}
              </View>
              {!last ? <View style={{ flex: 1, width: 2, minHeight: 10, marginVertical: 2, backgroundColor: i < current ? colors.mint : colors.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : here ? 14 : 10, paddingTop: 2, gap: 2 }}>
              <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: here ? "700" : done ? "600" : "500", color: here || done ? colors.ink : colors.faint }}>{step.label}</Text>
              {here || (last && done) ? <Text style={type.caption}>{note || (operator ? step.operator : step.client)}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
