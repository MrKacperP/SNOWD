"use client";
import { useState } from "react";
import { useNativeApp } from "@/hooks/useNativeApp";
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "@/components/SimpleAuth.module.css";
import { nativePlatform, nativeSignIn } from "@/lib/native";

export default function AppleSignInButton({ onSuccess, disabled = false }: { disabled?: boolean; onSuccess?: (uid: string) => void | Promise<void> }) {
  const native = useNativeApp();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div className="mt-3"><button type="button" disabled={busy || disabled} onClick={async () => {
    setBusy(true); setError("");
    try { const provider = new OAuthProvider("apple.com"); provider.addScope("email"); provider.addScope("name"); const result = native && nativePlatform() === "ios" ? await nativeSignIn("apple") : await signInWithPopup(auth, provider); await onSuccess?.(result.user.uid); } catch { setError("Apple sign-in didn’t finish. Try again or use Google."); }
    finally { setBusy(false); }
  }} className={styles.social}>
    <svg width="18" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c.03 3.21 2.82 4.28 2.85 4.29-.02.08-.45 1.53-1.48 3.03-.9 1.3-1.84 2.6-3.31 2.63-1.44.03-1.91-.85-3.56-.85-1.64 0-2.16.82-3.52.88-1.42.05-2.5-1.41-3.41-2.71C2.77 17.15 1.36 12.3 3.26 9c.94-1.64 2.63-2.68 4.46-2.71 1.4-.03 2.72.94 3.57.94.85 0 2.44-1.16 4.1-.99.69.03 2.63.28 3.87 2.1-.1.06-2.31 1.34-2.21 4.2ZM14.35 4.47c.76-.92 1.27-2.2 1.13-3.47-1.1.05-2.43.73-3.22 1.65-.71.82-1.34 2.13-1.17 3.38 1.23.1 2.49-.63 3.26-1.56Z"/></svg>
    {busy ? "Signing in…" : "Continue with Apple"}
  </button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
