"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CelebrationType = "booking" | "completion" | "accepted" | "payment";

interface CelebrationOverlayProps {
  type: CelebrationType;
  show: boolean;
  onComplete?: () => void;
}

const SNOWFLAKE = "❄️";
const CONFETTI = ["🎉", "✨", "⭐", "💙", "🔵", "❄️", "🌟"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function CelebrationOverlay({ type, show, onComplete }: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    emoji: string;
    x: number;
    delay: number;
    duration: number;
    size: number;
  }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        emoji: type === "completion" ? SNOWFLAKE : CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        x: randomBetween(0, 100),
        delay: randomBetween(0, 0.8),
        duration: randomBetween(1.5, 3),
        size: randomBetween(16, 32),
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, type, onComplete]);

  const titles: Record<CelebrationType, { text: string; sub: string }> = {
    booking: { text: "Booking Confirmed!", sub: "Your snow removal is scheduled" },
    completion: { text: "Job Complete!", sub: "Great work out there" },
    accepted: { text: "Job Accepted!", sub: "Time to get to work" },
    payment: { text: "Payment Received!", sub: "Funds are on their way" },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
        >
          {/* Dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black pointer-events-auto"
            onClick={onComplete}
          />

          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ y: "-10vh", x: `${p.x}vw`, opacity: 0, rotate: 0, scale: 0 }}
              animate={{
                y: "110vh",
                opacity: [0, 1, 1, 0],
                rotate: randomBetween(360, 720),
                scale: [0, 1, 1, 0.5],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
              }}
              className="absolute"
              style={{ fontSize: p.size, left: `${p.x}%` }}
            >
              {p.emoji}
            </motion.div>
          ))}

          {/* Center text */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="relative z-10 text-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="w-20 h-20 mx-auto mb-4 bg-[#4361EE] rounded-full flex items-center justify-center shadow-lg"
              style={{ boxShadow: "0 0 40px rgba(67, 97, 238, 0.5)" }}
            >
              <span className="text-3xl">
                {type === "completion" ? "✅" : type === "booking" ? "📅" : type === "payment" ? "💰" : "🤝"}
              </span>
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-extrabold text-white mb-2"
              style={{ textShadow: "0 0 30px rgba(67, 97, 238, 0.5)" }}
            >
              {titles[type].text}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-white/80 text-lg"
            >
              {titles[type].sub}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
