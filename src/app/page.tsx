import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Camera, HelpCircle, Mail, MessageCircleQuestion, Phone, Plus, Shovel } from "lucide-react";
import LandingHero from "@/components/LandingHero";
import LandingAppDemo from "@/components/LandingAppDemo";
import LandingFeedback from "@/components/LandingFeedback";
import LandingNav from "@/components/LandingNav";
import LandingSteps from "@/components/LandingSteps";
import ScrollReveal from "@/components/ScrollReveal";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Snow day. Handled. | SNOWD",
  description: "Find local help for your driveway, walkway, and steps. Compare snow clearing prices, request a visit, and get a completion photo with SNOWD.",
};

const SUPPORT_EMAIL = "support@snowd.ca";
const SUPPORT_PHONE = "437-922-3895";

const faqGroups = [
  {
    title: "For homeowners",
    questions: [
      ["How much does snow clearing cost?", "Prices depend on the shoveler and the services you choose. You’ll always see the full price before you send a booking request, with no surprise fees."],
      ["Is there a shoveler near me?", "Create a free account and add your service address to see nearby shovelers. Availability varies by location, weather, and the time you request."],
      ["Can I request help today?", "Yes. Request help as soon as possible or choose a future date. Your booking is confirmed when a shoveler accepts, so same-day service depends on local availability."],
      ["How do I pay?", "Payment options are shown when you book. For card bookings, payment is authorized before work starts and charged when it’s done. For cash bookings, you pay the shoveler directly after the work."],
      ["What if the job isn’t done right?", "Every visit ends with a completion photo. If something’s missed, message your shoveler in the app or contact our support team and we’ll help sort it out."],
    ],
  },
  {
    title: "For shovelers",
    questions: [
      ["Who can become a shoveler?", "Neighbours, students, and small snow companies can all sign up. Create a shoveler account, set your service area, and start accepting nearby requests."],
      ["How and when do I get paid?", "Card payments go straight to your connected payout account once the visit is complete. Cash jobs are paid to you on the spot."],
      ["Can I choose which jobs I take?", "Always. You set your service area and availability, and you can accept or decline each request."],
    ],
  },
];

function Brand() {
  return <Link href="/" aria-label="snowd.ca home" className={styles.brand}><Image src="/logo.png" alt="" width={34} height={38} /><span>snowd<span className={styles.dot}>.ca</span></span></Link>;
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <ScrollReveal />
      <a className={styles.skip} href="#main">Skip to content</a>
      <header className={styles.header}>
        <LandingNav brand={<Brand />} />
      </header>
      <main id="main">
        <LandingHero />

        <section className={styles.how} aria-label="How SNOWD works">
                    <LandingSteps />
        </section>

        <LandingAppDemo />

        <section id="earn" className={styles.earn} aria-labelledby="earn-title">
          <div className={styles.earnImage} data-reveal="left">
            <Image src="/At tims and got a job.jpeg" alt="Two shovelers checking a nearby job on a phone over coffee on a snowy morning" width={825} height={1024} sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
          <div className={styles.earnCopy} data-reveal="right">
            <h2 id="earn-title">Your neighbourhood.<br /><span>Your next job.</span></h2>
            <p>Find snow clearing work close to home, set your own hours, and get paid the same day.</p>
            <ul className={styles.earnPoints}>
              <li><Shovel size={18} aria-hidden="true" />Accept only the jobs you want</li>
              <li><Camera size={18} aria-hidden="true" />Finish with a photo, get paid</li>
            </ul>
            <Link href="/signup?role=operator" className={styles.earnAction}>Become a shoveler <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.faqIntro} data-reveal>
            <p className={styles.eyebrow}><HelpCircle size={16} aria-hidden="true" />Help centre</p>
            <h2 id="faq-title">Questions?<br /><span>We’ve got answers.</span></h2>
            <p>Can’t find what you need? Ask below or reach our support team directly.</p>
          </div>
          <div className={styles.faqBody}>
            <div className={styles.questions}>
              {faqGroups.map(group => (
                <div key={group.title} className={styles.faqGroup} data-reveal>
                  <h3>{group.title}</h3>
                  {group.questions.map(([question, answer]) => <details key={question} className={styles.question}><summary><span>{question}</span><Plus size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}
                </div>
              ))}
            </div>
            <div data-reveal="right"><LandingFeedback /></div>
          </div>
        </section>

        <section className={styles.ready} aria-labelledby="ready-title" data-reveal>
          <h2 id="ready-title">Ready for a clear driveway?</h2>
          <Link href="/signup?role=client" className={`${styles.primary} action-shine`}>Find my shoveler <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerSupport} data-reveal>
            <h2>We’re here to help, <span>all winter long.</span></h2>
            <p>Questions about a booking, a payment, or getting started? Reach us any way you like.</p>
            <div className={styles.supportLinks}>
              <a href={`mailto:${SUPPORT_EMAIL}`}><Mail size={20} aria-hidden="true" /><span><small>Email support</small>{SUPPORT_EMAIL}</span></a>
              <a href={`tel:+1${SUPPORT_PHONE.replaceAll("-", "")}`}><Phone size={20} aria-hidden="true" /><span><small>Call us</small>{SUPPORT_PHONE}</span></a>
              <a href="#ask"><MessageCircleQuestion size={20} aria-hidden="true" /><span><small>No account needed</small>Ask a question</span></a>
            </div>
          </div>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Brand />
              <p>Local snow clearing, booked in a minute. Made for Canadian winters.</p>
            </div>
            <nav aria-label="Homeowners"><h3>Homeowners</h3><Link href="/signup?role=client">Find a shoveler</Link><a href="#demo">Try the live demo</a><a href="#faq">Pricing &amp; payments</a></nav>
            <nav aria-label="Shovelers"><h3>Shovelers</h3><Link href="/signup?role=operator">Become a shoveler</Link><a href="#earn">How earning works</a><Link href="/login">Shoveler log in</Link></nav>
            <nav aria-label="Support"><h3>Support</h3><a href="#faq">Help centre</a><a href="#ask">Send feedback</a><a href={`mailto:${SUPPORT_EMAIL}`}>Contact us</a></nav>
          </div>
          <div className={styles.footerBottom}><span>© {new Date().getFullYear()} SNOWD. All rights reserved.</span><span><Link href="/login">Log in</Link> · <Link href="/signup?role=client">Sign up</Link></span></div>
        </div>
      </footer>
    </div>
  );
}
