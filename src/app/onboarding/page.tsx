"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { sendAdminNotif } from "@/lib/adminNotifications";
import OnboardingFlow, {
  type OnboardingDraft,
} from "@/components/OnboardingFlow";

export default function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
    else if (profile?.onboardingComplete) router.replace("/dashboard");
  }, [loading, user, profile, router]);

  const complete = async (draft: OnboardingDraft) => {
    if (!user || !draft.role) throw new Error("Please sign in again.");
    const {
      role,
      phone,
      propertySize,
      serviceTypes,
      specialInstructions,
      businessName,
      isStudent,
      bio,
      equipment,
      serviceRadius,
      operatorServiceTypes,
    } = draft;
    const { address, city, province, postalCode, lat, lng } = draft.location;
    const age = draft.age ? Number(draft.age) : undefined;
    const price = (value: string, fallback: number) =>
      /^\d+(\.\d{1,2})?$/.test(value) &&
      Number(value) > 0 &&
      Number(value) <= 10000
        ? Number(value)
        : fallback;
    const pricingSmall = price(draft.pricingSmall, 25),
      pricingMedium = price(draft.pricingMedium, 40),
      pricingLarge = price(draft.pricingLarge, 60),
      pricingWalkway = price(draft.pricingWalkway, 15),
      pricingSidewalk = price(draft.pricingSidewalk, 15);
    const displayName = user.displayName || "User";
    const normalizedEmail = (user.email || "").trim().toLowerCase();
    let deletedAccountIds: string[] = [];
    try {
      const accountHistorySnap = await getDoc(
        doc(db, "accountHistory", encodeURIComponent(normalizedEmail)),
      );
      if (accountHistorySnap.exists()) {
        deletedAccountIds =
          (accountHistorySnap.data().deletedAccountIds as
            string[] | undefined) || [];
      }
    } catch (historyError) {
      // Account history is optional; it must never prevent a new profile from being created.
      console.warn("Could not load account history:", historyError);
    }

    const baseProfile = {
      uid: user.uid,
      email: user.email || "",
      accountNumber: deletedAccountIds.length + 1,
      displayName,
      phone,
      role: role!,
      createdAt: new Date(),
      onboardingComplete: true,
      province,
      city,
      postalCode,
      address,
      isOnline: true,
      themePreference: "system" as const,
      age: age || null,
      lat: lat ?? null,
      lng: lng ?? null,
    };

    if (role === "client") {
      // Clients get immediate access — no verification needed
      await setDoc(doc(db, "users", user.uid), {
        ...baseProfile,
        accountApproved: true,
        idVerified: true,
        verificationStatus: "approved",
        simplifiedMode: !!(age && age >= 55),
        propertyDetails: {
          propertySize,
          serviceTypes,
          specialInstructions,
        },
        savedOperators: [],
        jobHistory: [],
      });
    } else {
      // Operators must be verified by admin before going public
      await setDoc(doc(db, "users", user.uid), {
        ...baseProfile,
        accountApproved: false,
        idVerified: false,
        verificationStatus: "not-submitted",
        businessName,
        isStudent,
        bio,
        equipment,
        serviceRadius,
        serviceTypes: operatorServiceTypes,
        pricing: {
          driveway: {
            small: pricingSmall,
            medium: pricingMedium,
            large: pricingLarge,
          },
          walkway: pricingWalkway,
          sidewalk: pricingSidewalk,
        },
        rating: 0,
        reviewCount: 0,
        verified: false,
        availability: {},
        activeJobs: [],
        completedJobs: 0,
      });
    }

    await refreshProfile();
    void sendAdminNotif({
      type: "profile_saved",
      message: `New ${role} profile created: ${displayName} (${city}, ${province})`,
      uid: user.uid,
      meta: {
        name: displayName,
        email: user.email || "",
        role,
        city,
        province,
        address,
      },
    });
    try {
      sessionStorage.removeItem("snowd_signup_name");
      sessionStorage.removeItem("snowd_signup_uid");
      sessionStorage.removeItem("snowd_signup_postal");
      localStorage.removeItem(`snowd_onboarding_draft_${user.uid}`);
    } catch {
      /* Browser storage is optional. */
    }
    router.replace("/dashboard");
  };
  if (loading || !user || profile?.onboardingComplete)
    return (
      <main
        role="status"
        className="flex min-h-dvh items-center justify-center bg-[#f3f8fb] text-[#061321]"
      >
        Getting your account ready…
      </main>
    );
  return (
    <OnboardingFlow
      key={user.uid}
      draftKey={`snowd_onboarding_v2_${user.uid}`}
      onComplete={complete}
    />
  );
}
