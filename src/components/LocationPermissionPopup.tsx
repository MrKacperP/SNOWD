"use client";

import { MapPin, Navigation, Shield } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface LocationPermissionPopupProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function LocationPermissionPopup({ isOpen, onAllow, onDeny }: LocationPermissionPopupProps) {
  return (
    <Modal isOpen={isOpen} onClose={onDeny} size="sm" title="Find help nearby" subtitle="Use your location to find nearby shovelers and see your local weather." icon={<MapPin className="h-6 w-6" />}>
      <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-primary)] p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-muted)]" />
        <p>You can skip this and enter your address when you post a job.</p>
      </div>
      <div className="mt-5 space-y-2">
        <button type="button" onClick={onAllow} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]">
          <Navigation className="h-4 w-4" /> Use my location
        </button>
        <button type="button" onClick={onDeny} className="min-h-12 w-full rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)]">Not right now</button>
      </div>
    </Modal>
  );
}
