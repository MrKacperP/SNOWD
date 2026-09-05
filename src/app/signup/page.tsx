"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthPageShell from "@/components/AuthPageShell";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  "Choose homeowner or operator.",
  "Find your address in one search.",
  "Pick your services. You’re ready to go.",
];

export default function SignUpPage() {
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(
        profile?.onboardingComplete ? "/dashboard" : "/onboarding",
      );
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
    setError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await checkExistingProfile(googleUser.uid);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to sign up with Google";
      if (!msg.includes("popup-closed")) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <AuthPageShell
      eyebrow="guided setup"
      title="start clearing"
      body="Less setup. More snow days. A little help for your home, or your next opportunity to earn."
      features={steps}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <div className="rounded-[1.35rem] border-[3px] border-[#061321] bg-white p-4 shadow-[5px_5px_0_#061321] sm:p-5 lg:p-6">
          <div className="inline-flex rounded-full bg-[#ff820e] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]">
            Create account
          </div>
          <h2 className="mt-3 font-headline text-[clamp(2rem,7vw,3rem)] font-black lowercase leading-none">
            Your snow day starts here<span className="text-[#ff820e]">.</span>
          </h2>
          <p className="mt-2 text-sm font-bold leading-5 text-[#061321]/62 sm:text-base">
            One click to join. Then three quick steps to make snowd yours.
          </p>

          <div className="mt-4 space-y-3">
            {error ? (
              <div className="rounded-2xl border-[3px] border-red-700 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border-[3px] border-[#061321] bg-[#061321] px-5 text-base font-black text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-55 sm:min-h-13"
            >
              {loading ? "Connecting..." : "Continue with Google"}{" "}
              {!loading ? (
                <ArrowRight className="ml-2 h-5 w-5" strokeWidth={3} />
              ) : null}
            </button>
          </div>

          <div className="mt-3 rounded-2xl border-[3px] border-[#061321] bg-[#dfeef8] p-3">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[#ff820e]"
                strokeWidth={3}
              />
              <p className="text-xs font-black leading-4 text-[#061321]/72 sm:text-sm sm:leading-5">
                No password to remember. Use your Google account to get started.
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm font-bold text-[#061321]/62">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-black text-[#061321] underline decoration-[#ff820e] decoration-4 underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </AuthPageShell>
  );
}
