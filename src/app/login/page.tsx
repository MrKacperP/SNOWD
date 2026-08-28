"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthPageShell from "@/components/AuthPageShell";
import { ArrowRight, Mail, TimerReset } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_EMAILS = ["kacperprymicz@gmail.com"];

const benefits = [
  "Jump back into active booking threads and job updates.",
  "Track approvals, arrivals, and payouts from one dashboard.",
  "Keep operator and homeowner messages in the same winter workflow.",
];

function LoginPageInner() {
  const { user, profile, loading: authLoading, signInWithGoogle, signInWithEmailPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const rawRedirect = searchParams.get("redirect") || "";
  const redirectPath = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "";

  useEffect(() => {
    if (!authLoading && user && profile?.onboardingComplete) {
      router.replace(profile.role === "admin" ? "/admin" : redirectPath || "/dashboard");
    }
  }, [authLoading, user, profile, router, redirectPath]);

  const checkProfileAndRedirect = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      const { getAuth } = await import("firebase/auth");
      const currentUser = getAuth().currentUser;
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
          router.replace(redirectPath || "/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else if (isAdminEmail) {
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
      } else {
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
      if (!msg.includes("popup-closed")) setError(msg);
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
      setError(err instanceof Error ? err.message : "Failed to sign in with email and password");
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <AuthPageShell
      eyebrow="account access"
      title="welcome back"
      body="Sign in to rejoin active requests, operator chats, and your running snow service workflow."
      features={benefits}
    >
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full">
        <div className="rounded-[1.35rem] border-[3px] border-[#061321] bg-white p-4 shadow-[5px_5px_0_#061321] sm:p-5 lg:p-6">
          <div className="inline-flex rounded-full bg-[#ff820e] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]">
            Sign in
          </div>
          <h2 className="mt-3 font-headline text-[clamp(2rem,7vw,3rem)] font-black lowercase leading-none">
            Access your account<span className="text-[#ff820e]">.</span>
          </h2>

          <form onSubmit={handleEmailSignIn} className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-[#061321]/60">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="h-12 w-full rounded-2xl border-[3px] border-[#061321] bg-[#f3f8fb] px-4 text-base font-bold text-[#061321] outline-none transition placeholder:text-[#061321]/35 focus:bg-white sm:h-13"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-[#061321]/60">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-2xl border-[3px] border-[#061321] bg-[#f3f8fb] px-4 text-base font-bold text-[#061321] outline-none transition placeholder:text-[#061321]/35 focus:bg-white sm:h-13"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold sm:text-sm">
                <label className="inline-flex items-center gap-2 text-[#061321]/62">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-[#061321]"
                  />
                  Keep me signed in
                </label>
                <button type="button" className="font-black text-[#061321]">
                  Forgot password
                </button>
              </div>

              {error ? (
                <div className="rounded-2xl border-[3px] border-red-700 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl border-[3px] border-[#061321] bg-[#061321] px-5 text-base font-black text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-55 sm:min-h-13"
              >
                {loading ? "Signing in..." : "Sign in"} {!loading ? <ArrowRight className="ml-2 h-5 w-5" strokeWidth={3} /> : null}
              </button>
            </form>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-2.5 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border-[3px] border-[#061321] bg-white px-5 text-base font-black text-[#061321] transition hover:-translate-y-0.5 hover:bg-[#dfeef8] disabled:translate-y-0 disabled:opacity-55 sm:min-h-13"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11.99 11.99 0 0 0 12 23Z" fill="#34A853" />
                <path d="M5.84 14.09A7.2 7.2 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A12 12 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l4.66-2.84Z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11.99 11.99 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#061321]/48">
              <TimerReset className="h-4 w-4" />
              Secure Firebase auth
            </div>

            <p className="mt-3 text-sm font-bold text-[#061321]/62">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-black text-[#061321] underline decoration-[#ff820e] decoration-4 underline-offset-4">
                Create one
              </Link>
            </p>
        </div>

        <div className="mt-3 hidden rounded-2xl border-[3px] border-[#061321] bg-[#dfeef8] p-3 sm:block">
          <div className="flex items-center gap-3 text-xs font-black sm:text-sm">
            <Mail className="h-5 w-5" strokeWidth={3} />
            Same dashboard, messages, and dispatch once you are in.
          </div>
        </div>
      </motion.div>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--bg-primary)]" />}>
      <LoginPageInner />
    </Suspense>
  );
}
