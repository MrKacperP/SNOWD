"use client";
import OnboardingFlow from "@/components/OnboardingFlow";

// Local design check for the onboarding flow; nothing is saved.
export default function OnboardingReview() {
  return <OnboardingFlow onComplete={async () => { await new Promise(resolve => setTimeout(resolve, 600)); }} />;
}
