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
      <span className="availability-label" aria-live="polite">{saving ? "Saving…" : (online ? "Available" : "Unavailable")}</span>
      <span className="availability-track" aria-hidden="true"><span className="availability-thumb" /></span>
    </button>
    <p className="availability-hint">{online ? "Accepting new jobs, even while signed out." : "New jobs paused. Existing bookings stay active."}</p>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
