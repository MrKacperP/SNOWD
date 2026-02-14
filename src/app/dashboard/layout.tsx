"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import { WeatherProvider } from "@/context/WeatherContext";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

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

  return (
    <WeatherProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] transition-colors">
        <Navbar />
        {/* Main content with sidebar offset */}
        <main className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </WeatherProvider>
  );
}
