import { Redirect } from "expo-router";
import { useAuth } from "~/context/auth";

// Guarded screens fall back to this route, so it must only send people somewhere their guard allows.
// Always redirecting to /home bounced signed-out or not-yet-onboarded users between here and /home forever.
export default function Index() {
  const { user, profile } = useAuth();
  if (!user) return <Redirect href="/login" />;
  if (profile?.role === "admin" || user.email?.toLowerCase() === "kacperprymicz@gmail.com") return <Redirect href="/admin" />;
  if (!profile?.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
