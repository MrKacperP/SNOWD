"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import styles from "./SimpleAuth.module.css";

export default function QrSignIn({ onToken }: { onToken: (token: string) => Promise<void> }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const onTokenRef = useRef(onToken);
  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function request(body: object) {
      const response = await fetch("/api/auth/qr", { signal: controller.signal, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t load QR code.");
      return data;
    }
    async function start() {
      setImage(""); setError("");
      try {
        const { id, expiresAt } = await request({ action: "create" });
        const image = await QRCode.toDataURL(`snowd://web-sign-in?id=${id}`, { width: 256, margin: 2 });
        if (cancelled) return;
        setImage(image);
        async function poll() {
          if (cancelled) return;
          try {
            if (Date.now() >= expiresAt) throw new Error("Your QR code expired. Get a new code.");
            const result = await request({ action: "poll", id });
            if (cancelled) return;
            if (result.token) { await onTokenRef.current(result.token); return; }
            timer = setTimeout(poll, 2000);
          } catch (err) { if (!cancelled) { setImage(""); setError(err instanceof Error ? err.message : "Sign-in failed. Try again."); } }
        }
        timer = setTimeout(poll, 2000);
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Couldn’t load QR code."); }
    }
    timer = setTimeout(() => void start(), 0);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [generation]);
  return <div>
    <p className={styles.hint}>Open SNOWD on your phone. Go to Profile → Scan to sign in, then scan this code and confirm.</p>
    {image ? <Image unoptimized src={image} width={256} height={256} alt="Scan with the SNOWD app to sign in to this browser" style={{ margin: "16px auto", maxWidth: "100%" }} /> : !error && <p role="status">Preparing your code…</p>}
    {error && <><p role="alert" className={styles.error}>{error}</p><button className={styles.social} onClick={() => setGeneration(value => value + 1)}>Get a new QR code</button></>}
    <p className={styles.hint}>Only approve a code shown on your own computer. Codes expire after two minutes.</p>
  </div>;
}
