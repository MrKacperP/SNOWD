"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import Modal from "@/components/ui/Modal";

type CelebrationType = "booking" | "completion" | "accepted" | "payment";
interface CelebrationOverlayProps {
  type: CelebrationType;
  show: boolean;
  onComplete?: () => void;
}

const titles: Record<CelebrationType, { text: string; sub: string }> = {
  booking: { text: "Request sent", sub: "You’ll get an update when your operator responds." },
  completion: { text: "Work complete", sub: "Your work order has been updated." },
  accepted: { text: "Request accepted", sub: "You can find the visit details in your work order." },
  payment: { text: "Payment recorded", sub: "View the details in your payment history." },
};

export default function CelebrationOverlay({ type, show, onComplete }: CelebrationOverlayProps) {
  const callback = useRef(onComplete);
  useEffect(() => { callback.current = onComplete; }, [onComplete]);
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => callback.current?.(), 4500);
    return () => clearTimeout(timer);
  }, [show, type]);

  return <Modal isOpen={show} onClose={() => onComplete?.()} size="sm" title={titles[type].text} subtitle={titles[type].sub} variant="success" icon={<span className="result-icon !m-0 !h-14 !w-14"><Check aria-hidden="true" /></span>}>
    {onComplete && <button type="button" className="btn-primary w-full" onClick={onComplete}>Continue</button>}
  </Modal>;
}
