"use client";

export default function LoadingScreen() {
  return (
    <main
      aria-label="Loading"
      aria-live="polite"
      className="grid min-h-dvh place-items-center bg-[var(--bg-primary)] px-6 text-[var(--text-primary)]"
    >
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <p className="font-headline text-5xl font-black lowercase sm:text-6xl">
          snowd<span className="text-[var(--accent-sun)]">.</span>
        </p>
        <div
          aria-hidden="true"
          className="mt-8 h-8 w-8 rounded-full border-[3px] border-[var(--border-soft)] border-t-[var(--accent-sun)]"
        />
        <p className="mt-4 text-sm font-semibold text-[var(--text-secondary)]">Loading...</p>
      </div>
    </main>
  );
}
