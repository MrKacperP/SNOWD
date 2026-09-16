"use client";
import { useEffect, useState } from "react";
import PhotoPicker from "@/components/work-orders/PhotoPicker";
import { ResultState } from "@/components/ui/AppPrimitives";

export default function PhotoUploadPage() {
  const [link, setLink] = useState({ jobId: "", token: "" });
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false);
  const [done, setDone] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    setLink({ jobId: params.get("job") || "", token: params.get("token") || "" });
  }, []);
  async function send() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/jobs/photo-transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...link, action: "upload", photo }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed. Please retry.");
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md space-y-5 p-6 py-12">
    {done ? <ResultState title="Photo sent." description="Return to your computer to finish the work order." /> : <><p className="app-eyebrow">Finish the job</p><h1 className="text-3xl font-bold">Completion photo</h1>{!link.token || !link.jobId ? <p>Scan the QR code shown on your computer.</p> : <>
      <p>Take a photo or choose one from your gallery. Keep the completion photo window open on your computer.</p>
      <PhotoPicker photo={photo} onChange={setPhoto} disabled={busy} onBusy={setPreparing} />
      <button className="min-h-12 rounded-xl bg-[var(--ink)] px-4 py-3 text-white disabled:opacity-50" disabled={!photo || busy || preparing} onClick={send}>{busy ? "Sending photo…" : "Send to computer"}</button>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </>}</>}
  </main>;
}
