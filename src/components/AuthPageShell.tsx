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

function AuthBrandLogo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <Image
        src="/logo.png"
        alt=""
        width={48}
        height={52}
        priority
        className="h-10 w-10 object-contain sm:h-12 sm:w-12"
      />
      <span className="font-headline text-3xl font-black leading-none text-[#061321] sm:text-4xl">
        snowd<span className="text-[#ff820e]">.</span>
      </span>
    </Link>
  );
}

function FallingSnow() {
  const flakes = [
    "left-[10%] top-[-8%] [animation-delay:0s] [animation-duration:13s]",
    "left-[26%] top-[-14%] [animation-delay:2s] [animation-duration:16s]",
    "left-[50%] top-[-10%] [animation-delay:5s] [animation-duration:14s]",
    "left-[72%] top-[-15%] [animation-delay:1s] [animation-duration:18s]",
    "left-[91%] top-[-9%] [animation-delay:4s] [animation-duration:15s]",
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {flakes.map((flake) => (
        <Snowflake
          key={flake}
          className={`absolute h-6 w-6 motion-safe:animate-[snowd-fall_linear_infinite] text-[#061321]/12 ${flake}`}
          strokeWidth={2.5}
        />
      ))}
    </div>
  );
}

export default function AuthPageShell({
  eyebrow,
  title,
  body,
  features,
  children,
}: AuthPageShellProps) {
  return (
    <main className="auth-page relative min-h-dvh bg-[#f3f8fb] px-3 py-3 text-[#061321] sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <FallingSnow />
      <div className="auth-frame relative z-10 mx-auto grid min-h-[calc(100dvh-3rem)] max-w-[1320px] overflow-hidden rounded-[1.35rem] border-[3px] border-[#061321] bg-[#f3f8fb] shadow-[6px_6px_0_#061321] lg:grid-cols-[minmax(390px,0.74fr)_minmax(0,1fr)] xl:grid-cols-[minmax(420px,0.78fr)_minmax(0,1fr)]">
        <section className="auth-form-section flex min-h-0 flex-col bg-[#f3f8fb] p-4 sm:p-5 lg:border-r-[3px] lg:border-[#061321] lg:p-6 xl:p-8">
          <AuthBrandLogo />
          <div className="auth-form-content mx-auto flex min-h-0 w-full max-w-[460px] flex-1 flex-col justify-center py-3 sm:py-4 lg:py-5">
            {children}
          </div>
        </section>

        <section className="relative hidden min-h-0 overflow-hidden bg-[#061321] p-6 text-white lg:flex xl:p-8">
          <div className="relative z-10 flex min-h-0 w-full flex-col justify-between gap-5">
            <div>
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border-[3px] border-white bg-[#ff820e] px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-[#061321]">
                <Snowflake className="h-4 w-4" strokeWidth={3} />
                {eyebrow}
              </div>
              <h1 className="mt-5 max-w-3xl font-headline text-[clamp(3.15rem,6.4vw,6.8rem)] font-black lowercase leading-[0.82] tracking-normal">
                {title}
                <span className="text-[#ff820e]">.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-black leading-snug text-white/68 xl:text-xl">
                {body}
              </p>
            </div>

            <div className="grid min-h-0 gap-3 xl:grid-cols-[0.9fr_1.1fr] xl:items-end">
              <div className="grid gap-3">
                {features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border-[3px] border-white/18 bg-white/7 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#ff820e]"
                        strokeWidth={3}
                      />
                      <p className="text-sm font-black leading-5 text-white/78">
                        {feature}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative hidden min-h-[218px] overflow-hidden rounded-[1.5rem] border-[3px] border-white bg-[#dfeef8] p-5 text-[#061321] xl:block">
                <div className="relative z-10">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#061321]/50">
                    live request
                  </p>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-headline text-2xl font-black leading-none">
                        Driveway + steps
                      </h2>
                      <p className="mt-2 text-base font-black text-[#5e6873]">
                        14 Maple St · 0.3 mi
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#ff820e] px-3 py-2 text-2xl font-black">
                      $32
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      ["Snow", "4in"],
                      ["ETA", "45m"],
                      ["Match", "4m"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border-[3px] border-[#061321] bg-white px-3 py-3"
                      >
                        <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#061321]/48">
                          {label}
                        </p>
                        <p className="mt-1.5 text-xl font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Image
                  src="/logo.png"
                  alt=""
                  width={300}
                  height={320}
                  className="absolute -bottom-20 -right-14 h-56 w-56 rotate-[-9deg] object-contain opacity-30"
                />
              </div>
            </div>
          </div>
          <Image
            src="/logo.png"
            alt=""
            width={580}
            height={620}
            className="pointer-events-none absolute -right-28 top-24 h-[28rem] w-[28rem] rotate-[-8deg] object-contain opacity-10"
          />
        </section>
      </div>
    </main>
  );
}
