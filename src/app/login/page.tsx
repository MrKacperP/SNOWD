"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, Snowflake, MessageCircle, PhoneCall, Mail, Globe, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_EMAILS = ["kacperprymicz@gmail.com"];

export default function LoginPage() {
  const { user, profile, loading: authLoading, signInWithGoogle, signInWithEmailPassword } = useAuth();
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (!authLoading && user && profile?.onboardingComplete) {
      if (profile.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [authLoading, user, profile, router]);

  const checkProfileAndRedirect = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentEmail = currentUser?.email || "";
      const isAdminEmail = ADMIN_EMAILS.includes(currentEmail.toLowerCase());

      if (docSnap.exists()) {
        const data = docSnap.data();
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
        if (isAdminEmail) {
          await setDoc(docRef, {
            uid,
            email: currentEmail,
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

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const signedUser = await signInWithEmailPassword(email.trim(), password);
      await checkProfileAndRedirect(signedUser.uid);
      if (!remember && typeof window !== "undefined") {
        sessionStorage.removeItem("snowd_signup_name");
        sessionStorage.removeItem("snowd_signup_postal");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in with email and password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-dvh bg-[#EEF3FA]">
      <div className="min-h-dvh grid lg:h-dvh lg:grid-cols-[minmax(500px,560px)_minmax(0,1fr)]">
        <section className="px-5 sm:px-8 lg:px-10 py-6 lg:py-10 flex items-center justify-center overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-[470px]"
          >
            <Link href="/" className="flex items-center gap-2.5 mb-10">
              <Image src="/logo.png" alt="snowd logo" width={36} height={36} />
              <span className="font-headline font-bold text-[#1342A1] text-2xl leading-none">snowd</span>
            </Link>

            <h1 className="text-[34px] sm:text-[42px] leading-[1.05] font-headline font-bold text-[#101B2D]">Welcome back</h1>
            <p className="mt-2 text-[#5B6B84]">Sign in and jump right into your snow ops dashboard.</p>

            <form onSubmit={handleEmailSignIn} className="mt-8 space-y-5">
              <div>
                <label className="text-[15px] font-semibold text-[#1C2B43]">Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="mt-2 w-full h-12 rounded-xl border border-[#D2DBE7] bg-white px-4 text-[#101B2D] outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="text-[15px] font-semibold text-[#1C2B43]">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-2 w-full h-12 rounded-xl border border-[#D2DBE7] bg-white px-4 text-[#101B2D] outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-[#5B6B84]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-[#C7D3E3] text-[#2F6FED]"
                  />
                  Remember for 30 days
                </label>
                <button type="button" className="text-[#2F6FED] hover:text-[#2158C7] font-medium">Forgot password</button>
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#2F6FED] hover:bg-[#2158C7] text-white font-semibold transition disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-4 w-full h-12 border border-[#D2DBE7] bg-white hover:bg-[#F7FAFF] rounded-xl font-medium text-[#1E2C42] transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <p className="text-xs text-[#6D7E95] mt-4 inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Secure login powered by Firebase Auth.
            </p>

            <p className="mt-6 text-sm text-[#5B6B84]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-[#2F6FED] hover:text-[#2158C7]">
                Sign up
              </Link>
            </p>
          </motion.div>
        </section>

        <section className="hidden lg:flex relative overflow-hidden bg-[linear-gradient(145deg,#8AB6FF_0%,#5E8FE8_36%,#4577D8_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.38),transparent_40%),radial-gradient(circle_at_10%_80%,rgba(255,255,255,0.2),transparent_35%)]" />
          <div className="hidden xl:block absolute top-16 left-16 text-white/50"><MessageCircle className="w-10 h-10" /></div>
          <div className="hidden xl:block absolute top-28 right-20 text-white/50"><PhoneCall className="w-9 h-9" /></div>
          <div className="hidden xl:block absolute bottom-40 left-20 text-white/50"><Mail className="w-9 h-9" /></div>
          <div className="hidden xl:block absolute bottom-20 right-24 text-white/50"><Globe className="w-10 h-10" /></div>

          <div className="relative z-10 w-full h-full flex items-center justify-center p-8 xl:p-12">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-full max-w-[440px] rounded-[34px] bg-white/12 border border-white/30 backdrop-blur-md p-7 xl:p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-white/90 font-semibold">SNOWD Dispatch</p>
                  <p className="text-white/70 text-sm">Live winter operations</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Image src="/logo.png" alt="snowd logo icon" width={24} height={24} />
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/25 px-4 py-3">
                {[
                  "Chat with operators in real time",
                  "Track service updates and ETAs",
                  "Manage jobs from one dashboard",
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2.5 text-white/90 text-sm py-2 ${index > 0 ? "border-t border-white/20" : ""}`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-white/95 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 xl:mt-10 flex items-center gap-2 text-white/80 text-sm">
                <Snowflake className="w-4 h-4" />
                Winter-ready support for clients and operators.
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
