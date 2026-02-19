"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import SupportChatButton from "@/components/SupportChatButton";
import { WeatherProvider } from "@/context/WeatherContext";
import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Upload, Shield, CheckCircle, Camera } from "lucide-react";
import TutorialOverlay from "@/components/TutorialOverlay";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { sendAdminNotif } from "@/lib/adminNotifications";

function isProfileComplete(profile: { avatar?: string; phone?: string; address?: string; email?: string } | null | undefined) {
  if (!profile) return false;
  return !!(profile.avatar && profile.phone && profile.address && profile.email);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [uploadingId, setUploadingId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!profile?.onboardingComplete) {
        router.push("/onboarding");
      }
    }
  }, [user, profile, loading, router]);

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    setUploadingId(true);
    try {
      const storageRef = ref(storage, `id-documents/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.uid), {
        idPhotoUrl: downloadURL,
        updatedAt: new Date(),
      });
      sendAdminNotif({
        type: "document_uploaded",
        message: `ID document uploaded by ${profile?.displayName || user.email}`,
        uid: user.uid,
        meta: { name: profile?.displayName || "", email: user.email || "" },
      });
      await refreshProfile();
    } catch (error) {
      console.error("Error uploading ID:", error);
      alert("Failed to upload ID. Please try again.");
    } finally {
      setUploadingId(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <LoadingScreen />;

  const incomplete = !isProfileComplete(profile) && profile.role !== "admin";
  const onProfilePage = pathname === "/dashboard/profile";
  const accountApproved = (profile as unknown as Record<string, unknown>).accountApproved !== false;
  const hasIdPhoto = !!(profile as unknown as Record<string, unknown>).idPhotoUrl;
  const isAdmin = profile.role === "admin" || profile.role === "employee";

  return (
    <WeatherProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] transition-colors">
        <Navbar />
        {/* Main content with sidebar offset */}
        <main className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
          {/* Account Approval Banner */}
          {!accountApproved && !isAdmin && (
            <div className="mx-4 md:mx-8 mt-4 md:mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 text-base">Account Pending Approval</h3>
                  <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                    Your account is being reviewed by our team. To speed up the process, please upload a valid government-issued ID.
                  </p>
                  {!hasIdPhoto ? (
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleIdUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingId}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {uploadingId ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        {uploadingId ? "Uploading..." : "Upload Government ID"}
                      </button>
                      <span className="text-xs text-blue-500">Driver&apos;s license, passport, or health card</span>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 font-medium">ID uploaded — awaiting admin review</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile completeness banner */}
          {incomplete && !onProfilePage && accountApproved && (
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
