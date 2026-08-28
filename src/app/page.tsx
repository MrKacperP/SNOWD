"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BellRing,
  Camera,
  CheckCircle2,
  HeartHandshake,
  Home,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Shovel,
  Snowflake,
  Star,
  UsersRound,
} from "lucide-react";

const quickProof = [
  [MapPin, "Local help"],
  [MessageCircle, "Easy chat"],
  [Camera, "Photo proof"],
  [ShieldCheck, "Safe pay"],
];

const signupPaths = [
  {
    title: "I need snow cleared",
    text: "Post the job. Watch it get claimed.",
    cta: "Book help",
    icon: Home,
    dark: true,
  },
  {
    title: "I want snow money",
    text: "Claim nearby jobs when flakes fall.",
    cta: "Start earning",
    icon: Banknote,
    dark: false,
  },
];

const loop = [
  [BellRing, "Snow hits"],
  [UsersRound, "Neighbor accepts"],
  [Shovel, "Path clears"],
  [CheckCircle2, "You approve"],
];

function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="SNOWD home">
      <Image src="/logo.png" alt="" width={64} height={68} priority className="h-11 w-11 object-contain sm:h-12 sm:w-12" />
      <span className="font-headline text-3xl font-black leading-none text-[#071624] sm:text-4xl">
        snowd<span className="text-[#ff6b0a]">.</span>
      </span>
    </Link>
  );
}

function FallingSnow({ dark = false }: { dark?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {[7, 18, 31, 47, 62, 78, 91].map((left, index) => (
        <Snowflake
          key={left}
          className={`absolute -top-8 h-5 w-5 animate-[snowd-fall_linear_infinite] ${dark ? "text-[#071624]/22" : "text-white/75"}`}
          style={{
            left: `${left}%`,
            animationDelay: `${index * 0.62}s`,
            animationDuration: `${14 + index}s`,
          }}
        />
      ))}
    </div>
  );
}

