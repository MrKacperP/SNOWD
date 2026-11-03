import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ClientProfile, OperatorProfile, UserProfile } from "@/lib/types";
import { auth, db } from "~/lib/firebase";

/** One shape for every role: shared fields plus whichever client or operator fields are present. */
export type Profile = (UserProfile & Partial<Omit<ClientProfile, "role">> & Partial<Omit<OperatorProfile, "role">>) | null;

type AuthState = {
  user: User | null;
  profile: Profile;
  /** True until both the session and the profile document have loaded. */
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (next) => {
      stopProfile?.();
      setUser(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const ref = doc(db, "users", next.uid);
      stopProfile = onSnapshot(
        ref,
        (snap) => {
          const data = snap.exists() ? ({ ...snap.data(), uid: snap.id } as Profile) : null;
          setProfile(data);
          setLoading(false);
          if (data && data.isOnline !== true) void updateDoc(ref, { isOnline: true }).catch(() => {});
        },
        () => {
          setProfile(null);
          setLoading(false);
        },
      );
    });
    return () => {
      stopAuth();
      stopProfile?.();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      signInWithEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signUpWithEmail: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      },
      signInWithApple: async () => {
        // Apple signs a hash of the nonce; Firebase checks it against the raw value.
        const rawNonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
        const apple = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });
        if (!apple.identityToken) throw new Error("Apple did not return a sign-in token. Please try again.");
        const credential = new OAuthProvider("apple.com").credential({ idToken: apple.identityToken, rawNonce });
        const result = await signInWithCredential(auth, credential);
        // Apple shares the name only on the very first sign-in, so keep it.
        const fullName = [apple.fullName?.givenName, apple.fullName?.familyName].filter(Boolean).join(" ");
        if (fullName && !result.user.displayName) await updateProfile(result.user, { displayName: fullName });
      },
      signInWithGoogleToken: async (idToken) => {
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim());
      },
      signOut: async () => {
        if (user) await updateDoc(doc(db, "users", user.uid), { isOnline: false }).catch(() => {});
        await firebaseSignOut(auth);
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function friendlyAuthError(error: unknown) {
  const code = (error as { code?: string })?.code || "";
  if (code === "ERR_REQUEST_CANCELED") return "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "That email and password don’t match. Try again or reset your password.";
  if (code.includes("email-already-in-use")) return "An account already uses this email. Sign in instead.";
  if (code.includes("weak-password")) return "Use at least 6 characters for your password.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("network")) return "You appear to be offline. Check your connection and try again.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a minute and try again.";
  return error instanceof Error ? error.message : "Sign-in failed. Please try again.";
}
