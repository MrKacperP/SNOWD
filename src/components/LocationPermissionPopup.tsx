"use client";

import React from "react";
import Image from "next/image";
import { Navigation, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake } from "lucide-react";

interface LocationPermissionPopupProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function LocationPermissionPopup({ isOpen, onAllow, onDeny }: LocationPermissionPopupProps) {
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
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Google Map */}
            <div className="relative h-44 w-full bg-[#e8f4fd]">
              <div className="w-full h-full relative overflow-hidden" aria-label="Location preview">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#d8ebff_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#c6e2ff_0%,transparent_45%),linear-gradient(135deg,#edf6ff_0%,#dfeefe_100%)]" />
                <div className="absolute inset-0 opacity-60" style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(47,111,237,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(47,111,237,0.08) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-[#2F6FED] text-white flex items-center justify-center shadow-lg shadow-[#2F6FED]/40 border-2 border-white">
                    <Snowflake className="w-5 h-5" />
                  </div>
                </div>
              </div>
              {/* Gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
            </div>

            <div className="px-6 pt-1 pb-6">
              {/* Logo + heading */}
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                  transition={{ delay: 0.5, duration: 0.7 }}
                >
                  <Image src="/logo.png" alt="Snowd mascot" width={44} height={44} className="drop-shadow" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-[#0B1F33] leading-tight">Allow location access</h2>
                  <p className="text-xs text-[#6B7C8F] mt-0.5">So I can find operators near you! ❄️</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {["Find operators near you", "Get local weather updates", "See better timing estimates"].map((item) => (
                  <div key={item} className="flex items-center gap-3 px-3 py-2 bg-[#F0F7FF] rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-5">
                <Shield className="w-3 h-3 text-[#6B7C8F]" />
                <span className="text-xs text-[#6B7C8F]">Your location stays private and secure.</span>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={onAllow}
                  className="w-full py-3.5 bg-[#2F6FED] hover:bg-[#2158C7] text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[rgba(47,111,237,0.3)]"
                >
                  <Navigation className="w-4 h-4" />
                  Allow location
                </button>
                <button
                  onClick={onDeny}
                  className="w-full py-2.5 text-[#6B7C8F] hover:text-[#0B1F33] text-sm font-medium transition"
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
