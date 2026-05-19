"use client";

import React from "react";
import Image from "next/image";
import { PhoneCall } from "lucide-react";

const PHONE_NUMBER = "437-922-3895";

export default function JunkLandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <section className="relative min-h-screen flex items-center justify-center px-6 sm:px-10 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,216,90,0.22),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_45%),linear-gradient(120deg,#0B0B0B,#111215)]" />
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:80px_80px]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0B0B0B] to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-6xl">
          <div className="flex flex-col items-center gap-12">
            <a
              href={`tel:${PHONE_NUMBER.replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-3 px-8 sm:px-12 py-5 sm:py-6 rounded-full bg-yellow-400 text-black text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide shadow-[0_28px_70px_rgba(255,212,0,0.45)] hover:bg-yellow-300 transition"
            >
              <PhoneCall className="w-6 h-6" /> {PHONE_NUMBER}
            </a>

            <div className="w-full grid lg:grid-cols-2 gap-8">
              <div className="relative w-full aspect-[4/5] rounded-[28px] border border-white/10 overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
                <Image
                  src="/cover.png"
                  alt="Junk removal flyer"
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
              </div>
              <div className="relative w-full aspect-[4/5] rounded-[28px] border border-white/10 overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
                <Image
                  src="/main.png"
                  alt="Sprinter and trailer capacity"
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
                <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-black/70 border border-white/10 px-5 py-3 text-center text-xl sm:text-2xl font-extrabold text-yellow-300">
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
