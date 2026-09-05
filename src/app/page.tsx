"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, MapPin, RotateCcw, Shovel, Snowflake, Camera, MessageCircle, Banknote, UserRound, ClipboardCheck } from "lucide-react";
import styles from "./landing.module.css";

const guides = {
  help: [
    ["Post it.", "Add your address, a photo, and the areas you need shoveled."],
    ["Meet your helper.", "A nearby helper accepts your job. Chat with them right in SNOWD."],
    ["Take back your day.", "Review the finished photos, approve the work, and pay through the app."],
  ],
  earn: [
    ["Say hello.", "Tell us where you want to work and complete your shoveler setup."],
    ["Pick your job.", "See available snow-clearing jobs and accept one that works for you."],
    ["Shovel. Earn. Repeat.", "Upload photos of your work. Payment follows the customer’s approval."],
  ],
};
const questions = [
  ["What is SNOWD?", "SNOWD connects people who need snow removed with local people who shovel it. Post a job, chat with your helper, and review the work in one place."],
  ["Can I earn money shoveling?", "Yes. Create an account, complete the shoveler setup, and browse available jobs near you. You choose which jobs to accept."],
  ["How much does it cost?", "Pricing depends on the job. Review the price in the app before booking snow removal."],
  ["Is there help in my area?", "Enter your service area when you sign up. Available help depends on nearby shovelers and current demand."],
];

function Brand() {
  return <Link href="/" aria-label="SNOWD home" className={styles.brand}><Image src="/logo.png" alt="" width={42} height={44} priority />snowd<span>.</span></Link>;
}

