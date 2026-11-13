import { useLocalSearchParams, useRouter } from "expo-router";
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";
import { Loading } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";

/**
 * Opened from an invite link or QR code (snowd://invite/<uid>). A shoveler's invite saves them to
 * your shovelers and opens their profile to book; anyone else's opens their profile.
 */
export default function InviteLanding() {
  const { uid: inviter } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!inviter || !user) return;
    if (inviter === user.uid) {
      router.replace("/settings/clients");
      return;
    }
    void (async () => {
      const snap = await getDoc(doc(db, "users", inviter)).catch(() => null);
      const role = snap?.exists() ? (snap.data().role as string) : "";
      if (role === "operator") {
        // Customers keep the shoveler who invited them, ready to book.
        if (profile?.role !== "operator") void updateDoc(doc(db, "users", user.uid), { savedOperators: arrayUnion(inviter) }).catch(() => {});
        router.replace(`/operator/${inviter}`);
      } else router.replace(snap?.exists() ? `/person/${inviter}` : "/home");
    })();
  }, [inviter, user, profile?.role, router]);

  return <Loading message="Opening your invite…" />;
}
