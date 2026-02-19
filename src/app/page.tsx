"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Snowflake,
  MapPin,
  MessageSquare,
  Shield,
  DollarSign,
  ChevronRight,
  Star,
  ArrowRight,
  Truck,
  CreditCard,
  Banknote,
  Clock,
  Lock,
  CheckCircle,
  Send,
  Navigation,
  Search,
} from "lucide-react";

/* ── Fade-up on scroll ─────────────────────────────────────────────── */
function FadeUp({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated counter ──────────────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let val = 0;
    const step = target / (1800 / 16);
    const timer = setInterval(() => {
      val += step;
      if (val >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(Math.floor(val));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ── Subtle snowflakes ─────────────────────────────────────────────── */
function SnowBG() {
  const [flakes, setFlakes] = useState<
    { id: number; left: number; delay: number; dur: number; size: number; op: number }[]
  >([]);

  useEffect(() => {
    setFlakes(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        dur: 8 + Math.random() * 12,
        size: 6 + Math.random() * 10,
        op: 0.04 + Math.random() * 0.08,
      }))
    );
  }, []);

  if (flakes.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {flakes.map((f) => (
        <motion.div
          key={f.id}
          className="absolute text-[#4361EE]"
          style={{ left: `${f.left}%`, top: -20 }}
          animate={{ y: ["0vh", "110vh"], rotate: [0, 360] }}
          transition={{
            duration: f.dur,
            repeat: Infinity,
            delay: f.delay,
            ease: "linear",
          }}
        >
          <Snowflake
            style={{ width: f.size, height: f.size, opacity: f.op }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Widget: Animated Job Progress ─────────────────────────────────── */
function JobProgressWidget() {
  const steps = [
    { label: "Request", sub: "Finding operators near you…", icon: Search },
    { label: "Matched", sub: "Jake accepted your job!", icon: CheckCircle },
    { label: "En Route", sub: "Arriving in 8 min", icon: Navigation },
    { label: "Clearing", sub: "Driveway being cleared", icon: Truck },
    { label: "Done", sub: "All done — leave a review ⭐", icon: Star },
  ];
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    setActive(0);
    const t = setInterval(
      () => setActive((p) => (p >= steps.length - 1 ? 0 : p + 1)),
      2200
    );
    return () => clearInterval(t);
  }, [inView, steps.length]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm w-full max-w-md mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Job #1042
        </p>
        <AnimatePresence mode="wait">
          {active >= 0 && (
            <motion.span
              key={active}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="px-2.5 py-0.5 text-[10px] font-semibold bg-[#4361EE]/10 text-[#4361EE] rounded-full"
            >
              {steps[active].label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1 mb-6">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <motion.div
              animate={{
                scale: i === active ? 1.18 : 1,
                backgroundColor: i <= active ? "#4361EE" : "#f3f4f6",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            >
              <s.icon
                className={`w-4 h-4 transition-colors ${
                  i <= active ? "text-white" : "text-gray-400"
                }`}
              />
            </motion.div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: i < active ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full bg-[#4361EE] rounded-full"
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        {active >= 0 && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <p className="font-semibold text-gray-900 font-headline text-sm">
              {steps[active].label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {steps[active].sub}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Widget: Live Chat ─────────────────────────────────────────────── */
function ChatWidget() {
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const msgs = useMemo(
    () => [
      { from: "op", text: "On my way! 🚛" },
      { from: "system", text: "ETA: 8 min" },
      { from: "client", text: "Perfect, thanks!" },
      { from: "op", text: "Starting now 💪" },
      { from: "system", text: "Job in progress" },
      { from: "client", text: "Looks great!" },
    ],
    []
  );

  useEffect(() => {
    if (!inView || idx >= msgs.length) return;
    const t = setTimeout(() => setIdx((i) => i + 1), 1800);
    return () => clearTimeout(t);
  }, [inView, idx, msgs.length]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm mx-auto overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100">
        <div className="w-8 h-8 bg-[#4361EE] rounded-full flex items-center justify-center text-white text-xs font-bold">
          J
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 font-headline">
            Jake
          </p>
          <p className="text-[10px] text-green-500 font-medium">● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 py-4 space-y-2 min-h-[180px]">
        <AnimatePresence>
          {msgs.slice(0, idx).map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${
                m.from === "client"
                  ? "justify-end"
                  : m.from === "system"
                    ? "justify-center"
                    : "justify-start"
              }`}
            >
              {m.from === "system" ? (
                <span className="bg-[#4361EE]/8 text-[#4361EE] border border-[#4361EE]/15 px-2.5 py-1 rounded-full text-[10px] font-medium">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {m.text}
                </span>
              ) : (
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[80%] ${
                    m.from === "client"
                      ? "bg-[#4361EE] text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {idx < msgs.length && (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm text-xs text-gray-400">
              ···
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <div className="flex-1 text-[10px] px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-gray-400">
          Message…
        </div>
        <div className="w-7 h-7 bg-[#4361EE] rounded-xl flex items-center justify-center">
          <Send className="w-3 h-3 text-white" />
        </div>
      </div>
    </div>
  );
}

/* ── Widget: Operator Browser ──────────────────────────────────────── */
function OperatorWidget() {
  const ops = useMemo(
    () => [
      {
        name: "Jake",
        rating: 5,
        reviews: 47,
        price: "$25",
        type: "Student",
        dist: "4.2 km",
        initial: "J",
      },
      {
        name: "Paul",
        rating: 5,
        reviews: 132,
        price: "$60",
        type: "Pro",
        dist: "1.8 km",
        initial: "P",
      },
      {
        name: "Sam",
        rating: 4,
        reviews: 23,
        price: "$35",
        type: "Student",
        dist: "6.0 km",
        initial: "S",
      },
    ],
    []
  );
  const [selected, setSelected] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(
      () => setSelected((p) => (p + 1) % ops.length),
      3000
    );
    return () => clearInterval(t);
  }, [inView, ops.length]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm w-full max-w-sm mx-auto"
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Nearby operators
      </p>
      <div className="space-y-2.5">
        {ops.map((op, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i === selected ? 1.02 : 1,
              borderColor: i === selected ? "#4361EE" : "#f3f4f6",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer"
            onClick={() => setSelected(i)}
          >
            <motion.div
              animate={{
                backgroundColor:
                  i === selected ? "#4361EE" : "rgba(67,97,238,0.1)",
                color: i === selected ? "#ffffff" : "#4361EE",
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
            >
              {op.initial}
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 font-headline">
                {op.name}
              </p>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, j) => (
                  <Star
                    key={j}
                    className={`w-3 h-3 ${
                      j < op.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-200"
                    }`}
                  />
                ))}
                <span className="text-[10px] text-gray-400 ml-0.5">
                  ({op.reviews})
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-sm text-gray-900 font-headline">
                {op.price}
              </p>
              <p className="text-[10px] text-gray-400">{op.dist}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-2.5 bg-[#4361EE] text-white text-sm font-semibold rounded-xl"
          >
            Book {ops[selected].name}
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Widget: Payment ───────────────────────────────────────────────── */
function PaymentWidget() {
  const methods = useMemo(
    () => [
      {
        icon: Banknote,
        label: "Cash",
        color: "text-green-600",
        bg: "bg-green-50",
      },
      {
        icon: CreditCard,
        label: "Card",
        color: "text-[#4361EE]",
        bg: "bg-[#4361EE]/8",
      },
      {
        icon: DollarSign,
        label: "e-Transfer",
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
    ],
    []
  );
  const [selected, setSelected] = useState(1);
  const [paid, setPaid] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    const sequence = [0, 1, 2, 1];
    let step = 0;
    const t = setInterval(() => {
      if (step < sequence.length) {
        setSelected(sequence[step]);
        setPaid(false);
        step++;
      } else {
        setPaid(true);
        step = 0;
        setTimeout(() => {
          setPaid(false);
          setSelected(0);
        }, 2000);
      }
    }, 1400);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm w-full max-w-xs mx-auto"
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Payment
      </p>
      <p className="text-2xl font-bold text-gray-900 font-headline mb-4">
        $45.00
      </p>
      <div className="flex gap-2 mb-4">
        {methods.map((m, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i === selected && !paid ? 1.05 : 1,
              borderColor:
                i === selected && !paid ? "#4361EE" : "#f3f4f6",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 cursor-pointer"
            onClick={() => {
              setSelected(i);
              setPaid(false);
            }}
          >
            <div
              className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}
            >
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <span className="text-[10px] font-medium text-gray-600">
              {m.label}
            </span>
          </motion.div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {paid ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Paid!
          </motion.div>
        ) : (
          <motion.button
            key="pay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-2.5 bg-[#4361EE] text-white text-sm font-semibold rounded-xl"
          >
            Pay now
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Button ────────────────────────────────────────────────────────── */
function Btn({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <Link
        href={href}
        className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition ${
          variant === "primary"
            ? "bg-[#4361EE] text-white hover:bg-[#3651D4] shadow-lg shadow-[#4361EE]/20"
            : "border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        } ${className}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">
      <SnowBG />

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 bg-white/85 backdrop-blur-md z-50 border-b border-gray-100"
      >
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
            >
              <Snowflake className="w-7 h-7 text-[#4361EE]" />
            </motion.div>
            <span className="text-xl font-bold text-[#4361EE] font-headline">
              snowd
            </span>
            <span className="text-xl font-light text-gray-400">.ca</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Sign In
            </Link>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm font-semibold bg-[#4361EE] text-white rounded-xl hover:bg-[#3651D4] transition shadow-sm shadow-[#4361EE]/20"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-12 md:pt-44 md:pb-20 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#4361EE]/8 border border-[#4361EE]/20 text-[#4361EE] rounded-full text-sm font-medium mb-8"
          >
            <Snowflake className="w-3.5 h-3.5" /> Built for Canadian winters
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.65 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-gray-900 leading-[1.02] tracking-tight font-headline"
          >
            Snow removal,
            <br />
            <span className="text-[#4361EE]">simplified.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-lg md:text-xl text-gray-400 max-w-md mx-auto"
          >
            Connect with local operators in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
          >
            <Btn href="/signup">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Btn>
            <Btn href="/signup" variant="outline">
              <Truck className="w-4 h-4" /> I&apos;m an Operator
            </Btn>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-400"
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> All provinces
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Verified profiles
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Secure payments
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── WIDGET: Job Progress ─────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-headline leading-tight">
              Track every step
            </h2>
            <p className="text-gray-400 mt-3 max-w-sm text-lg">
              Watch your job progress in real time — from request to completion.
            </p>
          </FadeUp>
          <FadeUp delay={0.15}>
            <JobProgressWidget />
          </FadeUp>
        </div>
      </section>

      {/* ── WIDGET: Live Chat ────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <FadeUp className="md:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-headline leading-tight">
              Chat in real time
            </h2>
            <p className="text-gray-400 mt-3 max-w-sm text-lg">
              Message your operator and get live ETA updates — all in-app.
            </p>
          </FadeUp>
          <FadeUp delay={0.15} className="md:order-1">
            <ChatWidget />
          </FadeUp>
        </div>
      </section>

      {/* ── WIDGET: Find Operator ────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-headline leading-tight">
              Find your operator
            </h2>
            <p className="text-gray-400 mt-3 max-w-sm text-lg">
              Browse verified locals — from pro plows to students with shovels.
            </p>
          </FadeUp>
          <FadeUp delay={0.15}>
            <OperatorWidget />
          </FadeUp>
        </div>
      </section>

      {/* ── WIDGET: Payment ──────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <FadeUp className="md:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-headline leading-tight">
              Pay your way
            </h2>
            <p className="text-gray-400 mt-3 max-w-sm text-lg">
              Cash, card, or e-Transfer. Whatever works for you.
            </p>
          </FadeUp>
          <FadeUp delay={0.15} className="md:order-1">
            <PaymentWidget />
          </FadeUp>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="py-14 px-5 bg-[#4361EE]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {[
            { val: 500, sfx: "+", lbl: "Jobs Done" },
            { val: 150, sfx: "+", lbl: "Operators" },
            { val: 98, sfx: "%", lbl: "Satisfaction" },
            { val: 5, sfx: " min", lbl: "Avg. Match" },
          ].map((s, i) => (
            <FadeUp key={i} delay={i * 0.1} className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-bold font-headline">
                <Counter target={s.val} suffix={s.sfx} />
              </span>
              <span className="text-sm text-white/70 mt-1">{s.lbl}</span>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-5">
        <FadeUp className="max-w-4xl mx-auto">
          <div className="bg-[#4361EE] rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
            <motion.div
              className="absolute top-6 right-10 opacity-10"
              animate={{ rotate: 360 }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Snowflake className="w-28 h-28" />
            </motion.div>
            <motion.div
              className="absolute bottom-6 left-10 opacity-10"
              animate={{ rotate: -360 }}
              transition={{
                duration: 28,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Snowflake className="w-20 h-20" />
            </motion.div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 font-headline">
                Ready to get started?
              </h2>
              <p className="text-white/60 text-lg mb-10 max-w-md mx-auto">
                Join snowd.ca — it&apos;s free.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#4361EE] rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-lg"
                  >
                    Sign Up Free <ChevronRight className="w-5 h-5" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/login"
                    className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition"
                  >
                    I have an account
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-5 bg-white relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-[#4361EE]" />
            <span className="font-bold text-[#4361EE] font-headline">
              snowd
            </span>
            <span className="font-light text-gray-400">.ca</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; 2026 snowd.ca &mdash; Made in Canada
          </p>
          <div className="flex items-center gap-5 text-sm text-gray-400">
            <Link href="#" className="hover:text-gray-700 transition">
              Privacy
            </Link>
            <Link href="#" className="hover:text-gray-700 transition">
              Terms
            </Link>
            <Link href="#" className="hover:text-gray-700 transition">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
