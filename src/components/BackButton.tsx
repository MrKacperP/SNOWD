"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

export default function BackButton({ href, label = "Back" }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    const destination = returnTo && (returnTo === "/dashboard" || returnTo.startsWith("/dashboard/") || returnTo.startsWith("/admin/")) && !returnTo.includes("\\")
      ? returnTo : href || "/dashboard";
    router.push(destination);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex min-h-11 min-w-11 items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all duration-200"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
