"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ConfirmationResult } from "firebase/auth";
import { Phone, ArrowRight, Snowflake, Shield, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Emails that are automatically promoted to admin role on first login
const ADMIN_EMAILS = ["kacperprymicz@gmail.com"];

function FloatingSnowflake({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute text-white/10 pointer-events-none select-none"
      initial={{ y: -20, x, opacity: 0, rotate: 0 }}
      animate={{ y: "100vh", opacity: [0, 0.3, 0], rotate: 360 }}
      transition={{ duration: 8 + Math.random() * 4, delay, repeat: Infinity, ease: "linear" }}
    >
      <Snowflake style={{ width: size, height: size }} />
    </motion.div>
  );
}

export default function LoginPage() {
  const { user, profile, loading: authLoading, signInWithGoogle, sendPhoneCode, confirmPhoneCode } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"choose" | "phone" | "code">("choose");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!authLoading && user && profile?.onboardingComplete) {
      if (profile.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const checkProfileAndRedirect = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      
      // Check if this is an admin email (from Firebase Auth)
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const email = currentUser?.email || "";
      const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Auto-promote to admin if email matches
        if (isAdminEmail && data?.role !== "admin") {
          await setDoc(docRef, { role: "admin", onboardingComplete: true }, { merge: true });
          router.replace("/admin");
          return;
        }
        if (data?.role === "admin") {
          router.replace("/admin");
        } else if (data?.onboardingComplete) {
          router.replace("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else {
        // New user — if admin email, auto-create admin profile
        if (isAdminEmail) {
          await setDoc(docRef, {
            uid,
            email,
            displayName: currentUser?.displayName || "SNOWD Owner",
            phone: currentUser?.phoneNumber || "",
            role: "admin",
            createdAt: new Date(),
            onboardingComplete: true,
            province: "ON",
            city: "Ottawa",
            postalCode: "",
            address: "",
            isOnline: true,
          });
          router.replace("/admin");
          return;
        }
        router.push("/onboarding");
      }
    } catch {
      router.push("/onboarding");
    }
  };

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (digits.length <= 10) {
      setPhoneNumber(formatPhoneDisplay(digits));
    }
  };

  const handleSendCode = async () => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fullNumber = `+1${digits}`;
      const result = await sendPhoneCode(fullNumber);
      setConfirmationResult(result);
      setMode("code");
      setCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send code";
      if (msg.includes("too-many-requests")) {
        setError("Too many attempts. Please wait and try again.");
      } else if (msg.includes("invalid-phone-number")) {
        setError("Invalid phone number. Please check and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
    if (newCode.every((c) => c) && newCode.join("").length === 6) {
      handleVerifyCode(newCode.join(""));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setVerificationCode(newCode);
      codeInputRefs.current[5]?.focus();
      handleVerifyCode(pasted);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!confirmationResult) return;
    setError("");
    setLoading(true);
    try {
      const result = await confirmPhoneCode(confirmationResult, code);
      await checkProfileAndRedirect(result.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      if (msg.includes("invalid-verification-code")) {
        setError("Invalid code. Please try again.");
      } else {
        setError(msg);
      }
      setVerificationCode(["", "", "", "", "", ""]);
      codeInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await checkProfileAndRedirect(googleUser.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in with Google";
      if (!msg.includes("popup-closed")) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f4e] via-[#1e2a6e] to-[#0f1535]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <FloatingSnowflake key={i} delay={i * 0.7} x={30 + (i * 80) % 350} size={8 + (i % 3) * 8} />
        ))}
      </div>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-[#4361EE]/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-[#6B83F2]/15 rounded-full blur-[100px]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                <Snowflake className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              snowd<span className="text-white/40 font-light">.ca</span>
            </h1>
            <p className="text-white/50 mt-2 text-sm">Snow cleared in minutes.</p>
          </motion.div>

          <motion.div className="bg-white/[0.07] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div className="p-8">
              <AnimatePresence mode="wait">
                {mode === "choose" && (
                  <motion.div key="choose" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-white">Welcome back</h2>
                      <p className="text-white/50 text-sm mt-1">Sign in to continue</p>
                    </div>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">{error}</div>}
                    <button onClick={() => { setMode("phone"); setError(""); }} className="w-full flex items-center gap-4 p-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 rounded-2xl transition-all duration-200 group">
                      <div className="w-11 h-11 bg-[#4361EE]/20 rounded-xl flex items-center justify-center group-hover:bg-[#4361EE]/30 transition">
                        <Phone className="w-5 h-5 text-[#6B83F2]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-sm">Continue with Phone</p>
                        <p className="text-white/40 text-xs">We&apos;ll send you a verification code</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition" />
                    </button>
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-white/30 text-xs font-medium">or</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center gap-4 p-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 rounded-2xl transition-all duration-200 group disabled:opacity-50">
                      <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-sm">{loading ? "Connecting..." : "Continue with Google"}</p>
                        <p className="text-white/40 text-xs">Use your Google account</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition" />
                    </button>
                  </motion.div>
                )}

                {mode === "phone" && (
                  <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                    <button onClick={() => { setMode("choose"); setError(""); }} className="flex items-center gap-1 text-white/50 hover:text-white/80 text-sm transition">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="text-center">
                      <div className="w-14 h-14 bg-[#4361EE]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-7 h-7 text-[#6B83F2]" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Enter your phone</h2>
                      <p className="text-white/50 text-sm mt-1">We&apos;ll text you a 6-digit code</p>
                    </div>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">{error}</div>}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-medium shrink-0">🇨🇦 +1</div>
                      <input type="tel" value={phoneNumber} onChange={handlePhoneChange} placeholder="(555) 123-4567" maxLength={14} autoFocus className="flex-1 px-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:border-[#4361EE]/50 focus:ring-2 focus:ring-[#4361EE]/20 outline-none transition text-sm" />
                    </div>
                    <button onClick={handleSendCode} disabled={loading || phoneNumber.replace(/\D/g, "").length < 10} className="w-full py-3.5 bg-[#4361EE] hover:bg-[#3249D6] text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#4361EE]/25">
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send Code <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    <p className="text-white/30 text-xs text-center"><Shield className="w-3 h-3 inline mr-1" />Your number is encrypted and secure</p>
                  </motion.div>
                )}

                {mode === "code" && (
                  <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                    <button onClick={() => { setMode("phone"); setError(""); setVerificationCode(["","","","","",""]); }} className="flex items-center gap-1 text-white/50 hover:text-white/80 text-sm transition">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="text-center">
                      <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-7 h-7 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Verify your number</h2>
                      <p className="text-white/50 text-sm mt-1">Code sent to {phoneNumber}</p>
                    </div>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">{error}</div>}
                    <div className="flex justify-center gap-2.5" onPaste={handleCodePaste}>
                      {verificationCode.map((digit, i) => (
                        <input key={i} ref={(el) => { codeInputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleCodeInput(i, e.target.value)} onKeyDown={(e) => handleCodeKeyDown(i, e)} autoFocus={i === 0} className="w-12 h-14 text-center text-xl font-bold bg-white/[0.06] border border-white/10 rounded-xl text-white focus:border-[#4361EE]/60 focus:ring-2 focus:ring-[#4361EE]/20 outline-none transition" />
                      ))}
                    </div>
                    {loading && <div className="flex justify-center"><div className="w-6 h-6 border-2 border-[#4361EE]/30 border-t-[#4361EE] rounded-full animate-spin" /></div>}
                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-white/30 text-sm">Resend code in <span className="text-white/60 font-medium">{countdown}s</span></p>
                      ) : (
                        <button onClick={handleSendCode} className="text-[#6B83F2] hover:text-[#4361EE] text-sm font-medium transition">Resend code</button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p className="text-center mt-6 text-sm text-white/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#6B83F2] font-semibold hover:text-white transition">Sign up</Link>
          </motion.p>
        </div>
      </div>
      {/* reCAPTCHA must live outside overflow-hidden containers */}
      <div id="recaptcha-container" className="fixed bottom-0 left-0" />
    </div>
  );
}

