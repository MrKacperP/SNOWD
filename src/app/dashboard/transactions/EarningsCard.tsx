"use client";
import EarningsChart, { type EarningPoint } from "@/components/dashboard/EarningsChart";
import IconSwap from "@/components/ui/IconSwap";
import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./transactions.module.css";

const day = 86400000;
const ranges = { "1M": { days: 30, label: "past month" }, "3M": { days: 91, label: "past 3 months" }, "1Y": { days: 365, label: "past year" }, All: { days: 0, label: "all time" } } as const;
type Range = keyof typeof ranges;
const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const date = (at: number) => new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(at);

/** The operator's total earned and its running-total line in one card; hovering the line reads that day's total into the headline. */
export default function EarningsCard({ points, total, loading, error }: { points: EarningPoint[]; total: number; loading: boolean; error: boolean }) {
  const [range, setRange] = useState<Range>("All");
  const [hovered, setHovered] = useState<EarningPoint | null>(null);
  const [now] = useState(() => Date.now());
  // A range starts the line at the total earned by its first day and runs it up to today.
  const view = useMemo(() => {
    const latest = points.at(-1)?.total || 0;
    if (range === "All" || !points.length) return { points, change: latest, base: 0 };
    const start = now - ranges[range].days * day;
    const base = points.filter(point => point.at < start).at(-1)?.total || 0;
    return { points: [{ at: start, total: base }, ...points.filter(point => point.at >= start), { at: now, total: latest }], change: latest - base, base };
  }, [points, now, range]);
  const percent = view.base > 0 ? Math.round(view.change / view.base * 100) : null;
  const unavailable = loading || error;

  return <div className={styles.earningsCard}>
    <div className={styles.earningsHead}>
      <div>
        <h2>Total earned</h2>
        <p className={styles.earningsValue}><strong>{unavailable ? "—" : money(hovered?.total ?? total)}</strong><small>CAD</small></p>
        <p className={styles.earningsChange} data-flat={hovered || unavailable || !view.change ? "true" : undefined} aria-live="polite">
          {loading ? "Loading earnings…" : error ? "Earnings could not load" : hovered ? date(hovered.at)
            : view.change ? <><TrendingUp aria-hidden="true" />{money(view.change)}{percent !== null && ` (${percent}%)`} <span>{ranges[range].label}</span></>
            : range === "All" ? "No paid work yet" : `Nothing earned in the ${ranges[range].label}`}
        </p>
      </div>
      <Link href="/dashboard/analytics" className={styles.earningsLink}><IconSwap icon={<ArrowRight aria-hidden="true" />}>Analytics <ArrowRight aria-hidden="true" /></IconSwap></Link>
    </div>
    {!unavailable && <EarningsChart points={view.points} onActive={setHovered} />}
    <div className={styles.rangeTabs} role="group" aria-label="Chart range">{(Object.keys(ranges) as Range[]).map(value => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value}</button>)}</div>
  </div>;
}
