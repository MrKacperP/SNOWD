"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Image as ImageIcon, RotateCcw } from "lucide-react";
import { ResultState } from "@/components/ui/AppPrimitives";
import { prepareCompletionPhoto } from "@/lib/completionPhoto";
import styles from "./photo-upload.module.css";

/**
 * Opened from the QR code on the operator's computer. The camera starts as soon as the
 * page loads; the photo library sits beside the shutter. Falls back to the phone's own
 * camera sheet when live camera access isn't allowed.
 */
export default function PhotoUploadPage() {
  const [link, setLink] = useState({ jobId: "", token: "" });
  const [photo, setPhoto] = useState("");
  const [live, setLive] = useState(false), [cameraError, setCameraError] = useState(false);
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false);
  const [done, setDone] = useState(false), [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fallback = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);

  const stop = useCallback(() => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setLive(false); }, []);
  const start = useCallback(async () => {
    setCameraError(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
      stream.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play().catch(() => {}); }
      setLive(true);
    } catch { setCameraError(true); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const next = { jobId: params.get("job") || "", token: params.get("token") || "" };
    setLink(next);
    if (next.jobId && next.token) void start();
    return stop;
  }, [start, stop]);

  async function prepare(file?: File) {
    if (!file) return;
    setPreparing(true); setError("");
    try { setPhoto(await prepareCompletionPhoto(file)); stop(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not open this photo."); }
    finally { setPreparing(false); }
  }
  function shoot() {
    const el = video.current;
    if (!el?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth; canvas.height = el.videoHeight;
    canvas.getContext("2d")?.drawImage(el, 0, 0);
    canvas.toBlob(blob => { if (blob) void prepare(new File([blob], "completion.jpg", { type: "image/jpeg" })); }, "image/jpeg", 0.92);
  }
  function retake() { setPhoto(""); setError(""); void start(); }
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

  if (done) return <main className="mx-auto max-w-md p-6 py-12"><ResultState title="Photo sent." description="Return to your computer. The work order completes automatically." /></main>;
  if (!link.token || !link.jobId) return <main className="mx-auto max-w-md p-6 py-12"><h1 className="text-3xl font-bold">Completion photo</h1><p className="mt-3">Scan the QR code shown on your computer.</p></main>;

  const picker = (ref: React.RefObject<HTMLInputElement | null>, capture?: "environment") => <input ref={ref} className="sr-only" type="file" accept="image/*" capture={capture} tabIndex={-1} onChange={e => { void prepare(e.target.files?.[0]); e.target.value = ""; }} />;

  return <main className={styles.page}>
    <div className={styles.stage}>
      {photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo} alt="Completion photo preview" />
        : <video ref={video} playsInline muted autoPlay aria-label="Camera preview" data-live={live || undefined} />}
      {!photo && !live && <div className={styles.fallback}>
        <p>{cameraError ? "Camera access was blocked. Use your phone's camera instead." : "Starting camera…"}</p>
        {cameraError && <button type="button" onClick={() => fallback.current?.click()}>Open camera</button>}
      </div>}
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.bar}>
      {photo ? <>
        <button type="button" className={styles.side} onClick={retake} disabled={busy}><RotateCcw size={22} aria-hidden="true" /><span>Retake</span></button>
        <button type="button" className={styles.send} onClick={send} disabled={busy || preparing}><Check size={22} aria-hidden="true" />{busy ? "Sending…" : "Send photo"}</button>
      </> : <>
        <button type="button" className={styles.side} onClick={() => library.current?.click()} disabled={preparing} aria-label="Choose from photo library"><ImageIcon size={26} aria-hidden="true" /><span>Library</span></button>
        <button type="button" className={styles.shutter} onClick={live ? shoot : () => fallback.current?.click()} disabled={preparing || (!live && !cameraError)} aria-label="Take photo"><span /></button>
        <span className={styles.spacer} aria-hidden="true" />
      </>}
    </div>
    {picker(fallback, "environment")}{picker(library)}
  </main>;
}
