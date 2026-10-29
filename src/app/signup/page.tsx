"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { googleSignInError } from "@/lib/authErrors";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthPageShell from "@/components/AuthPageShell";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

function SignUpPageInner() {
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role");
  const selectedRole = role === "client" || role === "operator" ? role : null;
  const onboardingPath = selectedRole ? `/onboarding?role=${selectedRole}` : "/onboarding";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(
        profile?.onboardingComplete ? "/dashboard" : onboardingPath,
      );
    }
  }, [authLoading, user, profile, router, onboardingPath]);

  const checkExistingProfile = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists() && docSnap.data()?.onboardingComplete) {
        router.replace("/dashboard");
      } else {
        router.push(onboardingPath);
      }
    } catch {
      router.push(onboardingPath);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await checkExistingProfile(googleUser.uid);
    } catch (err: unknown) {
      setError(googleSignInError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <AuthPageShell>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <div className="rounded-[1.35rem] border-[3px] border-[#061321] bg-white p-4 shadow-[5px_5px_0_#061321] sm:p-5 lg:p-6">
          <h1 className="mt-3 font-headline text-[clamp(2rem,7vw,3rem)] font-black lowercase leading-none">
            Create your account<span className="text-[#ff820e]">.</span>
          </h1>
          <p className="mt-2 text-sm font-bold leading-5 text-[#061321]/62 sm:text-base">
            {selectedRole === "operator" ? "Set your services, prices, and service area." : selectedRole === "client" ? "Add your address to find nearby snow help." : "Find snow help or earn as a shoveler."}
          </p>

          <div className="mt-4 space-y-3">
            {error ? (
              <div role="alert" className="rounded-2xl border-[3px] border-red-700 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
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


          <p className="mt-3 text-sm font-bold text-[#061321]/62">
            Already have an account?{" "}
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center font-black text-[#061321] underline decoration-[#ff820e] decoration-4 underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </AuthPageShell>
  );
}

export default function SignUpPage() {
  return <Suspense fallback={<main role="status">Loading signup…</main>}><SignUpPageInner /></Suspense>;
}
