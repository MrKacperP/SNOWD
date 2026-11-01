"use client";
import { useId, useState } from "react";

export type EarningPoint = { at: number; total: number };

const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const day = (at: number) => new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(at);

/** Running total of paid work over time: a quiet line at rest, the date and total under the pointer on hover. */
export default function EarningsChart({ points }: { points: EarningPoint[] }) {
  const gradient = useId();
  const [active, setActive] = useState<number | null>(null);
  const first = points[0]?.at ?? 0;
  const span = Math.max(1, (points.at(-1)?.at ?? first) - first);
  const top = Math.max(1, ...points.map(point => point.total));
  // Plot in a 0–100 box; the line keeps its stroke width however the box stretches.
  const x = (at: number) => points.length > 1 ? (at - first) / span * 100 : 50;
  const y = (total: number) => 92 - total / top * 80;
  const line = points.length > 1 ? points.map(point => `${x(point.at)},${y(point.total)}`).join(" ") : "0,92 100,92";
  const nearest = (fraction: number) => points.reduce((best, point, index) => Math.abs(x(point.at) / 100 - fraction) < Math.abs(x(points[best].at) / 100 - fraction) ? index : best, 0);
  const shown = active === null ? null : points[active];

  if (points.length < 2) return <div className="earnings-chart" data-empty="true"><div className="earnings-chart-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={line} vectorEffect="non-scaling-stroke" /></svg></div></div>;
  return <div
    className="earnings-chart"
    role="group"
    tabIndex={0}
    aria-label={`Earnings over time, from ${day(first)} to ${day(points.at(-1)!.at)}. Use the arrow keys to read each payment.`}
    onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); setActive(nearest((event.clientX - box.left) / box.width)); }}
    onPointerLeave={() => setActive(null)}
    onBlur={() => setActive(null)}
    onKeyDown={event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setActive(current => Math.min(points.length - 1, Math.max(0, (current ?? points.length) + (event.key === "ArrowRight" ? 1 : -1))));
    }}
  >
    <div className="earnings-chart-plot">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".18" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,100 ${line} 100,100`} fill={`url(#${gradient})`} />
      <polyline points={line} vectorEffect="non-scaling-stroke" />
    </svg>
    {shown && <>
      <span className="earnings-chart-guide" style={{ left: `${x(shown.at)}%` }} aria-hidden="true" />
      <span className="earnings-chart-dot" style={{ left: `${x(shown.at)}%`, top: `${y(shown.total)}%` }} aria-hidden="true" />
    </>}
    </div>
    {shown && <>
      <span className="earnings-chart-tip" style={{ left: `clamp(56px, ${x(shown.at)}%, calc(100% - 56px))` }} role="status"><strong>{money(shown.total)}</strong>{day(shown.at)}</span>
    </>}
  </div>;
}
