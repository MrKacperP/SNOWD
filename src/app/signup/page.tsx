"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, Snowflake, MessageCircle, PhoneCall, Mail, Globe, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SignUpPage() {
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const [previewPostalCode, setPreviewPostalCode] = useState("");

  const normalizePostalCode = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  const formatPostalCode = (value: string) => {
    const normalized = normalizePostalCode(value);
    if (normalized.length <= 3) return normalized;
    return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
  };

  const isValidCanadianPostalCode = (value: string) =>
    /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(value.trim().toUpperCase());

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
      setError("Please enter a valid postal code (e.g. K1A 0B1).");
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
      if (!msg.includes("popup-closed")) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen bg-[#EEF3FA]">
      <div className="min-h-screen grid lg:grid-cols-[minmax(520px,560px)_minmax(0,1fr)]">
        <section className="px-6 sm:px-10 py-8 lg:py-12 flex items-center justify-center">
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

            <h1 className="text-[42px] leading-[1.05] font-headline font-bold text-[#101B2D]">Create account</h1>
            <p className="mt-2 text-[#5B6B84]">Start with your name and postal code, then continue to guided onboarding.</p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="text-[15px] font-semibold text-[#1C2B43]">Full name</label>
                <input
                  type="text"
                  value={previewName}
                  onChange={(e) => {
                    setPreviewName(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Alex Johnson"
                  className="mt-2 w-full h-12 rounded-xl border border-[#D2DBE7] bg-white px-4 text-[#101B2D] outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="text-[15px] font-semibold text-[#1C2B43]">Postal code</label>
                <input
                  type="text"
                  value={previewPostalCode}
                  onChange={(e) => {
                    setPreviewPostalCode(formatPostalCode(e.target.value));
                    if (error) setError("");
                  }}
                  placeholder="K1A 0B1"
                  className="mt-2 w-full h-12 rounded-xl border border-[#D2DBE7] bg-white px-4 text-[#101B2D] outline-none focus:border-[#2F6FED]"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#2F6FED] hover:bg-[#2158C7] text-white font-semibold transition disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Continue with Google"}
              </button>
            </div>

            <p className="text-xs text-[#6D7E95] mt-4 inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Secure signup powered by Firebase Auth.
            </p>

            <p className="mt-6 text-sm text-[#5B6B84]">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#2F6FED] hover:text-[#2158C7]">
                Log in
              </Link>
            </p>
          </motion.div>
        </section>

        <section className="hidden lg:flex relative overflow-hidden bg-[linear-gradient(145deg,#8AB6FF_0%,#5E8FE8_36%,#4577D8_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.38),transparent_40%),radial-gradient(circle_at_10%_80%,rgba(255,255,255,0.2),transparent_35%)]" />
          <div className="absolute top-16 left-16 text-white/50"><MessageCircle className="w-10 h-10" /></div>
          <div className="absolute top-28 right-20 text-white/50"><PhoneCall className="w-9 h-9" /></div>
          <div className="absolute bottom-40 left-20 text-white/50"><Mail className="w-9 h-9" /></div>
          <div className="absolute bottom-20 right-24 text-white/50"><Globe className="w-10 h-10" /></div>

          <div className="relative z-10 w-full h-full flex items-center justify-center p-12">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-full max-w-[440px] rounded-[34px] bg-white/12 border border-white/30 backdrop-blur-md p-8"
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

              <div className="mt-10 flex items-center gap-2 text-white/80 text-sm">
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
