"use client";
import Image from "next/image";
import { useState } from "react";
import { prepareCompletionPhoto } from "@/lib/completionPhoto";

export default function PhotoPicker({ photo, onChange, disabled, onBusy }: {
  photo: string; onChange: (photo: string) => void; disabled?: boolean; onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function choose(file?: File) {
    if (!file) return;
    setBusy(true); onBusy?.(true); setError(""); onChange("");
    try { onChange(await prepareCompletionPhoto(file)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not open this photo."); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-3">
      {[false, true].map(camera => <label key={String(camera)} className={`rounded-xl border p-3 font-semibold ${busy || disabled ? "opacity-50" : "cursor-pointer"}`}>
        {camera ? "Take a photo" : "Choose from gallery or files"}
        <input className="sr-only" type="file" accept="image/*" capture={camera ? "environment" : undefined} disabled={busy || disabled} onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
      </label>)}
    </div>
    {busy && <p role="status">Preparing photo…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {photo && <Image unoptimized width={1600} height={1200} src={photo} alt="Completion photo preview" className="max-h-52 w-full rounded-xl object-contain" />}
  </div>;
}