function SnowDemo() {
  const [phase, setPhase] = useState<"snowy" | "clearing" | "cleared">("snowy");
  const cleared = phase === "cleared";
  const clearing = phase === "clearing";
  return <div className={styles.demo}>
    <div className={styles.demoTop}><span><span className={styles.dot} /> A little winter magic</span><span className={styles.demoLabel}>Interactive demo</span></div>
    <div className={`${styles.scene} ${clearing ? styles.isClearing : ""} ${cleared ? styles.isCleared : ""}`}>
      <svg viewBox="0 0 560 350" role="img" aria-label={cleared ? "A house with a freshly cleared driveway" : "A house with a snowy driveway"}>
        <circle cx="454" cy="66" r="35" fill="#ffcc79" />
        <path d="M0 255 Q110 220 230 251 T560 239 V350 H0Z" fill="#fff" />
        <path d="M50 245V159M20 206L50 133L80 206Z" fill="#8fb8bb" stroke="#071624" strokeWidth="3" strokeLinejoin="round" />
        <path d="M474 249V164M440 214L474 133L508 214Z" fill="#8fb8bb" stroke="#071624" strokeWidth="3" strokeLinejoin="round" />
        <path d="M141 145L275 52L409 145" fill="#071624" stroke="#071624" strokeWidth="13" strokeLinejoin="round" />
        <path d="M145 133L275 43L405 133" fill="none" stroke="white" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M159 144H392V251H159Z" fill="#ff9854" stroke="#071624" strokeWidth="3" />
        <path d="M249 164H369V251H249Z" fill="#f8faf7" stroke="#071624" strokeWidth="3" />
        {[185, 205, 225].map(y => <path key={y} d={`M254 ${y}H364`} stroke="#c5d7db" strokeWidth="3" />)}
        <path d="M179 176H223V251H179Z" fill="#071624" /><circle cx="213" cy="218" r="3" fill="#ff6b0a" />
        <path d="M252 253H369L437 350H216Z" fill="#789199" stroke="#071624" strokeWidth="3" />
        <defs><clipPath id="driveway-clip"><path d="M249 251H372L437 350H216Z" /></clipPath></defs>
        <g clipPath="url(#driveway-clip)">
          {[0, 1, 2].map(lane => <g key={lane} className={styles.snowLane} style={{ animationDelay: `${lane * .75}s` }}>
            <path d={`M${210 + lane * 76} 247h77v110h-77Z`} fill="#fff" />
            <path d={`M${228 + lane * 76} 282l18 -3m-12 43l20 -2`} stroke="#d8eefc" strokeWidth="4" strokeLinecap="round" />
          </g>)}
        </g>
        {(clearing || cleared) && <g className={styles.snowBanks} fill="white" stroke="#d8eefc" strokeWidth="2"><path d="M211 348Q192 336 209 328Q196 310 217 309Q206 292 232 291L219 348Z" /><path d="M442 348Q463 335 444 325Q451 310 424 307L402 281Q425 278 426 293Q450 290 447 309Q472 324 463 343Z" /></g>}
        {clearing && <g aria-hidden="true" className={styles.shovelRun} onAnimationEnd={event => { if (event.target === event.currentTarget) setPhase("cleared"); }}>
          <g transform="translate(0 -4)"><path d="M0 0L12 -39" stroke="#071624" strokeWidth="5" strokeLinecap="round" /><path d="M6 -47H24L21 -36H9Z" fill="#ff9854" stroke="#071624" strokeWidth="3" /><path d="M-22 -2H22L18 12Q0 24 -18 12Z" fill="#ff6b0a" stroke="#071624" strokeWidth="3" />
          {[-18, 0, 18].map((x, i) => <circle key={x} className={styles.snowSpray} cx={x} cy="23" r={4 + i} fill="white" style={{ animationDelay: `${i * .12}s` }} />)}</g>
        </g>}
        {cleared && <g className={styles.successMark}><circle cx="313" cy="295" r="22" fill="#d9f5dd" stroke="#071624" strokeWidth="2" /><path d="M302 295L310 303L325 286" fill="none" stroke="#22713b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>}
        {phase === "snowy" && [ [100,60], [196,37], [430,166], [70,107], [350,28], [515,92] ].map(([x,y]) => <g key={x} stroke="white" strokeWidth="3" strokeLinecap="round"><path d={`M${x-5} ${y}h10M${x} ${y-5}v10`} /></g>)}
      </svg>
      <span className={styles.sceneCaption}><MapPin size={15} /> {cleared ? "Ready for your day." : clearing ? "Making room for life…" : "One snowy driveway. Let’s fix that."}</span>
    </div>
    <div className={styles.demoBottom}>
      <div aria-live="polite"><h2>{cleared ? "Clear driveway. Clear schedule." : clearing ? "A little help goes a long way." : "Your forecast: less shoveling."}</h2><p>{cleared ? "Imagine this part of winter handled." : clearing ? "Watch the shovel make three satisfying passes." : "Tap below and watch winter get out of the way."}</p></div>
      <button className={styles.primary} disabled={clearing} onClick={() => setPhase(cleared ? "snowy" : "clearing")}>{cleared ? <RotateCcw size={20} /> : <Shovel size={20} />}{cleared ? "Let it snow again" : clearing ? "Clearing the way…" : "Clear the snow"}</button>
      <p className={styles.demoNote}>Just for fun — this won’t book a real job.</p>
    </div>
  </div>;
}

export default function HomePage() {
  const [audience, setAudience] = useState<"help" | "earn">("help");
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Main navigation"><Brand /><div className={styles.navLinks}><a href="#how">How it works</a><Link href="/login">Log in</Link><Link href="/signup" className={styles.primary}>Get started <ArrowRight size={18} /></Link></div></nav>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}><Snowflake size={20} /> Local people. Less shoveling.</p><h1>Love winter.<br /><span>Skip the<br />shoveling.</span></h1><p className={styles.intro}>Get your snow cleared by someone nearby. Or earn money clearing it.</p><div className={styles.heroActions}><Link href="/signup" className={styles.primary}>Find snow removal <ArrowRight size={20} /></Link><a href="#how" className={styles.secondary} onClick={() => setAudience("earn")}>I want to earn</a></div><p className={styles.heroNote}>Your driveway. Your walkway. One less thing to do.</p></div>
      <SnowDemo />
    </section>
    <section id="how" className={styles.how}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Okay, how does it work?</p><h2>{audience === "help" ? <>From snowed in<br />to sorted.</> : <>Turn a snow day<br />into a payday.</>}</h2><p className={styles.sectionIntro}>{audience === "help" ? "A few details from you. A helping hand nearby." : "Local jobs. Your choice. A little extra in your pocket."}</p></div><div className={styles.switch} aria-label="Choose what you want to do"><button aria-pressed={audience === "help"} onClick={() => setAudience("help")}>I need help</button><button aria-pressed={audience === "earn"} onClick={() => setAudience("earn")}>I want to earn</button></div></div>
      <div className={styles.steps} aria-live="polite">{guides[audience].map(([title, description], i) => {
        const Icon = (audience === "help" ? [Camera, MessageCircle, ClipboardCheck] : [UserRound, MapPin, Banknote])[i];
        const benefits = audience === "help" ? ["You set the scene", "Keep it all in one chat", "You approve the finished work"] : ["Start with your neighborhood", "Choose what works for you", "Show your work. Get paid."];
        const previews = audience === "help" ? ["Choose your driveway, walkway, or other snowy areas. Add a photo so your helper knows what to expect.", "Once someone accepts, use the job chat to share useful details, like where to find your walkway.", "Your helper uploads finished photos. Review them and approve the job when the work is done."] : ["Create your account and complete the shoveler setup before taking jobs.", "Browse available jobs near you. Review the details before deciding which job to accept.", "Upload finished photos for your customer to review. Payment follows their approval."];
        return <article key={`${audience}-${i}`}><div className={styles.stepTop}><span className={styles.number}>0{i + 1}</span><span className={styles.stepIcon}><Icon size={32} strokeWidth={1.7} /></span></div><h3>{title}</h3><p>{description}</p><div className={styles.stepBenefit}><Check size={15} />{benefits[i]}</div><details className={styles.stepDetails}><summary>Show me more <ChevronDown size={16} /></summary><p>{previews[i]}</p></details></article>;
      })}</div>
      <Link href="/signup" className={styles.textLink}>{audience === "help" ? "Let’s find you some help" : "Let’s get you earning"} <ArrowRight size={20} /></Link>
    </section>
    <section className={styles.faq}><div><p className={styles.eyebrow}>Good questions</p><h2>A little more<br />before you go.</h2></div><div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={20} /></summary><p>{answer}</p></details>)}</div></section>
    <section className={styles.finalCta}><div><p className={styles.eyebrow}><Check size={18} /> Less snow. More day.</p><h2>Leave the snow<br />to someone nearby.</h2></div><Link href="/signup" className={styles.primary}>Get started <ArrowRight size={20} /></Link></section>
    <footer className={styles.footer}><Brand /><p>Connecting neighbors, one clear path at a time.</p><Link href="/login">Log in <ArrowRight size={16} /></Link></footer>
  </main>;
}
