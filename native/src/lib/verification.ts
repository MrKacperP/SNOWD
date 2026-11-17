import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { useAuth } from "~/context/auth";
import { notifyAdmin } from "./admin";
import { db } from "./firebase";
import { chooseUpload, storageName, uploadFile } from "./uploads";

export type IdState = "verified" | "pending" | "rejected" | "missing";

/**
 * Where the user's government ID stands. Customer accounts start out approved without an ID, so
 * "verified" also needs a photo on file: until one is uploaded, everyone is asked for it.
 */
export function idState(profile: { verificationStatus?: string; idPhotoUrl?: string; idVerified?: boolean } | null | undefined): IdState {
  if (!profile) return "missing";
  if (profile.verificationStatus === "rejected") return "rejected";
  if (!profile.idPhotoUrl) return "missing";
  if (profile.verificationStatus === "pending") return "pending";
  return profile.idVerified ? "verified" : "pending";
}

type Picked = NonNullable<Awaited<ReturnType<typeof chooseUpload>>>;

/** An ID photo or transcript is small: 45 seconds with nothing sent means there's no connection. */
const STALL_MS = 45_000;

/**
 * Uploads a government ID or a student transcript into the user's private `verification/` folder
 * and records it on their profile for SNOWD's review team. The profile is live, so screens update on their own.
 *
 * Only fields the user is allowed to change are written (the Firestore rules keep `idVerified`,
 * `accountApproved` and `verificationNote` for admins), otherwise the write is refused with
 * "Missing or insufficient permissions". Setting the status to "pending" is what puts the ID in
 * the admin review queue.
 */
export function useVerificationUpload() {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const [busy, setBusy] = useState<"" | "id" | "transcript">("");
  const [error, setError] = useState("");
  // Which upload the error belongs to, so it can be shown next to that button.
  const [failed, setFailed] = useState<"" | "id" | "transcript">("");
  const who = { name: profile?.displayName || "", email: profile?.email || "" };

  const put = (picked: Picked, base: string) =>
    picked.kind === "photo"
      ? uploadFile(`verification/${uid}`, picked.uri, { name: `${base}.jpg`, stallMs: STALL_MS })
      : uploadFile(`verification/${uid}`, picked.file.uri, { name: `${base}-${storageName(picked.file.name)}`, contentType: picked.file.mimeType, stallMs: STALL_MS });

  const run = async (kind: "id" | "transcript") => {
    if (!uid) return false;
    setError("");
    setFailed("");
    try {
      // A full-size photo keeps the fine print readable; a scan or PDF from Files works too.
      const picked = await chooseUpload(kind === "id" ? "Government ID" : "Transcript or student card", { files: true });
      if (!picked) return false;
      setBusy(kind);
      const url = await put(picked, kind === "id" ? "id-photo" : "transcript");
      if (kind === "id") {
        await updateDoc(doc(db, "users", uid), { idPhotoUrl: url, verificationStatus: "pending", idSubmittedAt: serverTimestamp() });
        notifyAdmin({ type: "document_uploaded", message: `ID document uploaded by ${who.name || who.email}`, uid, meta: who });
      } else {
        await updateDoc(doc(db, "users", uid), { studentTranscriptUrl: url, transcriptSubmittedAt: serverTimestamp() });
        notifyAdmin({ type: "document_uploaded", message: `Student transcript uploaded by ${who.name || who.email}`, uid, meta: who });
      }
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code || "";
      setFailed(kind);
      setError(
        code === "permission-denied"
          ? "SNOWD couldn’t save that to your account. Sign out and back in, then try again."
          : e instanceof Error
            ? e.message
            : kind === "id"
              ? "Your ID couldn’t be uploaded. Please try again."
              : "Your transcript couldn’t be uploaded. Please try again.",
      );
      return false;
    } finally {
      setBusy("");
    }
  };

  return { busy, error, failed, uploadId: () => run("id"), uploadTranscript: () => run("transcript") };
}
