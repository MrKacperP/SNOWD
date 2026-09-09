"use client";

export default function AvailabilityToggle({ online, saving, error, onToggle }: {
  online: boolean;
  saving: boolean;
  error: string;
  onToggle: () => void;
}) {
  return <div className="availability-control">
    <button type="button" role="switch" aria-label="Online availability" aria-checked={online}
      aria-busy={saving} disabled={saving} onClick={onToggle}
      className="availability-toggle" data-online={online}>
      <span className="availability-track" aria-hidden="true"><span className="availability-thumb" /></span>
      <span aria-live="polite">{saving ? (online ? "Going offline…" : "Going online…") : (online ? "Online" : "Offline")}</span>
    </button>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
