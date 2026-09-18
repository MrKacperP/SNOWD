"use client";

import { RotateCcw, WifiOff } from "lucide-react";
import Link from "next/link";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="empty-state mx-auto max-w-lg" role="alert">
    <span className="empty-mark"><WifiOff size={22} aria-hidden="true" /></span>
    <h1 className="text-2xl font-semibold">Something didn’t load</h1>
    <p>Check your connection and try again. Your saved work is still there.</p>
    <button type="button" className="btn-primary mt-5" onClick={reset}><RotateCcw size={18} />Try again</button>
    <Link href="/dashboard" className="mt-3 flex min-h-11 items-center justify-center text-sm font-medium underline underline-offset-4">Back to home</Link>
  </section>;
}
