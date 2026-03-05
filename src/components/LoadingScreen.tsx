"use client";

import React from "react";
import Image from "next/image";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-secondary)]">
      <div className="animate-spin-slow">
        <Image
          src="/logo.svg"
          alt="snowd.ca"
          width={64}
          height={64}
          priority
        />
      </div>
      <p className="mt-4 text-[var(--text-muted)] font-medium">Loading...</p>
    </div>
  );
}
