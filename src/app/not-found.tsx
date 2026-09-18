import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return <main className="grid min-h-dvh place-items-center p-6">
    <section className="empty-state w-full max-w-md">
      <span className="empty-mark"><Compass size={24} aria-hidden="true" /></span>
      <p className="app-eyebrow">404 · Page not found</p>
      <h1 className="mt-2 text-2xl font-semibold">Let’s get you back on track</h1>
      <p>This link may have changed or the page is no longer available.</p>
      <Link href="/dashboard" className="btn-primary"><ArrowLeft size={18} />Go to your dashboard</Link>
    </section>
  </main>;
}
