"use client";

import React from "react";
import Image from "next/image";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#246EB9]/10">
      <div className="animate-spin-slow">
        <Image
          src="/logo.svg"
          alt="snowd.ca"
          width={64}
          height={64}
          priority
        />
      </div>
      <p className="mt-4 text-gray-500 font-medium">Loading...</p>
    </div>
  );
}
