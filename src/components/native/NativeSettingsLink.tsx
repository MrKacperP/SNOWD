"use client";
import Link from "next/link";
import { useNativeApp } from "@/hooks/useNativeApp";
export default function NativeSettingsLink() {
  return useNativeApp() ? <section className="native-card"><h2 className="font-semibold">App, privacy & support</h2><p className="my-2 text-sm text-[var(--text-secondary)]">Permissions, payments, policies, and account deletion.</p><Link className="inline-flex min-h-11 items-center" href="/mobile/settings">Open app settings →</Link></section> : null;
}
