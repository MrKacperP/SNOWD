"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Snowflake, Search, MessageSquare, CreditCard, Star } from "lucide-react";

const TUTORIAL_KEY = "snowd-tutorial-v1";

interface TutorialSlide {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  emoji: string;
}

const SLIDES: TutorialSlide[] = [
  {
    icon: <Snowflake className="w-10 h-10 text-white" />,
    color: "bg-[#246EB9]",
    emoji: "❄️",
    title: "Welcome to snowd.ca",
    description: "Your Canadian snow removal marketplace. Connect with trusted local operators and get your property cleared fast — no fuss.",
  },
  {
    icon: <Search className="w-10 h-10 text-white" />,
    color: "bg-[#246EB9]",
    emoji: "🔍",
    title: "Find Local Operators",
    description: "Browse verified snow removal pros near you. Filter by rating, price, equipment, and distance. Book in seconds.",
  },
  {
    icon: <MessageSquare className="w-10 h-10 text-white" />,
    color: "bg-[#7B2FBE]",
    emoji: "💬",
    title: "Chat & Coordinate",
    description: "Communicate directly with your operator. Get real-time ETA updates, share job photos, and track progress live.",
  },
  {
    icon: <CreditCard className="w-10 h-10 text-white" />,
    color: "bg-[#00B4D8]",
    emoji: "💳",
    title: "Pay Securely",
    description: "Pay in-app with Stripe — no cash awkwardness. Funds are held safely and released when the job is done.",
  },
  {
    icon: <Star className="w-10 h-10 text-white" />,
    color: "bg-[#F4A261]",
    emoji: "⭐",
    title: "Rate & Review",
    description: "Help others by leaving honest reviews after every job. Your feedback builds a trustworthy community.",
  },
];

export default function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  useEffect(() => {
    const shown = localStorage.getItem(TUTORIAL_KEY);
    if (!shown) {
      // Small delay so the dashboard loads first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TUTORIAL_KEY, "shown");
    setVisible(false);
  };

  const next = () => {
    if (slide < SLIDES.length - 1) {
      setDirection("next");
      setSlide((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (slide > 0) {
      setDirection("prev");
      setSlide((s) => s - 1);
    }
  };

  const current = SLIDES[slide];

  const slideVariants = {
    enter: (dir: string) => ({
      x: dir === "next" ? 60 : -60,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: string) => ({
      x: dir === "next" ? -60 : 60,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Solid colour header */}
            <div className={`${current.color} p-8 relative`}>
              {/* Skip button */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-white"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Floating snowflake decorations */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-4 left-4 opacity-20"
              >
                <Snowflake className="w-8 h-8 text-white" />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-4 right-8 opacity-20"
              >
                <Snowflake className="w-6 h-6 text-white" />
              </motion.div>

              {/* Icon */}
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {current.icon}
              </div>

              {/* Slide dots */}
              <div className="flex gap-1.5 justify-center">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > slide ? "next" : "prev"); setSlide(i); }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slide ? "w-6 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slide}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                >
                  <div className="text-2xl mb-2">{current.emoji}</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h2>
                  <p className="text-gray-500 text-sm leading-relaxed">{current.description}</p>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center gap-3 mt-6">
                {slide > 0 && (
                  <button
                    onClick={prev}
                    className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={next}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition ${current.color} hover:opacity-90`}
                >
                  {slide < SLIDES.length - 1 ? (
                    <>Next <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    "Get Started 🚀"
                  )}
                </button>
              </div>

              {slide < SLIDES.length - 1 && (
                <button
                  onClick={dismiss}
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition"
                >
                  Skip tutorial
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
