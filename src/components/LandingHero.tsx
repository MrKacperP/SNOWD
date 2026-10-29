"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, House, Shovel } from "lucide-react";
import styles from "@/app/landing.module.css";

export default function LandingHero() {
  const [role, setRole] = useState<"client" | "operator">("client");
  const isClient = role === "client";

  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-role={role}>
      <div className={styles.heroCopy}>
        <div className={styles.roleSwitch} role="group" aria-label="Explore SNOWD">
          <button type="button" aria-pressed={isClient} aria-controls="hero-content" onClick={() => setRole("client")}><House size={18} aria-hidden="true" />Need a hand</button>
          <button type="button" aria-pressed={!isClient} aria-controls="hero-content" onClick={() => setRole("operator")}><Shovel size={18} aria-hidden="true" />Lend a hand</button>
        </div>
        <div id="hero-content" aria-live="polite" aria-atomic="true">
          <h1 id="hero-title">Snow day.<br /><span>{isClient ? "Handled." : "Payday."}</span></h1>
          <p className={styles.intro}>{isClient ? <>Local help to clear your driveway, walkway, and steps.</> : <>Find snow clearing jobs close to home.</>}</p>
          <div className={styles.heroActions}>
            <Link href={`/signup?role=${role}`} className={`${styles.primary} action-shine`}>{isClient ? "Find my shoveler" : "Become a shoveler"}<ArrowRight size={18} aria-hidden="true" /></Link>
            <a href={isClient ? "#demo" : "#earn"} className={styles.secondary}>{isClient ? "Try the demo" : "See how it works"}<ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      <div className={styles.heroImage}>
        <Image className={styles.heroPhoto} data-visible={isClient} aria-hidden={!isClient} src="/PAy screen.jpeg" alt={isClient ? "A shoveler holding a phone beside a cleared driveway as the homeowner waves" : ""} width={825} height={1024} priority sizes="(max-width: 900px) 100vw, 50vw" />
        <Image className={styles.heroPhoto} data-visible={!isClient} aria-hidden={isClient} src="/At tims and got a job.jpeg" alt={!isClient ? "Two shovelers checking a nearby job over coffee on a snowy morning" : ""} width={825} height={1024} sizes="(max-width: 900px) 100vw, 50vw" />
      </div>
    </section>
  );
}
