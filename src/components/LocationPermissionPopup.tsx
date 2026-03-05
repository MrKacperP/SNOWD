"use client";

import React from "react";
import { MapPin, Navigation, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

          <motion.div
            className="relative w-full max-w-md bg-[var(--bg-card-solid)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Allow location access</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                We use location to show nearby operators, weather, and more accurate ETAs.
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-2.5 mb-4">
                {["Find operators near you", "Get local weather updates", "See better timing estimates"].map((item) => (
                  <div key={item} className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--bg-secondary)] rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    <span className="text-sm text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-5">
                <Shield className="w-3.5 h-3.5" />
                <span>Your location stays private and secure.</span>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={onAllow}
                  className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[rgba(47,111,237,0.22)]"
                >
                  <Navigation className="w-4 h-4" />
                  Allow location
                </button>
                <button
                  onClick={onDeny}
                  className="w-full py-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm font-medium transition"
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
