"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supportEmail } from "@/lib/mobilePolicies";
import { isNativeApp, nativePlatform, revokeNativeAppleForDeletion } from "@/lib/native";

export default function DeleteAccountPage() {
  const { user, signOut } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [submitted, setSubmitted] = useState(false), [error, setError] = useState("");
  const [recentLogin, setRecentLogin] = useState(false);
  const submit = async () => {
    if (!user || busy) return;
    setBusy(true); setError("");
    try {
      let appleRevocationReported = false;
      if (isNativeApp() && nativePlatform() === "ios" && user.providerData.some(provider => provider.providerId === "apple.com")) {
        await revokeNativeAppleForDeletion(); appleRevocationReported = true;
      }
      const response = await fetch("/api/account/deletion-request", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken(true)}` }, body: JSON.stringify({ confirmation, appleRevocationReported }) });
      const data = await response.json();
      if (!response.ok) { setRecentLogin(data.code === "recent_login_required"); throw new Error(data.error || "Request could not be submitted."); }
      setSubmitted(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Check your connection and try again."); }
    finally { setBusy(false); }
  };
  return <main className="native-page"><div className="native-content">
    <header className="native-header"><Link href="/mobile/settings">← App & privacy</Link></header><h1>Delete account & data</h1>
    {submitted ? <section className="native-card" role="status"><h2>Request received</h2><p>Support will process your request within 30 days and contact you about any required retention or unresolved jobs. Your account remains accessible until processing is complete.</p><Link href="/mobile/settings">Return to app settings</Link></section> : <>
      <p>Request permanent deletion of your SNOWD login, profile and personal uploads. Support reviews associated messages and records and processes requests within 30 days.</p>
      <p>Financial, fraud-prevention, legal and unresolved-dispute records may need to be retained for those purposes. Support will explain any exception. Your account remains accessible while the request is processed.</p>
      <p>Deletion cannot be undone once completed. Resolve outstanding work and check your payments; submitting this request does not itself cancel or refund a job.</p>
      {!user ? <Link className="native-primary" href="/login?redirect=%2Faccount%2Fdelete">Sign in to request deletion</Link> : <form onSubmit={e => { e.preventDefault(); void submit(); }}>
        <label className="block mt-6 font-semibold" htmlFor="delete-confirm">Type DELETE to confirm</label><input id="delete-confirm" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-4"/>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {recentLogin && <button type="button" className="native-secondary" onClick={async () => { await signOut(); location.assign("/login?redirect=%2Faccount%2Fdelete"); }}>Sign in again securely</button>}
        <button className="native-primary" disabled={busy || confirmation !== "DELETE"}>{busy ? "Submitting…" : "Request permanent deletion"}</button>
      </form>}
      <Link className="native-secondary" href="/mobile/settings">Keep my account</Link>
    </>}
    <p className="text-sm">Can’t access your account? <a className="underline" href={`mailto:${supportEmail}`}>Contact support</a> for help verifying your identity.</p>
  </div></main>;
}
