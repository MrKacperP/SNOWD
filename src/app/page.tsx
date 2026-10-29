import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";
import LandingPhone from "@/components/LandingPhone";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Snow day. Handled.",
  description: "Find local snow clearing for your driveway, walkway, and steps. Compare prices, request a visit, and receive a completion photo.",
};
const steps = [
  ["Find a shoveler", "Add your address and compare nearby shovelers and prices."],
  ["Request a visit", "Choose your services and time. Your shoveler confirms the booking."],
  ["See it finished", "Message your shoveler and receive a photo of the cleared areas."],
];
const questions = [
  ["Is there help near me?", "Add your address after signup to see nearby shovelers. Availability depends on your location, weather, and requested time."],
  ["How much does it cost?", "Prices depend on the shoveler and services you choose. You’ll see the total before sending a request."],
  ["Can I book for today?", "Request help as soon as possible or choose a future date. Your visit is confirmed when a shoveler accepts."],
  ["How do I pay?", "Payment options appear when you book. Cards are authorized before work and charged after completion. For cash visits, pay the shoveler after the work."],
];
function Brand() {
  return <Link href="/" aria-label="SNOWD home" className={styles.brand}><Image src="/logo.png" alt="" width={34} height={38} /><span>snowd<span className={styles.dot}>.ca</span></span></Link>;
}
function FindHelp() {
  return <Link href="/signup?role=client" className={styles.primary}>Find a shoveler <ArrowRight size={18} aria-hidden="true" /></Link>;
}
export default function HomePage() {
  return <div className={styles.page}>
    <a className={styles.skip} href="#main">Skip to content</a>
    <header className={styles.header}><nav className={styles.nav} aria-label="Main navigation">
      <Brand /><div className={styles.navLinks}><Link href="/signup?role=operator" className={styles.operatorLink}>Become a shoveler</Link><Link href="/login">Log in</Link></div>
    </nav></header>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div><h1 id="hero-title">Snow day.<br /><span>Handled.</span></h1><p className={styles.intro}>Local help to clear your driveway, walkway, and steps.</p><div className={styles.heroActions}><FindHelp /><a href="#demo" className={styles.secondary}>Try the demo <ArrowRight size={16} aria-hidden="true" /></a></div></div>
        <div className={styles.heroImage}><Image src="/landing/snowd-neighborhood-hero-v2.png" alt="A snowy neighbourhood with neighbours clearing a driveway" fill priority sizes="(max-width: 760px) 100vw, 45vw" /></div>
      </section>
      <section id="how" className={styles.how} aria-labelledby="how-title"><h2 id="how-title">From snowfall to all clear.</h2><ol className={styles.steps}>{steps.map(([title, description]) => <li key={title}><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
      <section id="demo" className={styles.demoSection} aria-labelledby="demo-title"><div className={styles.demoCopy}><h2 id="demo-title">Try a booking.</h2><p>Sample demo. No request or payment is sent.</p></div><LandingPhone /></section>
      <section id="faq" className={styles.faq} aria-labelledby="faq-title"><h2 id="faq-title">Questions?</h2><div>{questions.map(([question, answer]) => <details key={question} className={styles.question}><summary><span>{question}</span><Plus size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
      <section id="earn" className={styles.earn} aria-labelledby="earn-title"><div><h2 id="earn-title">Earn close to home.</h2><p>Choose your services, prices, and service area.</p></div><Link href="/signup?role=operator" className={styles.primary}>Become a shoveler <ArrowRight size={18} aria-hidden="true" /></Link></section>
    </main>
    <footer className={styles.footer}><Brand /><nav aria-label="Footer navigation"><a href="#faq">Questions</a><Link href="/login">Log in</Link></nav></footer>
  </div>;
}
