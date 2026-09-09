"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, ChevronDown, GraduationCap, Heart, MapPin, MessageCircle, Shovel, Snowflake } from "lucide-react";
import styles from "./landing.module.css";

const guides = {
  help: [
    ["Tell us what needs clearing", "Create your account, add your address and post a job with a photo of your driveway or walkway."],
    ["Connect with a nearby helper", "When a shoveler accepts your job, chat in SNOWD to share the details."],
    ["Review the work. Enjoy your day.", "Check the finished photos, approve the completed job and pay through the app."],
  ],
  earn: [
    ["Set up your shoveler profile", "Create an account, choose operator and complete your setup to start finding work."],
    ["Find a job that fits your day", "Browse nearby jobs, check the details and choose the work that fits around your classes."],
    ["Clear a path. Earn a little extra.", "Upload photos of the finished work. Payment follows your neighbour’s approval."],
  ],
};
const questions = [
  ["How do I find snow help near me?", "Create an account, choose homeowner and add your address. Post what you need cleared so nearby shovelers can find your job. Availability depends on local helpers and the weather."],
  ["Is SNOWD for seniors?", "Yes. SNOWD is for seniors and any neighbour who would like a hand with snow. Seniors age 65 and over can access our senior discount after signing up. You can explain what needs clearing, chat with your helper and review photos of the finished work in one place."],
  ["Can I shovel while I’m in school?", "SNOWD is built with high school and college students in mind. Students who upload a transcript or report card with strong grades can be verified for access to more nearby clients. Eligibility and payment setup requirements apply."],
  ["How much does snow clearing cost?", "The price depends on the job and the areas that need clearing. Review the job price in the app before committing. There is no single price for every driveway."],
  ["What happens after the snow is cleared?", "Your helper uploads completion photos for you to review. Approve the work when it is finished, with payment handled through the app. Use your job chat if anything needs discussing."],
];

function Brand() {
  return <Link href="/" aria-label="SNOWD home" className={styles.brand}><Image src="/logo.png" alt="" width={35} height={37} priority />snowd<span>.</span></Link>;
}

