"use client";

export default function AvailabilityToggle({ online, saving, error, onToggle }: {
  online: boolean;
  saving: boolean;
  error: string;
  onToggle: () => void;
}) {
  return <div className="availability-control">
    <button type="button" role="switch" aria-label="Available for new jobs" aria-checked={online}
      aria-busy={saving} disabled={saving} onClick={onToggle}
      className="availability-toggle" data-online={online}>
      <span className="availability-track" aria-hidden="true"><span className="availability-thumb" /></span>
      <span aria-live="polite">{saving ? "Saving availability…" : (online ? "Available for jobs" : "Not taking new jobs")}</span>
    </button>
    <p className="mt-2 text-xs text-[var(--text-muted)]">Stay available for bookings even when you leave or sign out. Only you can turn this off. Existing bookings stay active.</p>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
