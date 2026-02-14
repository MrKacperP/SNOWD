"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const { user, profile, loading: authLoading, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Auto-redirect if already logged in with completed profile
  useEffect(() => {
    if (!authLoading && user && profile?.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, profile, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkProfileAndRedirect = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists() && docSnap.data()?.onboardingComplete) {
        router.replace("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch {
      router.push("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await checkProfileAndRedirect(googleUser.uid);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && profile?.onboardingComplete) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <Image src="/logo.svg" alt="snowd.ca" width={40} height={40} />
            <span className="text-3xl font-bold text-[#4361EE]">snowd</span>
            <span className="text-3xl font-light text-[#6B7C8F]">.ca</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#0B1F33] tracking-tight">Welcome back</h1>
          <p className="text-[#6B7C8F] mt-2">Snow cleared in minutes.</p>
        </div>

        {/* Card */}
        <Card variant="glacier" padding="lg">
          {error && (
            <div className="mb-5 p-4 bg-[#EB5757]/10 border border-[#EB5757]/20 text-[#EB5757] rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="w-5 h-5" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[42px] text-[#6B7C8F] hover:text-[#4361EE] transition-colors duration-150"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-6"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E6EEF6]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-[#6B7C8F]">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mt-6"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </div>
            </Button>
          </div>
        </Card>

        <p className="text-center mt-6 text-sm text-[#6B7C8F]">
          Don't have an account?{" "}
          <Link href="/signup" className="text-[#4361EE] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
