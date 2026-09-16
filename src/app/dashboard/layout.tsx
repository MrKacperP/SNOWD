"use client";

import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";

import Notification from "@/components/Notification";
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
import { ArrowLeft,Camera,Shield } from "lucide-react";
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
    const updateHeight = () => {
      document.documentElement.style.setProperty("--conversation-height", `${viewport.height}px`);
      document.documentElement.style.setProperty("--conversation-top", `${viewport.offsetTop}px`);
    };
    updateHeight();
    viewport.addEventListener("resize", updateHeight);
    viewport.addEventListener("scroll", updateHeight);
    return () => {
      viewport.removeEventListener("resize", updateHeight);
      viewport.removeEventListener("scroll", updateHeight);
      document.documentElement.style.removeProperty("--conversation-top");
      document.documentElement.style.removeProperty("--conversation-height");
    };
  }, [inConversation]);
  const [uploadError, setUploadError] = useState("");
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
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
        setUploadError("Choose a clear JPG, PNG, or WebP image under 10 MB.");
        return;
      }
      const storageRef = ref(storage, `verification/${user.uid}/id-photo`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.uid), {
        idPhotoUrl: downloadURL,
        idVerified: false,
        accountApproved: false,
        verificationStatus: "pending",
        verificationNote: "",
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
      setUploadError("Failed to upload ID. Please try again.");
    } finally {
      setUploadingId(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <LoadingScreen />;

  const hasIdPhoto = !!(profile as unknown as Record<string, unknown>).idPhotoUrl;
  const isAdmin = profile.role === "admin" || profile.role === "employee";
  const requiresVerification = profile.role === "operator" && profile.idVerified !== true;
  const verificationRejected = profile.verificationStatus === "rejected";
  const verificationPending = hasIdPhoto && !verificationRejected;

  return (
    <WeatherProvider>
      {uploadError && <Notification message={uploadError} type="error" onClose={() => setUploadError("")} />}
      <div className={`dashboard-shell ${inConversation ? "conversation-shell" : "min-h-screen"} bg-[var(--bg-primary)] transition-colors`}>
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

          {requiresVerification && !isAdmin && (
            <section aria-label="Verification required" className={`${inConversation ? "shrink-0 px-3 pt-3" : "container-app mt-2 md:mt-0"}`}>
              <div className={`rounded-[1.4rem] border p-4 ${verificationRejected ? "border-red-300 bg-red-50 text-red-950" : verificationPending ? "border-amber-300 bg-amber-50 text-amber-950" : "border-blue-300 bg-blue-50 text-blue-950"}`}>
                <div className="flex items-start gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${verificationRejected ? "bg-red-100" : verificationPending ? "bg-amber-100" : "bg-blue-100"}`}>
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold">
                      {verificationRejected ? "Verification needs attention" : verificationPending ? "Verification submitted" : "Complete verification to use Snowd"}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed">
                      {verificationRejected
                        ? profile.verificationNote || "Review the feedback and submit a new government ID."
                        : verificationPending
                          ? "Your government ID is waiting for review. We’ll update your account after it has been checked."
                          : "Submit a clear government-issued ID before your profile can appear to customers or receive work orders."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {!verificationPending && (
                        <>
                          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleIdUpload} className="hidden" />
                          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingId} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            {uploadingId ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Camera className="h-4 w-4" />}
                            {uploadingId ? "Submitting…" : verificationRejected ? "Submit a new ID" : "Submit government ID"}
                          </button>
                        </>
                      )}
                      <Link href="/dashboard/settings?tab=verification" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                        {verificationPending ? "View verification status" : "Open verification settings"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {!inConversation && pathname !== "/dashboard" && profile.role === "operator" && !canAcceptPlatformPayments(profile) && (
            <div className="container-app mb-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">{profile.idVerified ? "ID verified · Available for cash jobs" : "Verify your ID to go live for cash jobs"}</p>
                <p className="mt-1">Until Stripe setup is complete, customers can pay you in cash only. Set up Stripe to accept secure platform payments and bank payouts.</p>
                <Link href="/dashboard/settings?tab=payment" className="mt-3 inline-block font-semibold underline">Set up Stripe payments</Link>
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
