"use client";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Round profile photo picker. Any image shape is cropped to fill the circle, exactly as contacts and chats show it. */
export default function ProfilePhotoPicker({ value, onChange, name, size = 72 }: {
  value: string;
  onChange: (url: string) => void | Promise<void>;
  name?: string;
  size?: number;
}) {
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file || !user) return;
    if (!TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a JPG, PNG or WebP image under 5 MB."); return; }
    setBusy(true); setError("");
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${crypto.randomUUID()}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      await onChange(await getDownloadURL(storageRef));
    } catch (uploadError) {
      console.error("Profile photo upload failed:", uploadError);
      setError("Photo upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true); setError("");
    try { await onChange(""); }
    catch { setError("The photo could not be removed. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" aria-label={value ? "Change profile photo" : "Add profile photo"}>
        {value
          ? <UserAvatar photoURL={value} displayName={name} size={size} />
          : <span className="grid place-items-center rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)]" style={{ width: size, height: size }}><Camera className="h-6 w-6" /></span>}
        {busy && <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70"><Loader2 className="h-5 w-5 animate-spin" /></span>}
      </button>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary px-4 py-2 text-sm" disabled={busy} onClick={() => input.current?.click()}>{value ? "Change photo" : "Upload photo"}</button>
          {value && <button type="button" className="px-2 py-2 text-sm font-semibold text-[var(--text-muted)] underline" disabled={busy} onClick={remove}>Remove</button>}
        </div>
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">JPG, PNG or WebP, up to 5 MB. Wide or tall photos are centred to fit the circle.</p>
        {error && <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{error}</p>}
      </div>
      <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
    </div>
  );
}
