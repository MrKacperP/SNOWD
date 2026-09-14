"use client";

import styles from "./work-orders.module.css";

export const JOB_FILTERS = [
  ["all", "All jobs"],
  ["attention", "Needs attention"],
  ["waiting", "Awaiting response"],
  ["upcoming", "Upcoming"],
  ["progress", "In progress"],
  ["history", "History"],
] as const;

export default function JobFilters({
  value,
  counts,
  onChange,
}: {
  value: string;
  counts: Record<string, number>;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.filters}>
      <span>Show</span>
      <select
        aria-label="Filter work orders"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {JOB_FILTERS.map(([key, label]) => (
          <option key={key} value={key}>
            {label} ({counts[key] || 0})
          </option>
        ))}
      </select>
    </label>
  );
}
