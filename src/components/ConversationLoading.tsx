"use client";

import Image from "next/image";

export default function ConversationLoading() {
  return (
    <div className="grid min-h-[min(70dvh,640px)] w-full flex-1 place-items-center" role="status" aria-label="Loading messages">
      <Image src="/logo.png" alt="" width={44} height={44} className="motion-safe:animate-spin" priority />
      <span className="sr-only">Loading messages</span>
    </div>
  );
}
