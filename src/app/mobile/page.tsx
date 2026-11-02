"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/** Native app entry point: sends people to the same signup, onboarding and dashboard flow as the web. */
export default function MobileWelcome() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(!user ? "/signup" : profile?.onboardingComplete ? "/dashboard" : "/onboarding");
  }, [user, profile, loading, router]);

  return <main className="native-page" role="status">Getting your account ready…</main>;
}
