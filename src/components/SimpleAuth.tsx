"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { browserLocalPersistence, ConfirmationResult, RecaptchaVerifier, sendPasswordResetEmail, setPersistence, signInWithCustomToken, signInWithPhoneNumber } from "firebase/auth";
import { QrCode } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AppleSignInButton from "@/components/native/AppleSignInButton";
import QrSignIn from "@/components/QrSignIn";
import styles from "./SimpleAuth.module.css";

export default function SimpleAuth() {
  const { user, profile, loading, signInWithGoogle, signInWithEmailPassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "password" | "code" | "qr">("start");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const rawRedirect = params.get("redirect") || "/dashboard";
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && !rawRedirect.includes("\\") ? rawRedirect : "/dashboard";
  const role = params.get("role");
  const onboarding = role === "client" || role === "operator" ? `/onboarding?role=${role}` : "/onboarding";
  useEffect(() => {
    if (!loading && user) router.replace(profile?.onboardingComplete ? profile.role === "admin" ? "/admin" : redirect : onboarding);
  }, [loading, user, profile, router, redirect, onboarding]);
  useEffect(() => () => { verifier.current?.clear(); }, []);

  async function run(action: () => Promise<unknown>) {
    setError(""); setNotice(""); setBusy(true);
    try { await action(); } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "auth/invalid-verification-code" ? "That code isn’t correct. Try again." : code === "auth/code-expired" || code === "auth/session-expired" ? "Your code expired. Request a new one." : code === "auth/too-many-requests" ? "Too many attempts. Please wait before trying again." : code === "auth/operation-not-allowed" ? "This sign-in option isn’t available yet. Please use another option." : code === "auth/invalid-phone-number" ? "Enter a valid phone number with its country code." : code === "auth/popup-closed-by-user" ? "Sign-in was cancelled. Try again when you’re ready." : "Couldn’t sign in. Check your details and try again.");
    } finally { setBusy(false); }
  }
  async function sendCode() {
    const cleaned = identifier.replace(/[\s().-]/g, "");
    const phone = /^\d{10}$/.test(cleaned) ? `+1${cleaned}` : /^1\d{10}$/.test(cleaned) ? `+${cleaned}` : cleaned;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) { setError("Enter a valid phone number. Include the country code outside Canada or the US."); return; }
    await setPersistence(auth, browserLocalPersistence);
    verifier.current?.clear();
    verifier.current = new RecaptchaVerifier(auth, "phone-recaptcha", { size: "invisible" });
    try {
      confirmation.current = await signInWithPhoneNumber(auth, phone, verifier.current);
      setStep("code"); setCode(""); setResendAt(Date.now() + 60000);
      setNotice(`We sent a code to ${phone}.`);
    } catch (err) { verifier.current?.clear(); verifier.current = null; throw err; }
  }
  return <main className={styles.page}>
    <section className={styles.panel} aria-label="Sign in to SNOWD">
      <Link href="/" className={styles.brand}>snowd<span>.ca</span></Link>
      {step !== "start" && <button className={styles.back} disabled={busy} onClick={() => { setStep("start"); setError(""); setNotice(""); }}>← Back</button>}
      <h1>{step === "code" ? "Enter your verification code" : step === "password" ? "Enter your password" : step === "qr" ? "Log in with your phone" : "What’s your phone number or email?"}</h1>
      {step === "qr" ? <QrSignIn onToken={token => signInWithCustomToken(auth, token).then(() => {})} /> : <form onSubmit={event => { event.preventDefault(); void run(async () => {
        if (step === "code") { await confirmation.current?.confirm(code); }
        else if (step === "password") { await signInWithEmailPassword(identifier.trim(), password); }
        else if (identifier.includes("@")) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) { setError("Enter a valid email address."); return; }
          setStep("password");
        } else { await sendCode(); }
      }); }}>
        {step === "start" && <input aria-label="Phone number or email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Enter phone number or email" required />}
        {step === "password" && <><p className={styles.hint}>{identifier}</p><input aria-label="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required autoFocus /></>}
        {step === "code" && <input aria-label="Six-digit verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" required autoFocus />}
        <button className={styles.primary} disabled={busy} type="submit">{busy ? "Please wait…" : step === "code" ? "Verify and continue" : "Continue"}</button>
        {step === "password" && <button type="button" className={styles.back} disabled={busy} onClick={() => void run(async () => { await sendPasswordResetEmail(auth, identifier.trim()); setNotice("If this email has an account, a reset link is on its way."); })}>Forgot password?</button>}
        {step === "password" && <p className={styles.hint}>New to SNOWD? Go back and use your phone number, Google, or Apple to create an account.</p>}
        {step === "code" && <button type="button" className={styles.back} disabled={busy} onClick={() => { if (Date.now() < resendAt) { setNotice("Please wait one minute before requesting another code."); return; } void run(sendCode); }}>Send a new code</button>}
      </form>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {notice && <p role="status" className={styles.hint}>{notice}</p>}
      {step === "start" && <>
        <div className={styles.divider}>or</div>
        <button className={styles.social} disabled={busy} onClick={() => void run(async () => { const persistence = setPersistence(auth, browserLocalPersistence); await Promise.all([persistence, signInWithGoogle()]); })}><FcGoogle size={22} aria-hidden />Continue with Google</button>
        <AppleSignInButton disabled={busy} />
        <div className={styles.divider}>or</div>
        <button className={styles.social} disabled={busy} onClick={() => setStep("qr")}><QrCode size={19} aria-hidden />Log in with QR code</button>
        <p className={styles.consent}>By continuing with a phone number, you agree to receive a verification code by text. Message and data rates may apply. Your number is sent to Google to help prevent abuse.</p>
      </>}
      <div id="phone-recaptcha" />
    </section>
  </main>;
}
