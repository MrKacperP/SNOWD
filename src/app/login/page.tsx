"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, MessageSquare, Shield, Snowflake, TimerReset, Truck } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_EMAILS = ["kacperprymicz@gmail.com"];

const benefits = [
  "Jump back into active booking threads.",
  "Track approvals, arrivals, and payouts in one place.",
  "Use the same fast layout across mobile and desktop.",
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
    <div className="min-h-dvh px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1400px] overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-white shadow-[0_30px_90px_rgba(18,18,18,0.12)] lg:grid-cols-[minmax(460px,520px)_minmax(0,1fr)]">
        <section className="bg-[#111111] px-6 py-6 text-white md:px-9 md:py-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/logo.png" alt="snowd logo" width={36} height={36} />
            <span className="text-2xl font-headline font-bold">snowd<span className="text-[var(--accent-sun)]">.</span></span>
          </Link>

          <div className="mt-10 max-w-sm">
            <div className="chip border border-white/10 bg-white/8 text-white">
              <Snowflake className="h-4 w-4 text-[var(--accent-sun)]" />
              Account access
            </div>
            <h1 className="mt-6 text-4xl font-headline font-bold leading-none md:text-5xl">Welcome back<span className="text-[var(--accent-sun)]">.</span></h1>
            <p className="mt-4 text-base leading-7 text-white/68">
              Sign in to rejoin active requests, operator chats, and your running snow service workflow.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {benefits.map((item) => (
              <div key={item} className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-sun)]" />
                  <p className="text-sm leading-6 text-white/80">{item}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 hidden rounded-[1.7rem] border border-white/10 bg-white/7 p-5 lg:block">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white/66">Dispatch preview</div>
                <div className="mt-1 text-xl font-headline font-bold">Operator matched</div>
              </div>
              <div className="rounded-full bg-[var(--accent-sun)] px-3 py-1 text-xs font-bold text-[#111111]">live</div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-white px-4 py-3 text-[#111111]">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="h-4 w-4" />
                  Northline Snow
                </div>
                <div className="mt-1 text-xs text-[#5b5b5b]">6 minutes away • medium driveway • $48</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/88">
                “I can start with the walkway first and message you once I arrive.”
              </div>
            </div>
          </div>
        </section>

        <section className="map-shell flex items-center justify-center px-5 py-8 md:px-8 md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[460px] rounded-[2rem] bg-white p-6 shadow-[0_24px_50px_rgba(18,18,18,0.14)] md:p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-muted)]">Sign in</div>
                <h2 className="mt-1 text-3xl font-headline font-bold">Access your account<span className="text-[var(--accent-sun)]">.</span></h2>
              </div>
              <div className="rounded-full bg-[var(--accent-sun-soft)] p-3">
                <Shield className="h-5 w-5 text-[var(--text-primary)]" />
              </div>
            </div>

            <form onSubmit={handleEmailSignIn} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="h-13 w-full rounded-2xl border border-[var(--border-color)] bg-[#fbfbf8] px-4 text-[var(--text-primary)] outline-none transition focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-13 w-full rounded-2xl border border-[var(--border-color)] bg-[#fbfbf8] px-4 text-[var(--text-primary)] outline-none transition focus:border-[#111111]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex items-center gap-2 text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-color)]"
                  />
                    Keep me signed in
                </label>
                <button type="button" className="font-semibold text-[var(--text-primary)]">
                  Forgot password
                </button>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}

              <button type="submit" disabled={loading} className="btn-primary h-13 w-full rounded-2xl">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-3 flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border-color)] bg-white font-semibold text-[var(--text-primary)] transition hover:bg-[#f7f7f4]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11.99 11.99 0 0 0 12 23Z" fill="#34A853" />
                <path d="M5.84 14.09A7.2 7.2 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A12 12 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l4.66-2.84Z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11.99 11.99 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="mt-5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <TimerReset className="h-4 w-4" />
              Session security and auth are powered by Firebase.
            </div>

            <p className="mt-6 text-sm text-[var(--text-muted)]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-[var(--text-primary)]">
                Create one
              </Link>
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  Live chat
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">Operator and client conversation stays central.</div>
              </div>
              <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Snowflake className="h-4 w-4" />
                  Dispatch layout
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">Same visual system on landing, auth, and app flows.</div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--bg-primary)]" />}>
      <LoginPageInner />
    </Suspense>
  );
}
