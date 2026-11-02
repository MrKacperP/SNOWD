"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
export default function SafetyPage() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (!user || !uid) return;
    let active = true;
    void getDoc(doc(db, "userBlocks", user.uid, "users", uid)).then(record => { if (active) { setBlocked(record.exists()); setReady(true); } }).catch(() => { if (active) setError("We couldn’t load your block settings. Please reconnect and try again."); });
    return () => { active = false; };
  }, [uid, user]);
  return <main className="native-page"><div className="native-content"><header className="native-header"><Link href="/dashboard/messages">← Messages</Link></header><h1>Safety & contact</h1>
    <section className="native-card"><h2>{blocked ? "User blocked" : "Block this user"}</h2><p>Blocking stops new direct messages between you and this user. Existing work orders and payment records remain available. Blocking does not cancel a job or payment.</p>
      <button className="native-primary" disabled={!ready || busy || !user || uid === user.uid} onClick={async () => {
        if (!user) return;
        setBusy(true); setError("");
        try { const ref = doc(db, "userBlocks", user.uid, "users", uid); if (blocked) await deleteDoc(ref); else await setDoc(ref, { createdAt: serverTimestamp() }); setBlocked(!blocked); }
        catch { setError("We couldn’t change this setting. Check your connection and try again."); }
        finally { setBusy(false); }
      }}>{busy ? "Saving…" : blocked ? "Unblock user" : "Block user"}</button>{error && <p role="alert">{error}</p>}
    </section><section className="native-card"><h2>Report a concern</h2><p>Return to the conversation and choose Report to send details to the support team. For urgent account help, contact <a href="mailto:service.mississauga@gmail.com">service.mississauga@gmail.com</a>.</p></section>
  </div></main>;
}
