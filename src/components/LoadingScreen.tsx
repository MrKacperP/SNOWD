"use client";

export default function LoadingScreen({ embedded = false, label = "Loading..." }: { embedded?: boolean; label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={`flex w-full ${embedded ? "min-h-64 flex-1 self-stretch" : "min-h-dvh"} items-center justify-center bg-[var(--bg-primary)] px-6 text-[var(--text-primary)]`}
    >
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <p className="font-headline text-5xl font-black lowercase sm:text-6xl">
          snowd<span className="text-[var(--accent-sun)]">.</span>
        </p>
        <div
          aria-hidden="true"
          className="motion-safe:animate-spin mt-8 h-8 w-8 rounded-full border-[3px] border-[var(--border-soft)] border-t-[var(--accent-sun)]"
        />
        <p className="mt-4 text-sm font-semibold text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}
