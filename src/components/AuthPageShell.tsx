"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthPageShell({ children }: { children: ReactNode }) {
  return <main className="auth-page min-h-dvh px-4 py-5 sm:p-8">
    <div className="auth-frame mx-auto min-h-[calc(100dvh-4rem)] max-w-[540px]">
      <section className="auth-form-section flex min-w-0 flex-col p-3 sm:p-8">
        <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-3" aria-label="SNOWD home">
          <Image src="/logo.png" alt="" width={44} height={48} priority className="h-12 w-11 object-contain" />
          <span className="font-headline text-3xl font-semibold">snowd<span className="text-[var(--accent-sun)]">.ca</span></span>
        </Link>
        <div className="auth-form-content mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8">{children}</div>
      </section>
    </div>
  </main>;
}
