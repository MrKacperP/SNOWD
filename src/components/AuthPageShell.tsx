"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Snowflake } from "lucide-react";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  body: string;
  features: string[];
  children: ReactNode;
};

export default function AuthPageShell({ eyebrow, title, body, features, children }: AuthPageShellProps) {
  return <main className="auth-page min-h-dvh px-4 py-5 sm:p-8">
    <div className="auth-frame mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1120px] lg:grid-cols-2">
      <section className="auth-form-section flex min-w-0 flex-col p-3 sm:p-8">
        <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-3" aria-label="Snowd home">
          <Image src="/logo.png" alt="" width={44} height={48} priority className="h-11 w-11 object-contain" />
          <span className="font-headline text-3xl font-semibold">snowd<span className="text-[var(--accent-sun)]">.</span></span>
        </Link>
        <div className="auth-form-content mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8">{children}</div>
      </section>
      <section className="auth-welcome relative hidden flex-col justify-center overflow-hidden rounded-3xl p-10 lg:flex">
        <span className="mb-8 flex items-center gap-2 text-sm font-medium text-[#47758c]"><Snowflake size={20} />{eyebrow}</span>
        <h1 className="text-5xl font-semibold leading-[1.1] tracking-tight first-letter:uppercase">{title}<span className="text-[#ca641d]">.</span></h1>
        <p className="mt-5 text-lg leading-relaxed text-[#526873]">{body}</p>
        <div className="mt-10 grid gap-5">{features.map(feature => <div key={feature} className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-1 shrink-0 text-[#47758c]" /><p className="text-sm leading-6 text-[#526873]">{feature}</p>
        </div>)}</div>
        <Image src="/logo.png" alt="" width={180} height={190} className="mt-10 h-32 w-32 self-end object-contain" />
      </section>
    </div>
  </main>;
}
