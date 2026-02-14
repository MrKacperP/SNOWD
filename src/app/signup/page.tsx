"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import Image from "next/image";

export default function SignUpPage() {
  const { user, profile, loading: authLoading, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-redirect if user already has a completed profile
  useEffect(() => {
    if (!authLoading && user && profile?.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, profile, router]);

  const checkExistingProfile = async (uid: string): Promise<boolean> => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      return docSnap.exists() && docSnap.data()?.onboardingComplete === true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const newUser = await signUp(email, password);
      const hasProfile = await checkExistingProfile(newUser.uid);
      if (hasProfile) {
        router.replace("/dashboard");
        return;
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("snowd_signup_name", name);
        sessionStorage.setItem("snowd_signup_uid", newUser.uid);
      }
      router.push("/onboarding");
    } catch (err: unknown) {
      // If the email already exists, try to sign in instead
      if (err instanceof Error && err.message.includes("auth/email-already-in-use")) {
        try {
          const signInResult = await signInWithEmailAndPassword(auth, email, password);
          const hasProfile = await checkExistingProfile(signInResult.user.uid);
          if (hasProfile) {
            router.replace("/dashboard");
          } else {
            router.push("/onboarding");
          }
          return;
        } catch (signInError) {
          setError("This email is already registered. Please check your password or use the login page.");
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : "Failed to create account";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      const hasProfile = await checkExistingProfile(googleUser.uid);
      if (hasProfile) {
        router.replace("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign up with Google";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo.svg" alt="snowd.ca" width={40} height={40} />
            <span className="text-3xl font-bold text-[#4361EE]">snowd</span>
            <span className="text-3xl font-light text-[#6B7C8F]">.ca</span>
          </Link>
          <p className="text-[#6B7C8F] mt-2">Create your account to get started.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#E6EEF6] p-8">
          {error && (
            <div className="mb-4 p-3 bg-[#EB5757]/10 border border-[#EB5757]/20 text-[#EB5757] rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7C8F]" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required className="w-full pl-11 pr-4 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#4361EE]/25 focus:border-[#4361EE] outline-none transition text-[#0B1F33] placeholder:text-[#6B7C8F]" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7C8F]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required className="w-full pl-11 pr-4 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#4361EE]/25 focus:border-[#4361EE] outline-none transition text-[#0B1F33] placeholder:text-[#6B7C8F]" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7C8F]" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required className="w-full pl-11 pr-12 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#4361EE]/25 focus:border-[#4361EE] outline-none transition text-[#0B1F33] placeholder:text-[#6B7C8F]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7C8F] hover:text-[#4361EE] transition">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7C8F]" />
                <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required className="w-full pl-11 pr-4 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#4361EE]/25 focus:border-[#4361EE] outline-none transition text-[#0B1F33] placeholder:text-[#6B7C8F]" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#4361EE] text-white rounded-xl font-semibold hover:bg-[#1e5ba8] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed btn-lift shadow-sm mt-2">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#E6EEF6]" />
            <span className="px-4 text-sm text-[#6B7C8F]">or</span>
            <div className="flex-1 border-t border-[#E6EEF6]" />
          </div>

          <button onClick={handleGoogleSignUp} disabled={loading} className="w-full py-3.5 border-2 border-[#E6EEF6] rounded-xl font-medium hover:bg-[#F7FAFC] transition flex items-center justify-center gap-2 disabled:opacity-50 text-[#0B1F33]">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-sm text-[#6B7C8F] mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#4361EE] font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
