"use client";

import React, { useRef, useEffect } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import Image from "next/image";
import { CheckCircle2, MapPin, Navigation, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LocationPermissionPopupProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function LocationPermissionPopup({ isOpen, onAllow, onDeny }: LocationPermissionPopupProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, dialogRef);
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onDeny(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onDeny]);
  const benefits = ["Nearby operators first", "More accurate arrival times", "Local snow alerts"];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Find help nearby"
            tabIndex={-1}
            className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto w-full max-w-[370px] rounded-[1.6rem] border-[3px] border-[#061321] bg-[#f3f8fb] shadow-[8px_8px_0_#061321]"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="relative h-40 w-full overflow-hidden border-b-[3px] border-[#061321] bg-[#dfeef8]">
              <div className="absolute inset-0 opacity-70" style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(6,19,33,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,19,33,0.08) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
              <div className="absolute left-7 top-6 rounded-2xl border-[3px] border-[#061321] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#061321]">
                Local match
              </div>
              <div className="absolute inset-0 flex items-center justify-center pt-6">
                <div className="relative grid h-24 w-24 place-items-center">
                  <span className="absolute h-24 w-24 rounded-full border-[3px] border-[#ff820e]/70 bg-[#ff820e]/12" />
                  <span className="absolute h-16 w-16 rounded-full border-[3px] border-[#061321]/18 bg-white/70" />
                  <div className="relative grid h-12 w-12 place-items-center rounded-full border-[3px] border-[#061321] bg-[#ff820e] text-[#061321] shadow-[4px_4px_0_#061321]">
                    <MapPin className="h-6 w-6 fill-[#061321]" strokeWidth={3} />
                  </div>
                </div>
              </div>
              <Image src="/logo.png" alt="" width={130} height={140} className="absolute -bottom-11 -right-8 h-32 w-32 rotate-[-8deg] object-contain opacity-35" />
            </div>

            <div className="p-5">
              <div>
                <h2 className="font-headline text-3xl font-black lowercase leading-none text-[#061321]">
                  Find help nearby<span className="text-[#ff820e]">.</span>
                </h2>
                <p className="mt-3 text-sm font-bold leading-5 text-[#061321]/64">
                  Share your location so SNOWD can show operators close enough to help today.
                </p>
              </div>

              <div className="mt-5 grid gap-2">
                {benefits.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-[#061321]/10 bg-white px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1d8f4d]" strokeWidth={3} />
                    <span className="text-sm font-black text-[#061321]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-bold leading-4 text-[#061321]/54">
                <Shield className="h-4 w-4 shrink-0 text-[#061321]/48" />
                <span>Used for matching and weather. Never shown as your exact pin.</span>
              </div>

              <div className="mt-5 space-y-2.5">
                <button
                  onClick={onAllow}
                  className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-[#061321] bg-[#ff820e] px-4 py-3 text-base font-black text-[#061321] shadow-[4px_4px_0_#061321] transition hover:-translate-y-0.5"
                >
                  <Navigation className="h-5 w-5" strokeWidth={3} />
                  Show nearby operators
                </button>
                <button
                  onClick={onDeny}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-black text-[#061321]/55 transition hover:bg-white hover:text-[#061321]"
                >
                  Not right now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
