"use client";

import styles from "./work-orders.module.css";

export const JOB_FILTERS = [
  ["attention", "Needs attention"],
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
    <div>
      <label className="block font-medium sm:hidden">
        Show jobs
        <select
          className="mt-2 min-h-13 w-full rounded-xl border bg-white px-4 text-base"
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
      <nav aria-label="Job filters" className={styles.filters}>
        {JOB_FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
          >
            {label} <span className={styles.count}>{counts[key] || 0}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