export default function HomePage() {
  const [audience, setAudience] = useState<"help" | "earn">("help");
  return <main className={styles.page}>
    <a className={styles.skip} href="#get-started">Skip to getting started</a>
    <div className={styles.announcement}><Snowflake size={15} aria-hidden="true" /> A little snow. A little help. A better neighbourhood.</div>
    <nav className={styles.nav} aria-label="Main navigation"><Brand /><div className={styles.navLinks}><a href="#how">How it works</a><a href="#students">For students</a><a href="#neighbours">For neighbours</a></div><Link href="/login" className={styles.login}>Log in <ArrowRight size={17} /></Link></nav>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}><span /> GOOD NEIGHBOURS. GREAT SNOW DAYS.</p><h1>Snow brings us<br /><span>together.</span></h1><p className={styles.intro}>Students earn a little extra. Seniors get a helping hand. And the whole neighbourhood gets a clearer path.</p><div className={styles.heroActions}><a href="#neighbours" className={styles.primary}>I need snow help <ArrowRight size={19} /></a><a href="#students" className={styles.secondary}>I want to shovel <Shovel size={19} /></a></div><p className={styles.heroNote}><MapPin size={16} /> Neighbours helping neighbours, close to home.</p></div>
      <div className={styles.heroArt}><Image src="/landing/snowd-neighborhood-hero-v2.png" alt="A student clears a snowy front path while an older neighbour smiles from her porch." fill priority sizes="(max-width: 760px) 100vw, 55vw" /><div className={styles.imageLabel}><Heart size={18} /> A clear path makes someone’s day.</div></div>
    </section>
    <div className={styles.values}><span><GraduationCap /> Made for student schedules</span><span><Heart /> A helping hand for seniors</span><span><MapPin /> Work that stays local</span></div>
    <section id="get-started" className={styles.audiences}>
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>TWO WAYS TO MAKE WINTER BETTER</p><h2>A little help goes both ways.</h2><p>Whichever side of the shovel you’re on, you belong here.</p></div>
      <div className={styles.audienceGrid}>
        <article id="neighbours" className={styles.neighbourCard}><div className={styles.cardTop}><span className={styles.pill}>FOR SENIORS & NEIGHBOURS</span><Heart size={28} /></div><h3>Your snow day.<br />Without the heavy lifting.</h3><p>A snowy walkway shouldn’t stand between you and your day. Find a local helping hand for your driveway, steps or path.</p><p className={styles.offer}><Heart size={18} /><strong>65+ senior discount</strong><span>Available after signup and age confirmation.</span></p><ul><li><Check /> Post the areas you need cleared</li><li><Check /> Talk directly with your helper</li><li><Check /> Review photos before approving the work</li></ul><Link href="/signup" className={styles.primary}>Find a helping hand <ArrowRight size={19} /></Link><span className={styles.setupNote}>Choose “homeowner” when you sign up.</span></article>
        <article id="students" className={styles.studentCard}><div className={styles.cardTop}><span className={styles.pill}>FOR HIGH SCHOOL & COLLEGE STUDENTS</span><GraduationCap size={29} /></div><h3>Good for your block.<br />Great for your pocket.</h3><p>Put your energy to work close to home. Help a neighbour through winter and earn money around your school schedule.</p><p className={styles.offer}><GraduationCap size={18} /><strong>Strong grades, more clients</strong><span>Upload your transcript or report card to be considered for verified student access.</span></p><ul><li><Check /> Choose the jobs that work for you</li><li><Check /> Find opportunities in your neighbourhood</li><li><Check /> Make a difference you can actually see</li></ul><Link href="/signup" className={styles.darkButton}>Start shoveling <ArrowRight size={19} /></Link><span className={styles.setupNote}>Choose “operator” when you sign up, then upload your transcript in Settings. Eligibility requirements apply.</span></article>
      </div>
    </section>
    <section id="how" className={styles.how}><div className={styles.howHeading}><div><p className={styles.eyebrow}>LESS FUSS. MORE HELP.</p><h2>One snowfall.<br />Three simple steps.</h2></div><div className={styles.switch} aria-label="Choose your getting-started guide"><button aria-pressed={audience === "help"} onClick={() => setAudience("help")}>I need help</button><button aria-pressed={audience === "earn"} onClick={() => setAudience("earn")}>I want to earn</button></div></div><div className={styles.steps} aria-live="polite">{guides[audience].map(([title, description], i) => <article key={title}><div className={styles.stepNumber}>0{i + 1}<ArrowRight size={22} /></div><h3>{title}</h3><p>{description}</p></article>)}</div><Link href="/signup" className={styles.textLink}>{audience === "help" ? "Get started as a homeowner" : "Get started as a shoveler"}<ArrowRight size={18} /></Link></section>
    <section className={styles.community}><div className={styles.communityMark}><Image src="/logo.png" alt="" width={100} height={106} /><span>THE SNOWD EFFECT</span></div><div><p className={styles.eyebrow}>MORE THAN A CLEARED DRIVEWAY</p><h2>A familiar face.<br />A little independence.<br /><span>A better kind of winter.</span></h2><p>For a student, it’s money earned close to home. For a senior, it’s one less thing to worry about. For a neighbourhood, it’s a reason to look out for each other.</p></div></section>
    <section className={styles.faq}><div><p className={styles.eyebrow}><MessageCircle size={17} /> GOOD QUESTIONS</p><h2>Let’s clear<br />a few things up.</h2><a href="#get-started" className={styles.textLink}>Find your way to get started <ArrowDown size={18} /></a></div><div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={20} /></summary><p>{answer}</p></details>)}</div></section>
    <section className={styles.finalCta}><Snowflake className={styles.bigSnowflake} strokeWidth={1} aria-hidden="true" /><p className={styles.eyebrow}>YOUR NEXT GOOD DEED IS JUST DOWN THE STREET.</p><h2>Let’s make this winter<br />a little more neighbourly.</h2><div className={styles.heroActions}><a href="#neighbours" className={styles.primary}>Find snow help <ArrowRight size={19} /></a><a href="#students" className={styles.secondary}>Become a shoveler <Shovel size={19} /></a></div></section>
    <footer className={styles.footer}><Brand /><p>Connecting neighbours, one clear path at a time.</p><Link href="/login">Log in <ArrowRight size={16} /></Link></footer>
  </main>;
}
