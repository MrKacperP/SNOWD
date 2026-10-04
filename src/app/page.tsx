import GlassRefraction from "@/components/ui/GlassRefraction";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shovel, Check, ArrowUpRight, House, CalendarDays, Camera } from "lucide-react";
import styles from "./landing.module.css";
import LandingPhone from "@/components/LandingPhone";
import LandingProductShowcase from "@/components/LandingProductShowcase";

const steps = [
  ["Find help nearby.", "Add your address to see local shovelers who can clear your driveway, walkway, or steps."],
  ["Choose a time and price.", "Pick a shoveler, review the price, and request a time that works for you. They’ll confirm the visit."],
  ["Know when it’s done.", "Get updates and a completion photo, so you know when the snow has been cleared."],
];

function StepPreview({ step }: { step: number }) {
  return (
    <div className={`${styles.stepPreview} ${styles[`preview${step}`]}`} aria-hidden="true">
      {step === 0 ? (
        <>
          <div className={styles.mapRoad} />
          <House className={styles.mapHouseOne} size={30} strokeWidth={1.5} />
          <House className={styles.mapHouseTwo} size={25} strokeWidth={1.5} />
          <div className={styles.homePin}><House size={23} /><span>You’re here</span></div>
          <div className={styles.helperPin}><Shovel size={21} /></div>
          <div className={styles.nearbyLabel}><span /> A helping hand, nearby</div>
        </>
      ) : step === 1 ? (
        <div className={styles.visitPreview}>
          <div className={styles.visitHeading}><CalendarDays size={20} /><span>Your snow day plan</span></div>
          <div className={styles.visitRow}><span>The spot</span><strong>Driveway & walkway</strong></div>
          <div className={styles.visitRow}><span>The timing</span><strong>You choose</strong></div>
          <div className={styles.requestPreview}>Request your visit <ArrowUpRight size={16} /></div>
        </div>
      ) : (
        <>
          <div className={styles.photoPreview}><Image src="/landing/snowd-cleared-driveway.png" alt="" fill sizes="180px" /><span><Camera size={17} /></span></div>
          <div className={styles.donePreview}><span><Check size={18} /></span><div>Snow cleared.<small>Time for something better.</small></div></div>
        </>
      )}
    </div>
  );
}
const questions = [
  [
    "How much does it cost?",
    "Prices depend on the shoveler and the services you choose. You’ll see the price before you send a booking request.",
  ],
  [
    "Can I get help today?",
    "You can request help as soon as possible or choose a future date. Availability depends on nearby shovelers and the weather. Your booking is confirmed when the shoveler accepts.",
  ],
  [
    "How do I pay?",
    "Available payment options are shown when you book. For card bookings, payment is authorized before work starts. For cash bookings, you pay the shoveler directly after the work.",
  ],
];
function Brand() {
  return (
    <Link href="/" aria-label="SNOWD home" className={styles.brand}>
      <Image src="/logo.png" alt="" width={34} height={38} />
      <span>
        snowd<span className={styles.dot}>.</span>
      </span>
    </Link>
  );
}
function FindHelp() {
  return (
    <Link href="/signup?role=client" className={styles.primary}>
      Find a shoveler <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}
export default function HomePage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <GlassRefraction />
          <Brand />
          <div className={styles.navLinks}>
            <a href="#how" className={styles.howLink}>
              How it works
            </a>
            <Link href="/signup?role=operator">Become a shoveler</Link>
            <Link href="/login" className={styles.login}>
              Log in
            </Link>
          </div>
        </nav>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <h1 id="hero-title">
              Snow day.
              <br />
              <span>Handled.</span>
            </h1>
            <p className={styles.intro}>
              A clear driveway. A little more time. Find someone local to take snow clearing off your hands.
            </p>
            <div className={styles.heroActions}><FindHelp /><a href="#how" className={styles.secondary}>See how it works <ArrowUpRight size={17} aria-hidden="true" /></a></div>
          </div>
          <LandingPhone />
        </section>
        <div className={styles.serviceStrip}><p><Check size={16} aria-hidden="true" /> Driveways</p><p><Check size={16} aria-hidden="true" /> Walkways</p><p><Check size={16} aria-hidden="true" /> Steps & entrances</p></div>
        <LandingProductShowcase />
        <section id="how" className={styles.how} aria-labelledby="how-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>How it works</p>
            <h2 id="how-title">Snow clearing made simple.<br /><span>Help from someone nearby.</span></h2>
          </div>
          <ol className={styles.steps}>
            {steps.map(([title, description], index) => (
              <li key={title}>
                <StepPreview step={index} />
                <div className={styles.stepCopy}>
                  <span className={styles.stepNumber}>STEP 0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.howAction}><Link href="/signup?role=client" className={styles.primary}>Find a shoveler <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </section>
        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div><h2 id="faq-title">Good questions.</h2></div>
          <div className={styles.questions}>
            {questions.map(([question, answer]) => (
              <article key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.ready} aria-labelledby="ready-title">
          <div>
            <h2 id="ready-title">Your next snow day looks better already.</h2>
          </div>
          <FindHelp />
        </section>
        <aside id="earn" className={styles.earn} aria-labelledby="earn-title">
          <Shovel size={24} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <h2 id="earn-title">Clear snow in your neighbourhood.</h2>
            <p>Offer snow clearing in your area and earn close to home.</p>
          </div>
          <Link href="/signup?role=operator" className={styles.earnAction}>
            Become a shoveler <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </main>
      <footer className={styles.footer}>
        <Brand />
        <p>Snow removal, close to home.</p>
        <nav aria-label="Footer navigation">
          <a href="#faq">Questions</a>
          <Link href="/login">Log in</Link>
        </nav>
      </footer>
    </div>
  );
}
