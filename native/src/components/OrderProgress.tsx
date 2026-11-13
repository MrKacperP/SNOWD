import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import type { Job, JobStatus } from "@/lib/types";
import { colors, stepColor, stepColors, type } from "~/lib/theme";
import { Icon } from "./ui";

/** The five stages every work order moves through, in the same words the website uses. */
export const ORDER_STEPS: { status: JobStatus; label: string; icon: Parameters<typeof Icon>[0]["name"]; client: string; operator: string }[] = [
  { status: "pending", label: "Requested", icon: "paperplane.fill", client: "Waiting for your shoveler to confirm.", operator: "Accept or decline this request." },
  { status: "accepted", label: "Confirmed", icon: "checkmark.seal.fill", client: "Booked. They’ll tell you when they leave.", operator: "Tap “I’m on my way” when you leave." },
  { status: "en-route", label: "On the way", icon: "car.fill", client: "Your shoveler is driving to you.", operator: "Tap “Start clearing” when you arrive." },
  { status: "in-progress", label: "Clearing", icon: "snowflake", client: "Snow is being cleared now.", operator: "Take a photo of the cleared area to finish." },
  { status: "completed", label: "Done", icon: "checkmark", client: "All clear. Thanks for using SNOWD.", operator: "Finished. Nice work." },
];

export const stepIndex = (job: Pick<Job, "status">) => ORDER_STEPS.findIndex((step) => step.status === job.status);

/** One segment of the bar: fills in its step's colour, and the current one shimmers like the website's. */
function Segment({ status, state, completed, index, tint }: { status: JobStatus; state: "done" | "current" | "todo"; completed: boolean; index: number; tint?: string }) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(reduce || state === "todo" ? (state === "todo" ? 0 : 1) : 0);
  const shine = useSharedValue(0);
  useEffect(() => {
    if (state === "todo") fill.value = 0;
    else fill.value = reduce ? 1 : withDelay(index * 90, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    if (state === "current" && !completed && !reduce) shine.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1);
  }, [state, completed, reduce, index, fill, shine]);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const glint = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(shine.value, [0, 1], [-60, 160]) }] }));
  const color = tint ? tint : completed ? stepColors.completed.bar : stepColors[status as keyof typeof stepColors]?.bar || colors.accent;
  return (
    <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "#e7edf0", overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", borderRadius: 4, backgroundColor: color, overflow: "hidden" }, bar]}>
        {state === "current" && !completed ? <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 40, backgroundColor: "rgba(255,255,255,0.45)" }, glint]} /> : null}
      </Animated.View>
    </View>
  );
}

/** The five-colour bar alone, as used on cards, the home page and the chat header. */
/** `color` paints every step in one colour instead of the five step colours. */
export function ProgressBar({ job, compact, color }: { job: Pick<Job, "status">; compact?: boolean; color?: string }) {
  const current = stepIndex(job);
  const completed = job.status === "completed";
  if (job.status === "cancelled")
    return <View style={{ height: compact ? 6 : 8, borderRadius: 4, backgroundColor: stepColors.cancelled.bar, opacity: 0.85 }} />;
  return (
    <View style={{ flexDirection: "row", gap: compact ? 4 : 6 }}>
      {ORDER_STEPS.map((step, i) => (
        <Segment key={step.status} index={i} status={step.status} completed={completed} tint={color} state={i < current ? "done" : i === current ? "current" : "todo"} />
      ))}
    </View>
  );
}

/**
 * Where a work order stands, coloured step by step the same way as the website.
 * Compact: the bar and one line saying the step and what comes next (for lists).
 * Detailed: every step by name with its icon, and a sentence under the current one (for the order screen).
 */
export function OrderProgress({ job, operator, detailed, note, dense }: { job: Job; operator: boolean; detailed?: boolean; note?: string; /** Tighter step list, so the whole order fits on one screen. */ dense?: boolean }) {
  const current = stepIndex(job);
  if (current < 0) return null;
  const next = ORDER_STEPS[current + 1];
  const tone = stepColor(job.status);
  const summary = `Step ${current + 1} of ${ORDER_STEPS.length}: ${ORDER_STEPS[current].label}${next ? `. Next: ${next.label}` : ""}`;

  if (!detailed) {
    return (
      <View accessible accessibilityRole="progressbar" accessibilityLabel={summary} accessibilityValue={{ min: 1, max: ORDER_STEPS.length, now: current + 1 }} style={{ gap: 8 }}>
        <ProgressBar job={job} />
        <Text style={[type.caption, { fontSize: 16, lineHeight: 21, color: colors.muted }]}>
          <Text style={{ color: tone.text, fontWeight: "800" }}>{ORDER_STEPS[current].label}</Text>
          {`  ·  Step ${current + 1} of ${ORDER_STEPS.length}`}
          {next ? `  ·  Next: ${next.label}` : ""}
        </Text>
      </View>
    );
  }

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={summary} accessibilityValue={{ min: 1, max: ORDER_STEPS.length, now: current + 1 }} style={{ gap: dense ? 12 : 18 }}>
      <ProgressBar job={job} />
      <View>
        {ORDER_STEPS.map((step, i) => {
          const done = i < current || job.status === "completed";
          const here = i === current && !done;
          const last = i === ORDER_STEPS.length - 1;
          const c = stepColors[step.status as keyof typeof stepColors];
          return (
            <View key={step.status} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center", width: dense ? 24 : 30 }}>
                <View style={{ width: dense ? 24 : 30, height: dense ? 24 : 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: done || here ? c.bar : colors.surface, borderWidth: done || here ? 0 : 2, borderColor: colors.borderStrong }}>
                  <Icon name={done ? "checkmark" : step.icon} size={13} color={done || here ? "#fff" : colors.faint} weight="bold" />
                </View>
                {!last ? <View style={{ flex: 1, width: 3, minHeight: dense ? 6 : 10, marginVertical: 2, borderRadius: 2, backgroundColor: i < current ? c.bar : colors.border }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: last ? 0 : dense ? (here ? 8 : 4) : here ? 16 : 12, paddingTop: dense ? 1 : 4, gap: 2 }}>
                <Text style={{ fontSize: dense ? 15 : 16, lineHeight: dense ? 20 : 22, fontWeight: here ? "800" : done ? "600" : "500", color: here ? c.text : done ? colors.ink : colors.faint }}>{step.label}</Text>
                {here || (last && done) ? <Text style={type.caption}>{note || (operator ? step.operator : step.client)}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
