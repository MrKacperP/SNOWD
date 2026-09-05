"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { PhoneCall } from "lucide-react";

const PHONE_NUMBER = "437-922-3895";

export default function JunkLandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)]">
      <section className="relative min-h-screen flex items-center justify-center px-6 sm:px-10 py-16 sm:py-24 overflow-hidden">


        <div className="relative z-10 w-full max-w-6xl">
          <div className="flex flex-col items-center gap-8">
            <Link href="/" className="flex items-center gap-3 font-headline text-4xl font-black">
              <Image src="/logo.png" alt="" width={48} height={48} className="object-contain" />
              <span>snowd<span className="text-[var(--accent-sun)]">.</span></span>
            </Link>
            <div className="text-center">
              <p className="chip bg-[var(--accent-sun)] font-black">Junk removal</p>
              <h1 className="mt-4 text-4xl font-black sm:text-6xl">Make room for more.</h1>
              <p className="mt-3 text-lg text-[var(--text-secondary)]">Call or text for a quote across the Greater Toronto Area.</p>
            </div>
            <a
              href={`tel:${PHONE_NUMBER.replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-3 px-8 sm:px-12 py-5 sm:py-6 rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent-sun)] text-[var(--ink)] text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide shadow-[var(--surface-shadow)] hover:-translate-y-0.5 transition"
            >
              <PhoneCall className="w-6 h-6" /> {PHONE_NUMBER}
            </a>

            <div className="w-full grid lg:grid-cols-2 gap-8">
              <div className="relative w-full aspect-[4/5] rounded-[28px] border-[3px] border-[var(--ink)] overflow-hidden shadow-[var(--surface-shadow)]">
                <Image
                  src="/cover.png"
                  alt="Junk removal flyer"
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
              </div>
              <div className="relative w-full aspect-[4/5] rounded-[28px] border-[3px] border-[var(--ink)] overflow-hidden shadow-[var(--surface-shadow)]">
                <Image
                  src="/main.png"
                  alt="Sprinter and trailer capacity"
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
                <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-[var(--ink)] border-[3px] border-[var(--ink)] px-5 py-3 text-center text-xl sm:text-2xl font-extrabold text-[var(--accent-sun)]">
                  350 CU FT • SPRINTER + TRAILER
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