function SnowButton() {
  return (
    <div className="relative mt-8 max-w-xl overflow-hidden rounded-lg border-2 border-[#071624] bg-white p-3 shadow-[7px_7px_0_#071624]">
      <div className="grid min-h-24 grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-[#071624] px-5 text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/52">One tap</p>
          <p className="mt-1 text-3xl font-black leading-none sm:text-4xl">Snowd it.</p>
        </div>
        <Link href="/signup" className="grid h-16 w-16 place-items-center rounded-lg bg-[#ff6b0a] text-[#071624]" aria-label="Sign up for SNOWD">
          <ArrowRight className="h-8 w-8" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm font-black">
        {["Post", "Match", "Cleared"].map((label, index) => (
          <div key={label} className="relative overflow-hidden rounded-md border-2 border-[#071624] bg-[#f8faf7] px-2 py-3">
            <span
              className="absolute inset-x-0 bottom-0 h-1 animate-[snowd-step-fill_4.5s_ease-in-out_infinite] bg-[#16a34a]"
              style={{ animationDelay: `${index * 0.42}s` }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MascotHero() {
  return (
    <div className="relative min-h-[33rem] overflow-hidden rounded-lg bg-[#ff6b0a] lg:min-h-[42rem]">
      <FallingSnow dark />
      <div className="absolute left-6 top-6 rounded-lg border-2 border-[#071624] bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] shadow-[4px_4px_0_#071624]">
        Next storm, less stress
      </div>
      <div className="absolute inset-x-5 bottom-5 z-10 rounded-lg border-2 border-[#071624] bg-white/94 p-4 shadow-[5px_5px_0_#071624] sm:left-7 sm:right-auto sm:w-[23rem]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-black">Driveway claimed</p>
          <span className="flex items-center gap-1 rounded-full bg-[#dcfce7] px-3 py-1 text-sm font-black text-[#166534]">
            <CheckCircle2 className="h-4 w-4" />
            18 min
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#d8eefc]">
          <div className="h-full w-1/2 animate-[snowd-progress-load_3.8s_ease-in-out_infinite] rounded-full bg-[#071624]" />
        </div>
      </div>
      <Image
        src="/landing/snowd-mascot-helper-cutout.png"
        alt="SNOWD mascot holding a shovel and confirmation phone"
        width={760}
        height={760}
        priority
        className="absolute -bottom-16 right-[-4.5rem] h-[28rem] w-[28rem] animate-[snowd-hero-bob_4.8s_ease-in-out_infinite] object-contain sm:right-[-2rem] sm:h-[36rem] sm:w-[36rem] lg:h-[44rem] lg:w-[44rem]"
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8faf7] text-[#071624]">
      <nav className="sticky top-0 z-50 flex min-h-20 items-center justify-between border-b-2 border-[#071624] bg-[#f8faf7]/94 px-4 py-3 backdrop-blur sm:px-8 lg:px-14">
        <BrandLogo />
        <div className="hidden items-center gap-8 text-sm font-black uppercase tracking-[0.12em] md:flex">
          <Link href="#join">Join</Link>
          <Link href="#why">Why it works</Link>
          <Link href="/login">Log in</Link>
        </div>
        <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#071624] px-5 text-sm font-black uppercase tracking-[0.1em] !text-white sm:px-6">
          Sign up
        </Link>
      </nav>

      <section className="grid gap-5 px-4 py-5 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-14">
        <div className="relative overflow-hidden rounded-lg border-2 border-[#071624] bg-[#ff6b0a] p-6 shadow-[7px_7px_0_#071624] sm:p-9 lg:min-h-[42rem]">
          <FallingSnow dark />
          <div className="relative z-10">
            <p className="inline-flex items-center gap-3 text-sm font-black uppercase tracking-[0.22em]">
              <Star className="h-6 w-6 fill-[#071624]" />
              Snow help is close
            </p>
            <h1 className="mt-6 max-w-3xl font-headline text-[clamp(4.6rem,10vw,9.6rem)] font-black lowercase leading-[0.78]">
              winter just got easier.
            </h1>
            <p className="mt-6 max-w-xl text-[clamp(1.25rem,2vw,1.8rem)] font-black leading-snug text-[#071624]/78">
              Book a nearby shoveler. Or earn clearing snow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-16 items-center justify-center rounded-lg bg-[#071624] px-7 text-lg font-black !text-white">
                Get snow removed <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
              <Link href="/signup" className="inline-flex min-h-16 items-center justify-center rounded-lg border-2 border-[#071624] bg-white px-7 text-lg font-black shadow-[4px_4px_0_#071624]">
                Earn nearby
              </Link>
            </div>
            <SnowButton />
          </div>
        </div>

        <MascotHero />
      </section>

      <section className="grid gap-3 px-4 pb-10 sm:grid-cols-4 sm:px-8 lg:px-14">
        {quickProof.map(([Icon, label]) => {
          const IconComponent = Icon as typeof MapPin;
          return (
            <div key={label as string} className="flex min-h-20 items-center gap-3 rounded-lg border-2 border-[#071624] bg-white p-4 shadow-[4px_4px_0_#071624]">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#ffedd5] text-[#071624]">
                <IconComponent className="h-5 w-5" />
              </div>
              <p className="text-lg font-black">{label as string}</p>
            </div>
          );
        })}
      </section>

      <section id="join" className="grid gap-5 px-4 py-10 sm:px-8 lg:grid-cols-2 lg:px-14">
        {signupPaths.map(({ title, text, cta, icon: Icon, dark }) => (
          <article
            key={title}
            className={`rounded-lg border-2 border-[#071624] p-6 shadow-[6px_6px_0_#071624] sm:p-8 ${
              dark ? "bg-[#071624] text-white" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-5">
              <h2 className="max-w-lg text-[clamp(2.4rem,5vw,4.4rem)] font-black lowercase leading-[0.84]">{title}</h2>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#ff6b0a] text-[#071624]">
                <Icon className="h-7 w-7" />
              </div>
            </div>
            <p className={`mt-5 max-w-xl text-xl font-bold leading-snug ${dark ? "text-white/76" : "text-[#3f5263]"}`}>{text}</p>
            <Link href="/signup" className={`mt-7 inline-flex min-h-14 items-center rounded-lg px-6 text-lg font-black ${dark ? "bg-white text-[#071624]" : "bg-[#071624] text-white"}`}>
              {cta} <ArrowRight className="ml-3 h-5 w-5" />
            </Link>
          </article>
        ))}
      </section>

      <section id="why" className="px-4 py-10 sm:px-8 lg:px-14">
        <div className="grid gap-5 rounded-lg border-2 border-[#071624] bg-[#d8eefc] p-5 shadow-[7px_7px_0_#071624] sm:p-8 lg:grid-cols-[0.72fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#587085]">Why people return</p>
            <h2 className="mt-4 max-w-3xl font-headline text-[clamp(3rem,7vw,6.8rem)] font-black lowercase leading-[0.84]">
              it remembers the hard part.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {loop.map(([Icon, label], index) => {
              const IconComponent = Icon as typeof BellRing;
              return (
                <div key={label as string} className="relative overflow-hidden rounded-lg border-2 border-[#071624] bg-white p-5">
                  <span
                    className="absolute inset-x-0 bottom-0 h-1 animate-[snowd-step-fill_4.5s_ease-in-out_infinite] bg-[#ff6b0a]"
                    style={{ animationDelay: `${index * 0.42}s` }}
                  />
                  <IconComponent className="h-8 w-8 text-[#ff6b0a]" />
                  <p className="mt-8 text-2xl font-black leading-tight">{label as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 lg:px-14">
        <div className="relative overflow-hidden rounded-lg bg-[#ff6b0a] p-7 text-[#071624] sm:p-10">
          <Image
            src="/landing/snowd-mascot-helper-cutout.png"
            alt=""
            width={320}
            height={320}
            className="absolute -bottom-14 right-0 h-56 w-56 object-contain opacity-90 sm:h-72 sm:w-72"
          />
          <div className="relative z-10 max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
              <Star className="h-5 w-5 fill-[#071624]" />
              Next storm, less stress
            </p>
            <h2 className="mt-4 max-w-2xl text-[clamp(2.8rem,6vw,5.8rem)] font-black lowercase leading-[0.86]">
              join before it piles up.
            </h2>
            <Link href="/signup" className="mt-8 inline-flex min-h-16 items-center rounded-lg bg-[#071624] px-7 text-lg font-black !text-white">
              Sign up now <ArrowRight className="ml-3 h-6 w-6" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-6 border-t-2 border-[#071624] px-5 py-10 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-16">
        <BrandLogo />
        <p className="max-w-xl text-lg font-bold text-[#587085]">SNOWD connects people who need clear paths with neighbors ready to help.</p>
      </footer>
    </main>
  );
}
