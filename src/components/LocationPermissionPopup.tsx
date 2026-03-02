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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            className="relative w-full max-w-sm bg-[var(--bg-card-solid)] rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          >
            {/* Animated gradient header */}
            <div className="relative h-40 bg-[#246EB9] overflow-hidden">
              {/* Animated circles */}
              <motion.div
                className="absolute w-24 h-24 bg-white/10 rounded-full -top-6 -right-6"
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute w-16 h-16 bg-white/10 rounded-full bottom-2 left-8"
                animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.15, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              />

              {/* Pin animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
                >
                  <div className="relative">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                        <MapPin className="w-8 h-8 text-white" />
                      </div>
                    </motion.div>
                    {/* Shadow under pin */}
                    <motion.div
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/20 rounded-full blur-sm"
                      animate={{ scaleX: [1, 0.8, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Snowflake decorations */}
              <motion.div
                className="absolute top-4 left-6 text-white/20 text-lg"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                ❄️
              </motion.div>
              <motion.div
                className="absolute bottom-6 right-10 text-white/15 text-sm"
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                ❄️
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Enable Location Access
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                We use your location to show local weather, find nearby snow removal operators, and provide accurate service estimates.
              </p>

              {/* Features list */}
              <div className="mt-4 space-y-2">
                {[
                  { icon: "🌨️", text: "Real-time local weather" },
                  { icon: "📍", text: "Nearby operators" },
                  { icon: "⏱️", text: "Accurate ETAs" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-secondary)] rounded-xl"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-[var(--text-primary)] font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 justify-center mt-4 text-xs text-[var(--text-muted)]">
                <Shield className="w-3 h-3" />
                <span>Your location stays private and secure</span>
              </div>

              {/* Buttons */}
              <div className="mt-5 space-y-2.5">
                <button
                  onClick={onAllow}
                  className="w-full py-3.5 bg-[#246EB9] hover:bg-[#1B5A9A] text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#246EB9]/20"
                >
                  <Navigation className="w-4 h-4" />
                  Allow Location
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
