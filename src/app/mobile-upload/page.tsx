"use client";

import React, { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

async function compressImage(file: File): Promise<string> {
  const read = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

  const img = await dataUrlToImage(read);
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.82);
}

function MobileUploadPageInner() {
  const searchParams = useSearchParams();
  const sessionId = (searchParams.get("session") || "").trim();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const canUpload = useMemo(() => sessionId.length > 0, [sessionId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canUpload || uploading) return;

    setUploading(true);
    setError("");

    try {
      const imageDataUrl = await compressImage(file);
      const response = await fetch("/api/mobile-upload/session/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, imageDataUrl }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#EEF3FA] px-4 py-8 flex items-center justify-center">
      <section className="w-full max-w-sm bg-white border border-[#DCE8FF] rounded-2xl p-5 shadow-lg">
        <h1 className="text-lg font-bold text-[#0B1F33]">Send Photo</h1>
        <p className="text-sm text-[#6B7C8F] mt-1">Take a photo and submit it back to your SNOWD chat.</p>

        {!canUpload && (
          <p className="mt-4 text-sm text-red-600">This link is missing a session.</p>
        )}

        {submitted ? (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Photo submitted successfully. You can close this page.
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              className="hidden"
              disabled={!canUpload || uploading}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canUpload || uploading}
              className="mt-5 w-full h-11 rounded-xl bg-[#2F6FED] text-white font-semibold hover:bg-[#2158C7] disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploading ? "Submitting..." : "Open Camera"}
            </button>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default function MobileUploadPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[var(--bg-primary)]" />}>
      <MobileUploadPageInner />
    </Suspense>
  );
}
