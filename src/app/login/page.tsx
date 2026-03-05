"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowRight, CheckCircle, Shield } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_EMAILS = ["kacperprymicz@gmail.com"];

export default function LoginPage() {
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#a3d5f7] to-[#e0f2ff] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/30 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-white/30 blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid md:grid-cols-[1.1fr_1fr] gap-6">
          <motion.div
            className="rounded-3xl p-8 md:p-10 bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <Image src="/logo.png" alt="snowd logo" width={44} height={44} className="rounded-full" />
              <div className="text-left">
                <p className="text-lg font-bold text-blue-600 leading-none">snowd</p>
                <p className="text-xs text-gray-500">Student snow crew</p>
              </div>
            </Link>

            <h1 className="text-3xl md:text-4xl font-bold font-headline text-gray-800 mb-3">Welcome back</h1>
            <p className="text-gray-600 text-sm md:text-base max-w-sm">
              Sign in to your account and continue managing jobs, chats, and payouts.
            </p>

            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Verified community of local operators and clients
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Real-time messaging and status updates
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Fast secure payouts with full tracking
              </div>
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl p-8 bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className="text-left mb-5">
              <h2 className="text-xl font-bold text-gray-800">Sign in</h2>
              <p className="text-gray-500 text-sm mt-1">The only supported sign-in method is Google.</p>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all duration-200 group disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-semibold text-base">{loading ? "Connecting..." : "Sign in with Google"}</span>
            </button>

            <p className="text-gray-500 text-xs text-center mt-4">
              <Shield className="w-3 h-3 inline mr-1" />
              Secure authentication via Google OAuth.
            </p>

            <motion.p
              className="text-center mt-6 text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              New to snowd?{" "}
              <Link href="/signup" className="text-blue-600 font-semibold hover:text-blue-700 transition">
                Create an account
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
