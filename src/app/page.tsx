import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import LandingPhone from "@/components/LandingPhone";
import LandingHero from "@/components/LandingHero";
import LandingProductShowcase from "@/components/LandingProductShowcase";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Snow day. Handled. | SNOWD",
  description: "Find local help for your driveway, walkway, and steps. Compare snow clearing prices, request a visit, and get a completion photo with SNOWD.",
};

const questions = [
  ["How much does snow clearing cost?", "Prices depend on the shoveler and the services you choose. You’ll see the price before you send a booking request."],
  ["Is there a shoveler near me?", "Create an account and add your service address to see nearby shovelers. Availability varies by location, weather, and the time you request."],
  ["Can I request help today?", "You can request help as soon as possible or choose a future date. Your booking is confirmed when a shoveler accepts, so same-day service depends on local availability."],
  ["How do I pay?", "Available payment options are shown when you book. For card bookings, payment is authorized before work starts. For cash bookings, you pay the shoveler directly after the work."],
];

function Brand() {
  return <Link href="/" aria-label="snowd.ca home" className={styles.brand}><Image src="/logo.png" alt="" width={34} height={38} /><span>snowd<span className={styles.dot}>.ca</span></span></Link>;
}
function FindHelp({ shine = false }: { shine?: boolean }) {
  return <Link href="/signup?role=client" className={`${styles.primary}${shine ? " action-shine" : ""}`}>Find my shoveler <ArrowRight size={18} aria-hidden="true" /></Link>;
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main">Skip to content</a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Brand />
          <div className={styles.navLinks}>
            <a href="#how" className={styles.howLink}>See the app</a>
            <Link href="/signup?role=operator" className={styles.operatorLink}>Earn with SNOWD <ArrowUpRight size={14} aria-hidden="true" /></Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup?role=client" className={styles.navSignup}>Sign up <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </nav>
      </header>
      <main id="main">
        <LandingHero />
        <LandingProductShowcase />
        <section id="demo" className={styles.demoSection} aria-labelledby="demo-title">
          <div className={styles.demoInner}>
            <div className={styles.demoCopy}>
              <h2 id="demo-title">Try it yourself.</h2>
              <p className={styles.demoIntro}>Tap through a sample booking.</p>
            </div>
            <div className={styles.demoPanel}><p className={styles.demoLabel}>Interactive demo · No real booking</p><LandingPhone /></div>
          </div>
        </section>
        <section id="earn" className={styles.earn} aria-labelledby="earn-title">
          <div className={styles.earnImage}>
            <Image src="/At tims and got a job.jpeg" alt="Two shovelers checking a nearby job on a phone over coffee on a snowy morning" width={825} height={1024} sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
          <div className={styles.earnCopy}>
            <h2 id="earn-title">Your neighbourhood.<br /><span>Your next job.</span></h2>
            <p>Find snow clearing work close to home.</p>
            <Link href="/signup?role=operator" className={styles.earnAction}>Become a shoveler <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <h2 id="faq-title">Good to know.</h2>
          <div className={styles.questions}>{questions.map(([question, answer]) => <details key={question} className={styles.question}><summary><span>{question}</span><Plus size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className={styles.ready} aria-labelledby="ready-title"><h2 id="ready-title">Ready for a clear driveway?</h2><FindHelp /></section>
      </main>
      <footer className={styles.footer}><Brand /><nav aria-label="Footer navigation"><a href="#faq">Questions</a><Link href="/signup?role=operator">For shovelers</Link><Link href="/login">Log in</Link></nav></footer>
      <div className={styles.signature} aria-hidden="true">snowd<span>.ca</span></div>
    </div>
  );
}
