import * as Haptics from "expo-haptics";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import type { Job } from "@/lib/types";
import { dateMillis } from "@/lib/workOrders";
import { money } from "~/lib/format";
import { ds, family, gap } from "~/lib/theme";
import { useAppTheme } from "~/lib/appearance";
import { Surface } from "./kit";
import { Icon } from "./ui";

const RANGES = [
  { key: "1W", label: "past week", days: 7 },
  { key: "1M", label: "past month", days: 30 },
  { key: "3M", label: "past 3 months", days: 91 },
  { key: "1Y", label: "past year", days: 365 },
  { key: "All", label: "all time", days: 0 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const DAY = 86_400_000;
const HEIGHT = 150;

/** When a finished job was finished: completion time, else payment capture, else the last update. */
export const finishedAt = (job: Job) => dateMillis(job.completionTime) || dateMillis(job.paymentCapturedAt) || dateMillis(job.updatedAt);

const dateLabel = (ms: number, withYear: boolean) => new Date(ms).toLocaleDateString("en-CA", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });

/** A smooth path through the points (Catmull-Rom turned into cubic Béziers, kept monotone). */
function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    // Keep each curve between its two points, so a running total never dips or overshoots.
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const clamp = (y: number) => Math.min(hi, Math.max(lo, y));
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clamp(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clamp(p2.y - (p3.y - p1.y) / 6) };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * The operator's earnings like an investing app's balance: one big number, what changed, a smooth
 * line of money earned over time, and range buttons. Drag along the line to read any day.
 */
export function EarningsChart({ jobs, onPress, compact }: { jobs: Job[]; onPress?: () => void; /** Home card: just the month's sum and a small line, no ranges or scrubbing. */ compact?: boolean }) {
  const [range, setRange] = useState<RangeKey>("1M");
  // The line takes the app colour (SNOWD blue unless changed in Settings → Appearance).
  const LINE = useAppTheme().accent;
  const height = compact ? 84 : HEIGHT;
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const lastIndex = useRef<number | null>(null);

  const earnings = useMemo(
    () => jobs.filter((j) => j.status === "completed").map((j) => ({ at: finishedAt(j), amount: jobDisplayPrice(j, true) })).filter((e) => e.at > 0).sort((a, b) => a.at - b.at),
    [jobs],
  );

  const series = useMemo(() => {
    const now = Date.now();
    const spec = RANGES.find((r) => r.key === range)!;
    const start = spec.days ? now - spec.days * DAY : Math.min(earnings[0]?.at || now - 30 * DAY, now - 7 * DAY);
    // One point per day for short ranges, per week for long ones, so the line stays smooth.
    const step = spec.days && spec.days <= 31 ? DAY : spec.days && spec.days <= 92 ? DAY * 2 : 7 * DAY;
    const points: { at: number; total: number }[] = [];
    let total = 0;
    let i = earnings.findIndex((e) => e.at >= start);
    if (i < 0) i = earnings.length;
    for (let t = start; ; t += step) {
      const end = Math.min(t + step, now);
      while (i < earnings.length && earnings[i].at <= end) total += earnings[i++].amount;
      points.push({ at: end, total });
      if (end >= now) break;
    }
    const jobsInRange = earnings.filter((e) => e.at >= start).length;
    return { points, total, label: spec.label, jobsInRange, withYear: !spec.days || spec.days > 92 };
  }, [earnings, range]);

  const max = Math.max(...series.points.map((p) => p.total), 1);
  // Room on every side for the line's width and the end dot, so nothing is ever cut off.
  const pad = 8;
  const plotW = Math.max(0, width - pad * 2);
  const xy = series.points.map((p, i) => ({
    x: pad + (series.points.length > 1 ? (i / (series.points.length - 1)) * plotW : plotW / 2),
    y: pad + (height - pad * 2) * (1 - p.total / max),
  }));
  const line = smoothPath(xy);
  const area = xy.length ? `${line} L ${xy[xy.length - 1].x} ${height} L ${xy[0].x} ${height} Z` : "";

  const shown = scrub !== null ? series.points[scrub] : null;
  const value = shown ? shown.total : series.total;
  const caption = shown ? dateLabel(shown.at, series.withYear) : `${series.jobsInRange} ${series.jobsInRange === 1 ? "job" : "jobs"} · ${series.label}`;

  const pick = (x: number) => {
    if (!plotW || series.points.length < 2) return;
    const index = Math.max(0, Math.min(series.points.length - 1, Math.round(((x - pad) / plotW) * (series.points.length - 1))));
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      void Haptics.selectionAsync();
      setScrub(index);
    }
  };
  const pan = usePanGesture({
    enabled: !compact,
    minDistance: 0,
    activateAfterLongPress: 120,
    runOnJS: true,
    onActivate: (e) => pick((e as unknown as { x: number }).x),
    onUpdate: (e) => pick((e as unknown as { x: number }).x),
    onFinalize: () => {
      lastIndex.current = null;
      setScrub(null);
    },
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const dot = scrub !== null ? xy[scrub] : xy[xy.length - 1];

  const card = (
    <Surface style={styles.card}>
      <Pressable accessibilityRole={onPress && !compact ? "button" : undefined} accessibilityLabel={`Earnings ${series.label}: ${money(series.total)}. ${onPress && !compact ? "Open payment history" : ""}`} disabled={!onPress || compact} onPress={onPress} style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.kicker, { flex: 1 }]}>{compact ? "Earned in the past 30 days" : "Earnings"}</Text>
          {compact && onPress ? <Icon name="chevron.right" size={13} color={ds.ink3} weight="bold" /> : null}
        </View>
        <Text style={styles.value} maxFontSizeMultiplier={1.4}>{money(value)}</Text>
        {compact ? null : <Text style={[styles.caption, !shown && series.total > 0 && { color: LINE }]}>{!shown && series.total > 0 ? `▲ ${caption}` : caption}</Text>}
      </Pressable>

      <GestureDetector gesture={pan}>
        <View onLayout={onLayout} pointerEvents={compact ? "none" : "auto"} style={{ height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {width ? (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={LINE} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={LINE} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Line x1={pad} x2={width - pad} y1={height - 1} y2={height - 1} stroke={ds.border} strokeWidth={1} strokeDasharray="3 5" />
              {area ? <Path d={area} fill="url(#fill)" /> : null}
              {line ? <Path d={line} stroke={LINE} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
              {scrub !== null && dot ? <Line x1={dot.x} x2={dot.x} y1={0} y2={height} stroke={ds.ink3} strokeWidth={1} /> : null}
              {dot ? <Circle cx={dot.x} cy={dot.y} r={5} fill={LINE} stroke="#fff" strokeWidth={2} /> : null}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>

      {compact ? null : (
      <View accessibilityRole="tablist" style={styles.ranges}>
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            accessibilityRole="tab"
            accessibilityLabel={r.label}
            accessibilityState={{ selected: range === r.key }}
            hitSlop={4}
            onPress={() => {
              void Haptics.selectionAsync();
              setRange(r.key);
            }}
            style={[styles.range, range === r.key && styles.rangeOn]}
          >
            <Text style={[styles.rangeText, range === r.key && { color: "#fff" }]}>{r.key}</Text>
          </Pressable>
        ))}
      </View>
      )}
    </Surface>
  );
  // On Home the whole card is one button that opens the payments page with the full chart.
  return compact && onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`Earned in the past 30 days: ${money(series.total)}. Open payments`} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }}>
      {card}
    </Pressable>
  ) : (
    card
  );
}

const styles = StyleSheet.create({
  card: { padding: gap.x4, gap: gap.x3, borderRadius: 24 },
  kicker: { fontFamily: family.bodySemi, fontSize: 14, color: ds.ink3 },
  value: { fontFamily: family.heading, fontSize: 34, lineHeight: 40, letterSpacing: -1, color: ds.ink, fontVariant: ["tabular-nums"] },
  caption: { fontFamily: family.bodySemi, fontSize: 15, color: ds.ink3 },
  ranges: { flexDirection: "row", justifyContent: "space-between" },
  range: { minWidth: 48, minHeight: 36, paddingHorizontal: 10, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  rangeOn: { backgroundColor: ds.ink },
  rangeText: { fontFamily: family.bodyBold, fontSize: 14, color: ds.ink3 },
});
