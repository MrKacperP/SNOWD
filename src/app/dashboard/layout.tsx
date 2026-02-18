"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import SupportChatButton from "@/components/SupportChatButton";
import { WeatherProvider } from "@/context/WeatherContext";
import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import TutorialOverlay from "@/components/TutorialOverlay";

function isProfileComplete(profile: { avatar?: string; phone?: string; address?: string; email?: string } | null | undefined) {
  if (!profile) return false;
  return !!(profile.avatar && profile.phone && profile.address && profile.email);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!profile?.onboardingComplete) {
        router.push("/onboarding");
      }
    }
  }, [user, profile, loading, router]);

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <LoadingScreen />;

  const incomplete = !isProfileComplete(profile) && profile.role !== "admin";
  const onProfilePage = pathname === "/dashboard/profile";

  return (
    <WeatherProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] transition-colors">
        <Navbar />
        {/* Main content with sidebar offset */}
        <main className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
          {/* Profile completeness banner */}
          {incomplete && !onProfilePage && (
            <div className="mx-4 md:mx-8 mt-4 md:mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Complete your profile to be visible</p>
                <p className="text-xs text-amber-600 mt-0.5">Add a profile photo, phone number, email, and address to show up in search results.</p>
              </div>
              <Link href="/dashboard/profile" className="shrink-0 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition">
                Complete →
              </Link>
            </div>
          )}
          <div className="p-4 md:p-8">{children}</div>
        </main>
        <SupportChatButton />
        <TutorialOverlay />
      </div>
    </WeatherProvider>
  );
}

