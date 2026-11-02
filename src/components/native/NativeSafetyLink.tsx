"use client";
import Link from "next/link";
import { useNativeApp } from "@/hooks/useNativeApp";
export default function NativeSafetyLink({ uid }: { uid?: string }) {
  return useNativeApp() && uid ? <Link className="inline-flex min-h-11 items-center px-3 text-sm underline" href={`/mobile/safety/${encodeURIComponent(uid)}`}>Safety</Link> : null;
}
