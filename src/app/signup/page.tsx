"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, MapPin, Shield, Snowflake, UserRound } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  "Start with your name and service area.",
  "Continue through guided setup for client or operator details.",
  "Land in the same booking and messaging system used every day.",
];

export default function SignUpPage() {
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [previewPostalCode, setPreviewPostalCode] = useState("");

  const normalizePostalCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const formatPostalCode = (value: string) => {
    const normalized = normalizePostalCode(value);
    return normalized.length <= 3 ? normalized : `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
  };
  const isValidCanadianPostalCode = (value: string) => /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(value.trim().toUpperCase());

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

  const handleGoogleSignUp = async () => {
    const trimmedName = previewName.trim();
    const formattedPostal = formatPostalCode(previewPostalCode);

    if (!trimmedName) {
      setError("Please enter your name to continue.");
      return;
    }
    if (!isValidCanadianPostalCode(formattedPostal)) {
      setError("Please enter a valid postal code like K1A 0B1.");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("snowd_signup_name", trimmedName);
      sessionStorage.setItem("snowd_signup_postal", formattedPostal);
    }

    setError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await checkExistingProfile(googleUser.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign up with Google";
      if (!msg.includes("popup-closed")) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-dvh px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1400px] overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-white shadow-[0_30px_90px_rgba(18,18,18,0.12)] lg:grid-cols-[minmax(0,0.95fr)_minmax(460px,520px)]">
        <section className="map-shell hidden p-8 lg:block">
          <div className="flex h-full flex-col justify-between rounded-[2rem] bg-white/70 p-7">
            <div>
              <div className="chip">
                <Snowflake className="h-4 w-4 text-[var(--accent-sun)]" />
                Guided setup
              </div>
              <h1 className="mt-6 max-w-lg text-5xl font-headline font-bold leading-none">
                Start with a faster, clearer winter service setup<span className="text-[var(--accent-sun)]">.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[var(--text-muted)]">
                Create an account, confirm your service area, and move directly into the live snow service flow without extra steps.
              </p>
            </div>

            <div className="grid gap-4">
              {steps.map((item, index) => (
                <div key={item} className="rounded-[1.5rem] bg-white px-5 py-4 shadow-[0_16px_30px_rgba(18,18,18,0.08)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-medium text-[var(--text-secondary)]">{item}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#111111] px-6 py-6 text-white md:px-9 md:py-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/logo.png" alt="snowd logo" width={36} height={36} />
            <span className="text-2xl font-headline font-bold">snowd<span className="text-[var(--accent-sun)]">.</span></span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto mt-10 w-full max-w-[440px]"
          >
            <div className="chip border border-white/10 bg-white/8 text-white">
              <Shield className="h-4 w-4 text-[var(--accent-sun)]" />
              Create account
            </div>
            <h2 className="mt-6 text-4xl font-headline font-bold leading-none">Set up your marketplace profile<span className="text-[var(--accent-sun)]">.</span></h2>
            <p className="mt-4 text-base leading-7 text-white/68">
              Add the basics now, then continue to guided onboarding for service details, communication setup, and booking preferences.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Full name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="text"
                    value={previewName}
                    onChange={(e) => {
                      setPreviewName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Alex Johnson"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-white/8 pl-11 pr-4 text-white outline-none transition placeholder:text-white/35 focus:border-white/28"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Postal code</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="text"
                    value={previewPostalCode}
                    onChange={(e) => {
                      setPreviewPostalCode(formatPostalCode(e.target.value));
                      if (error) setError("");
                    }}
                    placeholder="K1A 0B1"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-white/8 pl-11 pr-4 text-white outline-none transition placeholder:text-white/35 focus:border-white/28"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
              ) : null}

              <button onClick={handleGoogleSignUp} disabled={loading} className="btn-primary h-13 w-full rounded-2xl bg-white text-black hover:bg-white/92">
                {loading ? "Connecting..." : "Continue with Google"}
              </button>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/7 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-sun)]" />
                <p className="text-sm leading-6 text-white/76">
                  Your name and postal code are saved locally so onboarding can open in the right city and service flow.
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm text-white/65">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-white">
                Log in
              </Link>
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
