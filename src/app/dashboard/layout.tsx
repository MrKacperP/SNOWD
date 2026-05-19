"use client";

import React, { Suspense, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import SupportChatButton from "@/components/SupportChatButton";
import { WeatherProvider } from "@/context/WeatherContext";
import { useEffect } from "react";
import Link from "next/link";
import { Shield, CheckCircle, Camera, ArrowLeft } from "lucide-react";
import TutorialOverlay from "@/components/TutorialOverlay";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { sendAdminNotif } from "@/lib/adminNotifications";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [uploadingId, setUploadingId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        const query = searchParams.toString();
        const redirectPath = `${pathname}${query ? `?${query}` : ""}`;
        router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      } else if (!profile?.onboardingComplete) {
        router.push("/onboarding");
      }
    }
  }, [user, profile, loading, router, pathname, searchParams]);

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

  const accountApproved = (profile as unknown as Record<string, unknown>).accountApproved !== false;
  const hasIdPhoto = !!(profile as unknown as Record<string, unknown>).idPhotoUrl;
  const isAdmin = profile.role === "admin" || profile.role === "employee";

  return (
    <WeatherProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] transition-colors">
        <Navbar />
        <main className="min-h-screen pb-28 pt-20 md:ml-[288px] md:pb-10 md:pt-8">
          {isAdmin && (
            <div className="container-app mt-2 md:mt-0">
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-3">
              <Shield className="w-4 h-4 text-red-500 shrink-0" />
              <p className="flex-1 text-xs font-medium text-red-700">Admin mode — viewing live app</p>
              <Link
                href="/admin"
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Admin
              </Link>
              </div>
            </div>
          )}

          {!accountApproved && !isAdmin && (
            <div className="container-app mt-2 md:mt-0">
              <div className="rounded-[1.6rem] border border-blue-200 bg-blue-50 p-5">
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
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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
            </div>
          )}

          <div className="container-app mt-4 md:mt-6">{children}</div>
        </main>
        <SupportChatButton />
        <TutorialOverlay />
      </div>
    </WeatherProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
