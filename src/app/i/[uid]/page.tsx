import type { Metadata } from "next";
import Link from "next/link";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

type Inviter = { name: string; role: "operator" | "client" | ""; photo: string; city: string };

/** Only public profile details: name, photo, city and whether they're a shoveler. */
async function loadInviter(uid: string): Promise<Inviter | null> {
  try {
    const snap = await getAdminDb().collection("users").doc(uid).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    if (!["operator", "client"].includes(d.role)) return null;
    const operator = d.role === "operator";
    return {
      name: String((operator && d.businessName) || d.displayName || "A SNOWD member"),
      role: d.role,
      photo: String((operator && d.logoUrl) || d.avatar || ""),
      city: String(d.city || ""),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const inviter = await loadInviter((await params).uid);
  return { title: inviter ? `${inviter.name} invited you to SNOWD` : "You’re invited to SNOWD", robots: { index: false } };
}

/**
 * Where invite links and profile QR codes land. Opens the SNOWD app on that person's profile when
 * it's installed; otherwise offers the iPhone app (when a public link is set) or the web app.
 */
export default async function InvitePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const inviter = await loadInviter(uid);
  const operator = inviter?.role === "operator";
  const appLink = `snowd://invite/${encodeURIComponent(uid)}`;
  const iosApp = process.env.NEXT_PUBLIC_IOS_APP_URL || "";
  const web = `/signup?invite=${encodeURIComponent(uid)}${operator ? `&next=${encodeURIComponent(`/dashboard/u/${uid}`)}` : ""}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      {inviter?.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={inviter.photo} alt="" className="h-24 w-24 rounded-full border border-[var(--border)] object-cover" />
      ) : (
        <div aria-hidden="true" className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-soft)] text-4xl">❄️</div>
      )}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{inviter ? `${inviter.name} invited you to SNOWD` : "You’re invited to SNOWD"}</h1>
        <p className="text-[var(--text-secondary)]">
          {operator
            ? `Book your snow clearing with ${inviter!.name}${inviter!.city ? ` in ${inviter!.city}` : ""}. You only pay when it’s done.`
            : "SNOWD connects neighbours with trusted local shovelers. Get the app and you’ll have them saved as a contact."}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <a href={appLink} className="rounded-2xl bg-[var(--accent)] px-5 py-4 font-semibold text-white">Open in the SNOWD app</a>
        {iosApp ? (
          <a href={iosApp} className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 font-semibold text-[var(--text-primary)]">Get the iPhone app</a>
        ) : null}
        <Link href={web} className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 font-semibold text-[var(--text-primary)]">Continue on the web</Link>
      </div>
      <p className="text-sm text-[var(--text-muted)]">Already on SNOWD? “Open in the SNOWD app” takes you straight to {inviter ? inviter.name : "their profile"}.</p>
    </main>
  );
}
