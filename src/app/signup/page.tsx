"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Mail, ArrowRight, Snowflake, Shield, ChevronLeft, Sparkles, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function SignUpPage() {
  const { user, profile, loading: authLoading, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && profile?.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, profile, router]);

  const checkExistingProfile = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists() && docSnap.data()?.onboardingComplete) {
        router.replace("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch {
      router.push("/onboarding");
    }
  };

  const handleEmailSignUp = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const newUser = await signUp(email.trim(), password);
      await checkExistingProfile(newUser.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account";
      if (msg.includes("email-already-in-use")) {
        setError("This email is already registered. Try signing in, or use Continue with Google if you signed up that way.");
      } else if (msg.includes("account-exists-with-different-credential")) {
        setError("This email is linked to a Google account. Please use Continue with Google to sign in.");
      } else if (msg.includes("invalid-email")) {
        setError("Please enter a valid email address.");
      } else if (msg.includes("weak-password")) {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await checkExistingProfile(googleUser.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign up with Google";
      if (msg.includes("account-exists-with-different-credential")) {
        setError("This email is already registered with a password. Please use Continue with Email instead.");
      } else if (!msg.includes("popup-closed")) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0f1535]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <FloatingSnowflake key={i} delay={i * 0.7} x={30 + (i * 80) % 350} size={8 + (i % 3) * 8} />
        ))}
      </div>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-[#3A8AD4]/20 rounded-full blur-[100px]" />
      <div className="absolute top-1/4 -right-32 w-64 h-64 bg-[#246EB9]/15 rounded-full blur-[100px]" />

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
            <p className="text-white/50 mt-2 text-sm flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Create your account to get started
            </p>
          </motion.div>

          <motion.div
            className="bg-white/[0.07] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="p-8">
              <AnimatePresence mode="wait">
                {mode === "choose" && (
                  <motion.div key="choose" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-white">Join snowd.ca</h2>
                      <p className="text-white/50 text-sm mt-1">Start in under 2 minutes</p>
                    </div>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">{error}</div>}

                    {/* Google */}
                    <button
                      onClick={handleGoogleSignUp}
                      disabled={loading}
                      className="w-full flex items-center gap-4 p-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 rounded-2xl transition-all duration-200 group disabled:opacity-50"
                    >
                      <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-sm">{loading ? "Connecting..." : "Sign up with Google"}</p>
                        <p className="text-white/40 text-xs">Use your Google account</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition" />
                    </button>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-white/30 text-xs font-medium">or</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Email */}
                    <button
                      onClick={() => { setMode("email"); setError(""); }}
                      className="w-full flex items-center gap-4 p-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 rounded-2xl transition-all duration-200 group"
                    >
                      <div className="w-11 h-11 bg-[#246EB9]/20 rounded-xl flex items-center justify-center group-hover:bg-[#246EB9]/30 transition shrink-0">
                        <Mail className="w-5 h-5 text-[#3A8AD4]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-sm">Sign up with Email</p>
                        <p className="text-white/40 text-xs">Create account with email &amp; password</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition" />
                    </button>
                  </motion.div>
                )}

                {mode === "email" && (
                  <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                    <button onClick={() => { setMode("choose"); setError(""); }} className="flex items-center gap-1 text-white/50 hover:text-white/80 text-sm transition">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="text-center">
                      <div className="w-14 h-14 bg-[#246EB9]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-7 h-7 text-[#3A8AD4]" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Create your account</h2>
                      <p className="text-white/50 text-sm mt-1">Enter your details to get started</p>
                    </div>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">{error}</div>}

                    <div className="space-y-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        autoFocus
                        className="w-full px-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:border-[#246EB9]/50 focus:ring-2 focus:ring-[#246EB9]/20 outline-none transition text-sm"
                      />
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password (min 6 characters)"
                          className="w-full px-4 py-3.5 pr-12 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:border-[#246EB9]/50 focus:ring-2 focus:ring-[#246EB9]/20 outline-none transition text-sm"
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleEmailSignUp()}
                          placeholder="Confirm password"
                          className="w-full px-4 py-3.5 pr-12 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:border-[#246EB9]/50 focus:ring-2 focus:ring-[#246EB9]/20 outline-none transition text-sm"
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleEmailSignUp}
                      disabled={loading}
                      className="w-full py-3.5 bg-[#246EB9] hover:bg-[#1B5A9A] text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#246EB9]/25"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    <p className="text-white/30 text-xs text-center">
                      <Shield className="w-3 h-3 inline mr-1" />Your information is encrypted and secure
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p className="text-center mt-6 text-sm text-white/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Already have an account?{" "}
            <Link href="/login" className="text-[#3A8AD4] font-semibold hover:text-white transition">Sign in</Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
