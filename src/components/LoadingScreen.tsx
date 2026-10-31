"use client";

import Image from "next/image";
import SnowStorm from "@/components/SnowStorm";

export default function LoadingScreen({ embedded = false, label = "Getting things ready…" }: { embedded?: boolean; label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={`snow-loading ${embedded ? "snow-loading-embedded" : ""}`}
    >
      <SnowStorm className="snow-loading-storm" />
      <div className="snow-loading-mark">
        <Image src="/logo.png" alt="" width={56} height={61} priority className="h-[61px] w-14 object-contain" />
        <p className="font-headline text-4xl font-semibold">
          snowd<span className="text-[var(--accent-sun)]">.ca</span>
        </p>
        <span className="snow-loading-bar" aria-hidden="true"><span /></span>
        <p className="snow-loading-label">{label}</p>
      </div>
    </div>
  );
}
