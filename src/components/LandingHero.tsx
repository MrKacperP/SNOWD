"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, House, Shovel } from "lucide-react";
import styles from "@/app/landing.module.css";

const ROTATE_MS = 5000;
const slides = [
  {
    role: "client",
    tab: "Need a hand",
    icon: House,
    accent: "Handled.",
    intro: "Local help to clear your driveway, walkway, and steps.",
    cta: "Find my shoveler",
    secondary: "Try the live demo",
    href: "#demo",
    photo: "/PAy screen.jpeg",
    alt: "A shoveler holding a phone beside a cleared driveway as the homeowner waves",
  },
  {
    role: "operator",
    tab: "Lend a hand",
    icon: Shovel,
    accent: "Payday.",
    intro: "Find snow clearing jobs close to home and get paid the same day.",
    cta: "Become a shoveler",
    secondary: "See how earning works",
    href: "#earn",
    photo: "/At tims and got a job.jpeg",
    alt: "Two shovelers checking a nearby job over coffee on a snowy morning",
  },
] as const;

export default function LandingHero() {
  const [active, setActive] = useState(0);
  const [shuffled, setShuffled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const slide = slides[active];

  const show = useCallback((index: number) => {
    setShuffled(true);
    setActive(index);
  }, []);

  useEffect(() => {
    if (hovering) return;
    const timer = window.setTimeout(() => show((active + 1) % slides.length), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [active, hovering, show]);

  return (
    <section className={styles.hero} aria-labelledby="hero-title" aria-roledescription="carousel" data-role={slide.role}>
      <div className={styles.heroCopy} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onFocus={() => setHovering(true)} onBlur={() => setHovering(false)}>
        <div className={styles.heroControls}>
          <div className={styles.roleSwitch} role="tablist" aria-label="Explore SNOWD">
            {slides.map(({ tab, icon: Icon, role }, index) => (
              <button key={role} type="button" role="tab" aria-selected={index === active} aria-controls="hero-content" onClick={() => show(index)}>
                <Icon size={18} aria-hidden="true" />{tab}
                {index === active && <span key={`${active}-${hovering}`} className={styles.roleProgress} data-held={hovering} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
        <div id="hero-content" role="tabpanel" aria-live="off" aria-atomic="true">
          <h1 id="hero-title" key={`title-${active}`}>Snow day.<br /><span className={styles.heroAccent}>{slide.accent}</span></h1>
          <p key={`intro-${active}`} className={styles.intro}>{slide.intro}</p>
          <div className={styles.heroActions}>
            <Link href={`/signup?role=${slide.role}`} className={`${styles.primary} action-shine`}>{slide.cta}<ArrowRight size={18} aria-hidden="true" /></Link>
            <a href={slide.href} className={styles.secondary}>{slide.secondary}<ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      <div className={styles.deck} data-shuffled={shuffled}>
        {slides.map(({ role, photo, alt }, index) => (
          <button
            key={role}
            type="button"
            className={styles.deckCard}
            data-pos={index === active ? "front" : "back"}
            aria-hidden={index !== active}
            tabIndex={-1}
            onClick={() => index !== active && show(index)}
          >
            <Image src={photo} alt={index === active ? alt : ""} width={825} height={1024} priority={index === 0} sizes="(max-width: 900px) 90vw, 46vw" />
          </button>
        ))}
      </div>
    </section>
  );
}
