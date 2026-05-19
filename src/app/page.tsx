"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  MapPin,
  MessageSquare,
  Snowflake,
  Star,
} from "lucide-react";

const steps = [
  {
    label: "Step 01",
    title: "Drop your address",
    body: "Set your driveway, walkway, and timing. We ping nearby shovelers the second snow needs clearing.",
    icon: MapPin,
  },
  {
    label: "Step 02",
    title: "Chat. Clear.",
    body: "Message in-app, lock the price, show up, move snow, and snap the before/after.",
    icon: MessageSquare,
    dark: true,
  },
  {
    label: "Step 03",
    title: "Cash lands",
    body: "Payment releases once the homeowner approves. No awkward porch convos. No chasing.",
    icon: Banknote,
  },
];

const stats = [
  ["$847", "Avg / winter"],
  ["4 min", "Match time"],
  ["90%", "Payout to you"],
  ["0", "Dads to Venmo"],
];

function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image src="/logo.png" alt="" width={64} height={68} priority className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
      <span className="font-headline text-4xl font-black leading-none tracking-normal text-[#061321]">
        snowd<span className="text-[#ff820e]">.</span>
      </span>
    </Link>
  );
}

function FallingSnow() {
  const flakes = [
    "left-[14%] top-[-8%] [animation-delay:0s] [animation-duration:13s]",
    "left-[28%] top-[-12%] [animation-delay:2s] [animation-duration:16s]",
    "left-[46%] top-[-10%] [animation-delay:5s] [animation-duration:14s]",
    "left-[67%] top-[-14%] [animation-delay:1s] [animation-duration:18s]",
    "left-[88%] top-[-9%] [animation-delay:4s] [animation-duration:15s]",
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {flakes.map((flake) => (
        <Snowflake
          key={flake}
          className={`absolute h-6 w-6 animate-[snowd-fall_linear_infinite] text-[#061321]/12 ${flake}`}
          strokeWidth={2.5}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f8fb] text-[#061321]">
      <nav className="flex min-h-20 items-center justify-between border-b-[3px] border-[#061321] px-4 py-2 sm:px-8 lg:px-14">
        <BrandLogo />
        <div className="hidden items-center gap-9 text-lg font-black md:flex">
          <Link href="#how">How it works</Link>
          <Link href="#paid">Get paid</Link>
          <Link href="/signup" className="rounded-full bg-[#061321] px-8 py-4 !text-white">
            Open app
          </Link>
        </div>
      </nav>

      <section className="relative flex min-h-[calc(100svh-5rem)] overflow-hidden px-4 pb-6 pt-8 sm:px-8 sm:pt-12 lg:px-14 lg:pt-14">
        <FallingSnow />
        <div className="relative z-10 flex w-full flex-col justify-between gap-6">
          <div className="inline-flex w-fit max-w-full items-center gap-3 rounded-full border-[3px] border-[#061321] bg-[#dfeef8] px-4 py-3 text-[0.68rem] font-black uppercase tracking-[0.26em] sm:px-6 sm:text-sm lg:text-base">
            <span className="h-3 w-3 rounded-full bg-[#ffae72]" />
            Now matching shovelers near you
          </div>

          <h1 className="relative max-w-[76rem] font-headline text-[clamp(4.25rem,13vw,13.4rem)] font-black lowercase leading-[0.78] tracking-normal">
            <span className="relative inline-block">
              clear
              <span className="absolute -right-8 -top-3 grid h-9 w-12 rotate-[-8deg] grid-cols-[1fr_1.35fr_1fr] overflow-hidden rounded-sm border-2 border-[#061321] bg-white shadow-[4px_4px_0_#061321] sm:-right-12 sm:h-12 sm:w-16">
                <span className="bg-[#e31b23]" />
                <span className="grid place-items-center text-[10px] font-black uppercase leading-none text-[#e31b23] sm:text-xs">CA</span>
                <span className="bg-[#e31b23]" />
              </span>
            </span>
            <span className="block">
              the
              <span className="relative mx-[0.04em] inline-block h-[0.72em] w-[0.72em] align-[-0.1em]">
                <Image src="/logo.png" alt="SNOWD penguin mascot" fill priority sizes="24vw" className="object-contain" />
              </span>
              block<span className="text-[#ff820e]">.</span>
            </span>
          </h1>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(390px,0.7fr)] lg:items-end">
            <p className="max-w-3xl text-[clamp(1.2rem,2.05vw,2.25rem)] font-black leading-[1.12] tracking-normal">
              SNOWD is the neighborhood marketplace where{" "}
              <span className="rounded-lg bg-[#ff820e] px-2">locals</span>{" "}
              clear driveways and homeowners stop pretending the snow is not there.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/signup" className="flex min-h-28 items-center justify-center rounded-[1.5rem] bg-[#061321] px-5 text-center text-xl font-black !text-white lg:min-h-32 lg:text-2xl">
                I want to shovel <ArrowRight className="ml-2 h-6 w-6" />
              </Link>
              <Link href="/signup" className="flex min-h-28 items-center justify-center rounded-[1.5rem] border-[3px] border-[#061321] px-5 text-center text-xl font-black lg:min-h-32 lg:text-2xl">
                I need shoveling
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative grid gap-6 px-4 py-16 sm:px-8 lg:grid-cols-[1.2fr_0.9fr] lg:px-14">
        <div className="relative overflow-hidden rounded-[1.6rem] bg-[#061321] p-6 text-white sm:p-8 lg:p-10">
          <div className="relative z-10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white/58">New request · 2 min ago</p>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2 className="font-headline text-[clamp(2rem,3.6vw,3.8rem)] font-black leading-none">Driveway + front steps</h2>
                <p className="mt-3 text-xl font-bold text-white/70">14 Maple St · 0.3 mi from you</p>
              </div>
              <div className="text-left lg:text-right">
                <div className="text-[clamp(3rem,5vw,5rem)] font-black leading-none text-[#ff820e]">$32</div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/58">Est. payout</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Snow", "4\""],
                ["Size", "Medium"],
                ["ETA", "45m"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/20 bg-white/5 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/58">{label}</p>
                  <p className="mt-3 text-3xl font-black">{value}</p>
                </div>
              ))}
            </div>

            <Link href="/signup" className="mt-8 flex min-h-16 items-center justify-center rounded-2xl border-[3px] border-white bg-[#ff820e] text-2xl font-black text-[#061321]">
              Accept job <ArrowRight className="ml-3 h-7 w-7" />
            </Link>
          </div>
          <Image src="/logo.png" alt="" width={360} height={386} className="absolute -bottom-24 -right-14 h-72 w-72 rotate-[-9deg] object-contain opacity-35" />
        </div>

        <div className="rounded-[1.6rem] border-[3px] border-[#061321] bg-[#dfeef8] p-6 sm:p-8">
          <div className="flex items-center gap-4 border-b-[3px] border-[#061321]/10 pb-5">
            <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-[#061321] text-xl font-black">M</div>
            <div>
              <h3 className="text-2xl font-black">Mrs. Patel</h3>
              <p className="text-lg font-black text-[#6e7883]">Homeowner · online</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 text-xl font-black">
            <div className="max-w-[86%] rounded-2xl border-[3px] border-[#061321] bg-[#f3f8fb] px-5 py-4">Hey! Could you also do the back patio?</div>
            <div className="ml-auto max-w-[86%] rounded-2xl border-[3px] border-[#061321] bg-[#ff820e] px-5 py-4">Sure — +$8 for the patio. Cool?</div>
            <div className="max-w-[86%] rounded-2xl border-[3px] border-[#061321] bg-[#f3f8fb] px-5 py-4">Deal. Door&apos;s unlocked, hot cocoa inside.</div>
          </div>
          <div className="mt-7 flex gap-3">
            <div className="flex min-h-14 flex-1 items-center rounded-full border-[3px] border-[#061321] px-5 text-xl font-bold text-[#061321]/42">Message Mrs. Patel...</div>
            <button className="grid h-14 w-14 place-items-center rounded-full bg-[#061321] text-white" type="button" aria-label="Send message">
              <ArrowRight className="h-7 w-7" />
            </button>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y-[3px] border-[#061321] bg-[#ff820e] py-5 text-[clamp(1.5rem,3vw,3.2rem)] font-black uppercase leading-none">
        <div className="flex w-max animate-[snowd-marquee_18s_linear_infinite] items-center gap-10 px-5">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-10">
              <span>Snow days = pay days</span>
              <Star className="h-9 w-9 fill-[#061321]" />
              <span>Your block, your bag</span>
              <Star className="h-9 w-9 fill-[#061321]" />
            </div>
          ))}
        </div>
      </div>

      <section id="how" className="px-4 py-20 sm:px-8 lg:px-14">
        <h2 className="max-w-5xl font-headline text-[clamp(3.4rem,8vw,9rem)] font-black lowercase leading-[0.84] tracking-normal">
          three steps<span className="text-[#ff820e]">.</span>
          <br />
          that&apos;s the app<span className="text-[#ff820e]">.</span>
        </h2>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {steps.map(({ label, title, body, icon: Icon, dark }) => (
            <article
              key={label}
              className={`min-h-[24rem] rounded-[1.6rem] border-[3px] border-[#061321] p-6 sm:p-8 ${
                dark ? "bg-[#061321] text-white" : "bg-[#f3f8fb] text-[#061321]"
              }`}
            >
              <div className="flex items-start justify-between gap-6">
                <p className={`text-base font-black uppercase tracking-[0.18em] ${dark ? "text-white/52" : "text-[#061321]/48"}`}>{label}</p>
                <div className={`grid h-16 w-16 place-items-center rounded-2xl border-[3px] border-[#061321] ${dark ? "bg-[#f3f8fb] text-[#061321]" : "bg-[#ff820e]"}`}>
                  <Icon className="h-7 w-7" />
                </div>
              </div>
              <h3 className="mt-16 text-[clamp(2rem,3vw,3.1rem)] font-black leading-none">{title}</h3>
              <p className={`mt-6 text-xl font-bold leading-snug ${dark ? "text-white/70" : "text-[#5e6873]"}`}>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="paid" className="grid gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.82fr] lg:items-center lg:px-14">
        <div>
          <h2 className="max-w-4xl font-headline text-[clamp(3.8rem,8vw,10rem)] font-black lowercase leading-[0.84] tracking-normal">
            move
            <br />
            snow<span className="text-[#ff820e]">.</span>
            <br />
            not money<span className="text-[#ff820e]">.</span>
          </h2>
          <p className="mt-8 max-w-3xl text-[clamp(1.35rem,2.1vw,2.35rem)] font-black leading-snug text-[#5e6873]">
            Homeowners pay in-app. Shovelers keep 90%. We hold funds until both sides give the thumbs up.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-[1.4rem] border-[3px] border-[#061321] p-5 sm:p-6">
              <p className="text-[clamp(2.4rem,4.5vw,4rem)] font-black leading-none">{value}</p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-[#061321]/52">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-8 lg:px-14">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-[#061321] p-8 text-white sm:p-12 lg:min-h-[28rem]">
          <div className="relative z-10 max-w-4xl">
            <p className="text-base font-black uppercase tracking-[0.22em] text-[#ff820e]">It&apos;s snowing</p>
            <h2 className="mt-6 font-headline text-[clamp(3.3rem,7vw,7.8rem)] font-black lowercase leading-[0.84] tracking-normal">
              snowd over.
              <br />
              get the bag<span className="text-[#ff820e]">.</span>
            </h2>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-16 items-center justify-center rounded-2xl border-[3px] border-white bg-[#ff820e] px-8 text-2xl font-black text-[#061321]">
                Get the app <ArrowRight className="ml-3 h-7 w-7" />
              </Link>
              <Link href="/signup" className="inline-flex min-h-16 items-center justify-center rounded-2xl border-[3px] border-white px-8 text-2xl font-black !text-white">
                Post a driveway
              </Link>
            </div>
          </div>
          <Image src="/logo.png" alt="SNOWD penguin mascot" width={760} height={814} className="absolute -bottom-32 -right-20 h-[28rem] w-[28rem] object-contain sm:h-[36rem] sm:w-[36rem]" />
        </div>
      </section>

      <footer className="flex flex-col gap-6 border-t-[3px] border-[#061321] px-5 py-10 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-16">
        <BrandLogo />
        <p className="text-xl font-black text-[#061321]/56">© 2026 SNOWD Inc. · Built for people who hate driveways.</p>
      </footer>
    </main>
  );
}
