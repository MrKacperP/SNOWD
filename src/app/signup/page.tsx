"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthPageShell from "@/components/AuthPageShell";
import { ArrowRight, CheckCircle2, MapPin, UserRound } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  "Start with your name and Canadian service area.",
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
    <AuthPageShell
      eyebrow="guided setup"
      title="start clearing"
      body="Create an account, confirm your service area, and move directly into the live snow service flow."
      features={steps}
    >
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full">
        <div className="rounded-[1.35rem] border-[3px] border-[#061321] bg-white p-4 shadow-[5px_5px_0_#061321] sm:p-5 lg:p-6">
          <div className="inline-flex rounded-full bg-[#ff820e] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]">
            Create account
          </div>
          <h2 className="mt-3 font-headline text-[clamp(2rem,7vw,3rem)] font-black lowercase leading-none">
            Set up your profile<span className="text-[#ff820e]">.</span>
          </h2>
          <p className="mt-2 text-sm font-bold leading-5 text-[#061321]/62 sm:text-base">
            Add the basics now. We will use them to start onboarding in the right area.
          </p>

          <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-[#061321]/60">Full name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#061321]/38" strokeWidth={3} />
                  <input
                    type="text"
                    value={previewName}
                    onChange={(e) => {
                      setPreviewName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Alex Johnson"
                    className="h-12 w-full rounded-2xl border-[3px] border-[#061321] bg-[#f3f8fb] pl-12 pr-4 text-base font-bold text-[#061321] outline-none transition placeholder:text-[#061321]/35 focus:bg-white sm:h-13"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-[#061321]/60">Postal code</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#061321]/38" strokeWidth={3} />
                  <input
                    type="text"
                    value={previewPostalCode}
                    onChange={(e) => {
                      setPreviewPostalCode(formatPostalCode(e.target.value));
                      if (error) setError("");
                    }}
                    placeholder="K1A 0B1"
                    className="h-12 w-full rounded-2xl border-[3px] border-[#061321] bg-[#f3f8fb] pl-12 pr-4 text-base font-bold text-[#061321] outline-none transition placeholder:text-[#061321]/35 focus:bg-white sm:h-13"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border-[3px] border-red-700 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
              ) : null}

              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl border-[3px] border-[#061321] bg-[#061321] px-5 text-base font-black text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-55 sm:min-h-13"
              >
                {loading ? "Connecting..." : "Continue with Google"} {!loading ? <ArrowRight className="ml-2 h-5 w-5" strokeWidth={3} /> : null}
              </button>
            </div>

            <div className="mt-3 rounded-2xl border-[3px] border-[#061321] bg-[#dfeef8] p-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#ff820e]" strokeWidth={3} />
                <p className="text-xs font-black leading-4 text-[#061321]/72 sm:text-sm sm:leading-5">
                  Your location starts the right local service flow.
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm font-bold text-[#061321]/62">
              Already have an account?{" "}
              <Link href="/login" className="font-black text-[#061321] underline decoration-[#ff820e] decoration-4 underline-offset-4">
                Log in
              </Link>
            </p>
        </div>
      </motion.div>
    </AuthPageShell>
  );
}
