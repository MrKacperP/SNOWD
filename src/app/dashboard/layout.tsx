"use client";

import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";

import LoadingScreen from "@/components/LoadingScreen";
import Navbar from "@/components/Navbar";
import SupportChatButton from "@/components/SupportChatButton";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useAuth } from "@/context/AuthContext";
import { WeatherProvider } from "@/context/WeatherContext";
import { sendAdminNotif } from "@/lib/adminNotifications";
import { db,storage } from "@/lib/firebase";
import { doc,updateDoc } from "firebase/firestore";
import { getDownloadURL,ref,uploadBytes } from "firebase/storage";
import { ArrowLeft,Camera,CheckCircle,Shield } from "lucide-react";
import Link from "next/link";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import React,{ Suspense,useEffect,useRef,useState } from "react";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inConversation = pathname.startsWith("/dashboard/messages/");
  useEffect(() => {
    if (!inConversation || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const updateHeight = () => document.documentElement.style.setProperty("--conversation-height", `${viewport.height}px`);
    updateHeight();
    viewport.addEventListener("resize", updateHeight);
    return () => {
      viewport.removeEventListener("resize", updateHeight);
      document.documentElement.style.removeProperty("--conversation-height");
    };
  }, [inConversation]);
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

  const accountApproved = profile.role === "operator" ? profile.idVerified === true : profile.accountApproved !== false;
  const hasIdPhoto = !!(profile as unknown as Record<string, unknown>).idPhotoUrl;
  const isAdmin = profile.role === "admin" || profile.role === "employee";

  return (
    <WeatherProvider>
      <div className="dashboard-shell min-h-screen bg-[var(--bg-primary)] transition-colors">
        <a href="#dashboard-content" className="skip-link">Skip to main content</a>
        <div className={inConversation ? "hidden lg:contents" : "contents"}><Navbar key={pathname} /></div>
        <main id="dashboard-content" tabIndex={-1} className={inConversation ? "conversation-main flex h-dvh min-w-0 flex-col lg:ml-[248px]" : "min-h-screen min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-20 lg:ml-[248px] lg:pb-10 lg:pt-8"}>
          {!inConversation && isAdmin && (
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

          {!inConversation && pathname !== "/dashboard" && profile.role === "operator" && !canAcceptPlatformPayments(profile) && (
            <div className="container-app mb-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">{profile.idVerified ? "ID verified · Available for cash jobs" : "Verify your ID to go live for cash jobs"}</p>
                <p className="mt-1">Until Stripe setup is complete, customers can pay you in cash only. Set up Stripe to accept secure platform payments and bank payouts. Snowd receives a 15% commission on platform payments.</p>
                <Link href="/dashboard/settings?tab=payment" className="mt-3 inline-block font-semibold underline">Set up Stripe payments</Link>
              </div>
            </div>
          )}
          {!inConversation && pathname !== "/dashboard" && !accountApproved && !isAdmin && (
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
                    <div className="mt-3 flex flex-wrap items-center gap-3">
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
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] disabled:opacity-50"
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

          <div className={inConversation ? "flex min-h-0 flex-1" : "container-app mt-4 md:mt-6"}>{children}</div>
        </main>
        {!inConversation && <div className="hidden lg:block"><SupportChatButton /></div>}
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
