"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, HelpCircle, MessageCircleHeart, Send } from "lucide-react";
import styles from "@/app/landing.module.css";

type Kind = "question" | "feedback";

export default function LandingFeedback() {
  const [kind, setKind] = useState<Kind>("question");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending"); setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, name: form.get("name"), email: form.get("email"), message: form.get("message"), website: form.get("website") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn’t send that right now.");
      setState("sent");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t send that right now.");
      setState("idle");
    }
  }

  if (state === "sent") return <div className={styles.feedbackCard} role="status">
    <CheckCircle2 className={styles.feedbackDone} size={44} aria-hidden="true" />
    <h3>Thanks, we got it.</h3>
    <p>{kind === "question" ? "Our support team will reply to the email you gave us." : "Your note goes straight to the SNOWD team and helps shape what we build next."}</p>
    <button type="button" className={styles.earnAction} onClick={() => setState("idle")}>Send another</button>
  </div>;

  return <form id="ask" className={styles.feedbackCard} onSubmit={submit} aria-labelledby="ask-title">
    <h3 id="ask-title">Still wondering something?</h3>
    <p>Ask us anything or tell us how we can do better. No account needed.</p>
    <div className={styles.kindSwitch} role="radiogroup" aria-label="What are you sending?">
      <button type="button" role="radio" aria-checked={kind === "question"} onClick={() => setKind("question")}><HelpCircle size={17} aria-hidden="true" />Ask a question</button>
      <button type="button" role="radio" aria-checked={kind === "feedback"} onClick={() => setKind("feedback")}><MessageCircleHeart size={17} aria-hidden="true" />Give feedback</button>
    </div>
    <div className={styles.fieldRow}>
      <label>Name <span>(optional)</span><input name="name" autoComplete="name" maxLength={100} /></label>
      <label>Email <span>{kind === "question" ? "(so we can reply)" : "(optional)"}</span><input name="email" type="email" autoComplete="email" maxLength={200} required={kind === "question"} /></label>
    </div>
    <label>{kind === "question" ? "Your question" : "Your feedback"}<textarea name="message" rows={4} required minLength={5} maxLength={2000} placeholder={kind === "question" ? "e.g. Can I book the same shoveler every storm?" : "e.g. I loved the completion photo. Could I book weekly?"} /></label>
    <input className={styles.honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    {error && <p className={styles.formError} role="alert">{error}</p>}
    <button type="submit" className={styles.primary} disabled={state === "sending"}>{state === "sending" ? "Sending…" : kind === "question" ? "Send question" : "Send feedback"}<Send size={17} aria-hidden="true" /></button>
  </form>;
}
