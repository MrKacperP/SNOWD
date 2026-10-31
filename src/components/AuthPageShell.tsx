"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import SnowStorm from "@/components/SnowStorm";

export default function AuthPageShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <main className="auth-page grid h-dvh place-items-center overflow-hidden px-4 py-4 sm:p-6">
    <SnowStorm />
    <div className={`auth-frame relative w-full ${aside ? "auth-frame-split max-w-[980px]" : "max-w-[540px]"}`}>
      <section className="auth-form-section flex min-w-0 flex-col p-3 sm:p-7">
        <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-3" aria-label="SNOWD home">
          <Image src="/logo.png" alt="" width={44} height={48} priority className="h-12 w-11 object-contain" />
          <span className="font-headline text-3xl font-semibold">snowd<span className="text-[var(--accent-sun)]">.ca</span></span>
        </Link>
        <div className="auth-form-content mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-6">{children}</div>
      </section>
      {aside ? <aside className="auth-aside">{aside}</aside> : null}
    </div>
  </main>;
}
