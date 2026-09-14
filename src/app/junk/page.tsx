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

            <div className="grid w-full gap-5 sm:grid-cols-3">
              {[
                ["Tell us what’s going", "Call or text with the items you want removed and your pickup location."],
                ["Get your quote", "Confirm the price and pickup details with our team before booking."],
                ["Make room", "Choose a pickup time with the team and get ready for a clearer space."],
              ].map(([title, description], index) => <div key={title} className="rounded-3xl border border-[var(--border-color)] bg-white p-6"><p className="text-sm font-bold text-[var(--text-muted)]">Step {index + 1}</p><h2 className="mt-3 text-xl font-bold">{title}</h2><p className="mt-2 text-[var(--text-secondary)]">{description}</p></div>)}
            </div>
            <a href={`sms:${PHONE_NUMBER.replace(/[^0-9+]/g, "")}`} className="inline-flex min-h-12 items-center rounded-xl border border-[var(--ink)] px-6 py-3 font-semibold">Text us for a quote</a>
          </div>
        </div>
      </section>
    </div>
  );
}
