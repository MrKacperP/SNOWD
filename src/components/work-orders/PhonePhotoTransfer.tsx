"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { stripeConnectFetch } from "@/lib/stripeConnectClient";

async function transfer(jobId: string, action: string, sessionId?: string) {
  const response = await stripeConnectFetch("/api/jobs/photo-transfer", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, action, sessionId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not connect to your phone. Try again.");
  return data;
}
export default function PhonePhotoTransfer({ jobId, onPhoto, disabled }: { jobId: string; onPhoto: (photo: string) => void; disabled?: boolean }) {
  const [qr, setQr] = useState(""), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [received, setReceived] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const activeSession = useRef("");
  const callback = useRef(onPhoto);
  useEffect(() => { callback.current = onPhoto; }, [onPhoto]);
  useEffect(() => {
    if (!qr) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (Date.now() >= expiresAt) { setQr(""); setError("QR code expired. Create a new one to continue."); return; }
      try {
        const data = await transfer(jobId, "status", sessionId);
        if (stopped) return;
        if (data.photo) {
          callback.current(data.photo); setReceived(true); setQr(""); return;
        }
        setError("");
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "Connection interrupted. Retrying…");
      }
      if (!stopped) timer = setTimeout(poll, 2500);
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [qr, jobId, expiresAt, sessionId]);
  useEffect(() => () => { if (activeSession.current) void transfer(jobId, "close", activeSession.current).catch(() => {}); }, [jobId]);
  async function create() {
    setBusy(true); setError(""); setReceived(false);
    try {
      const data = await transfer(jobId, "create");
      activeSession.current = data.sessionId;
      setSessionId(data.sessionId);
      const QRCode = (await import("qrcode")).default;
      const url = `${window.location.origin}/photo-upload#job=${encodeURIComponent(jobId)}&token=${data.token}`;
      setQr(await QRCode.toDataURL(url, { width: 240, margin: 4, errorCorrectionLevel: "M" }));
      setExpiresAt(data.expiresAt);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create QR code."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 border-t pt-4">
    <p className="font-semibold">Upload from your phone</p>
    {qr ? <>
      <Image unoptimized src={qr} alt="Scan this QR code to upload a completion photo from your phone" width={240} height={240} className="mx-auto" />
      <p className="text-sm" role="status">Scan with your phone’s camera. Choose or take a photo, then send it here. Keep this window open. This link expires in 10 minutes.</p>
    </> : <button type="button" disabled={busy || disabled} onClick={create} className="min-h-12 rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">{busy ? "Creating QR code…" : "Show QR code"}</button>}
    {received && <p role="status">Photo received from your phone. Review the preview and select Save photo proof.</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
