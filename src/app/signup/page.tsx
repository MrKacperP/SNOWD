"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowRight, CheckCircle, Shield, Snowflake } from "lucide-react";
import { motion } from "framer-motion";

export default function SignUpPage() {
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

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

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);

    try {
      const googleUser = await signInWithGoogle();
      await checkExistingProfile(googleUser.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign up with Google";
      if (!msg.includes("popup-closed")) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-[rgba(47,111,237,0.12)] blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[rgba(255,184,77,0.1)] blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid md:grid-cols-[1.1fr_1fr] gap-6">
          <motion.div
            className="rounded-3xl p-8 md:p-10 bg-[var(--card)] border border-[var(--border)] shadow-[var(--glass-shadow)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center">
                <Snowflake className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-[var(--accent)] leading-none">snowd</p>
                <p className="text-xs text-[var(--text-muted)]">Student snow crew</p>
              </div>
            </Link>

            <h1 className="text-3xl md:text-4xl font-bold font-headline text-[var(--text-primary)] mb-3">Create your account</h1>
            <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-sm">
              Start with Google, then complete onboarding to set your profile and preferences.
            </p>

            <div className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Quick setup for clients and operators
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Local matching based on your location
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Secure in-app messaging and payments
              </div>
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl p-8 bg-[var(--card)] border border-[var(--border)] shadow-[var(--glass-shadow)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className="text-left mb-5">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Sign up with Google</h2>
              <p className="text-[var(--text-muted)] text-sm mt-1">Google is the only supported sign-up method.</p>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-[var(--bg-secondary)] hover:bg-white border border-[var(--border)] rounded-2xl transition-all duration-200 group disabled:opacity-50"
            >
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)]">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[var(--text-primary)] font-semibold text-sm">{loading ? "Connecting..." : "Continue with Google"}</p>
                <p className="text-[var(--text-muted)] text-xs">Create your account with Google</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition" />
            </button>

            <p className="text-[var(--text-muted)] text-xs text-center mt-4">
              <Shield className="w-3 h-3 inline mr-1" />
              We use secure Google authentication
            </p>

            <motion.p
              className="text-center mt-6 text-sm text-[var(--text-muted)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--accent)] font-semibold hover:text-[var(--accent-dark)] transition">
                Sign in
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
