"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Shovel,
} from "lucide-react";
import styles from "./landing.module.css";

const guides = {
  help: [
    [
      "Post your snow-clearing job",
      "Add your address, choose the areas that need clearing, and include photos so a nearby shoveler knows what to expect.",
    ],
    [
      "Talk with your shoveler",
      "Once someone accepts your job, use the job chat to discuss access, timing, and any details about your property.",
    ],
    [
      "Review the finished work",
      "Your shoveler uploads completion photos. Review the work and approve the job, with payment handled in the app.",
    ],
  ],
  earn: [
    [
      "Create your operator profile",
      "Sign up, choose operator, and complete the required account and payment setup.",
    ],
    [
      "Choose nearby jobs",
      "Browse available work and check the job details before accepting. Choose jobs that fit your schedule.",
    ],
    [
      "Clear the snow and get paid",
      "Keep in touch through the job chat and upload completion photos. Payment follows the homeowner’s approval.",
    ],
  ],
};

const questions = [
  [
    "How much does snow removal cost?",
    "Pricing depends on the job and the areas that need clearing. Review the job price in the app before committing.",
  ],
  [
    "Can I find a shoveler in my area?",
    "Create an account and add your address to post a job for nearby shovelers. Availability depends on local helpers, demand, and the weather.",
  ],
  [
    "Do you offer a senior discount?",
    "Yes. Neighbours age 65 and over can access the senior discount after signing up and confirming their age.",
  ],
  [
    "Can students earn money on SNOWD?",
    "Yes. Students can sign up as operators and choose nearby jobs around their schedules. Upload a transcript or report card in Settings to be considered for student verification and access to more clients. Eligibility and payment setup requirements apply.",
  ],
  [
    "What happens when the job is finished?",
    "Your shoveler uploads photos of the completed work. Review the photos and approve the job when it is finished. If something needs discussing, use the job chat before approving.",
  ],
];

function Brand() {
  return (
    <Link href="/" aria-label="SNOWD home" className={styles.brand}>
      snowd<span>.</span>
    </Link>
  );
}

export default function HomePage() {
  const [audience, setAudience] = useState<"help" | "earn">("help");

  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Brand />
          <div className={styles.navLinks}>
            <a href="#how">How it works</a>
            <a href="#homeowners">For homeowners</a>
            <a href="#students">Earn money</a>
          </div>
          <Link href="/login" className={styles.login}>
            Log in <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <p className={styles.eyebrow}>LOCAL SNOW REMOVAL</p>
          <h1 id="hero-title">
            Find local help
            <br />
            with snow removal.
          </h1>
          <p className={styles.intro}>
            Connect with a nearby shoveler to clear your driveway,
            <br className={styles.desktopBreak} /> walkway, or front steps.
          </p>
          <div className={styles.booking}>
            <div className={styles.bookingService}>
              <Shovel size={26} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <strong>Get snow cleared</strong>
                <span>Create an account, then post your job.</span>
              </div>
            </div>
            <Link href="/signup" className={styles.primary}>
              Find snow help <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.earnLink}>
            Looking for work?{" "}
            <a href="#students">
              Earn by shoveling <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </p>
        </section>

        <section
          className={styles.services}
          aria-label="Snow-clearing services"
        >
          <article>
            <span className={styles.serviceNumber}>01</span>
            <div>
              <h2>Driveways</h2>
              <p>Clear the way in and out.</p>
            </div>
          </article>
          <article>
            <span className={styles.serviceNumber}>02</span>
            <div>
              <h2>Walkways</h2>
              <p>Make the path to your door easier.</p>
            </div>
          </article>
          <article>
            <span className={styles.serviceNumber}>03</span>
            <div>
              <h2>Steps & entrances</h2>
              <p>Help with the spots a plow can’t reach.</p>
            </div>
          </article>
        </section>

        <section id="how" className={styles.how} aria-labelledby="how-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>HOW IT WORKS</p>
              <h2 id="how-title">
                Snow clearing
                <br />
                in three steps.
              </h2>
            </div>
            <div
              className={styles.guideSwitch}
              role="group"
              aria-label="Choose your getting-started guide"
            >
              <button
                type="button"
                aria-pressed={audience === "help"}
                onClick={() => setAudience("help")}
              >
                I need snow help
              </button>
              <button
                type="button"
                aria-pressed={audience === "earn"}
                onClick={() => setAudience("earn")}
              >
                I want to earn
              </button>
            </div>
          </div>
          <div className={styles.steps} aria-live="polite">
            {guides[audience].map(([title, description], index) => (
              <article key={title}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="homeowners"
          className={styles.homeowners}
          aria-labelledby="homeowners-title"
        >
          <div className={styles.homeownerCopy}>
            <p className={styles.eyebrow}>FOR HOMEOWNERS & SENIORS</p>
            <h2 id="homeowners-title">
              Help with the
              <br />
              heavy lifting.
            </h2>
            <p>
              Get help with the heavy lifting from someone in your
              neighbourhood. Share what you need, stay in touch, and see the
              results.
            </p>
            <Link href="/signup" className={styles.textLink}>
              Post your first job <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.detailsList}>
            <article>
              <Check size={19} aria-hidden="true" />
              <div>
                <h3>Keep the details in one place</h3>
                <p>Talk directly with your shoveler through the job chat.</p>
              </div>
            </article>
            <article>
              <Check size={19} aria-hidden="true" />
              <div>
                <h3>Review before you approve</h3>
                <p>
                  Check completion photos before approving the finished job.
                </p>
              </div>
            </article>
            <article>
              <Check size={19} aria-hidden="true" />
              <div>
                <h3>A discount for neighbours 65+</h3>
                <p>Available after signup and age confirmation.</p>
              </div>
            </article>
          </div>
        </section>

        <section
          id="students"
          className={styles.students}
          aria-labelledby="students-title"
        >
          <div>
            <p className={styles.eyebrow}>EARN WITH SNOWD</p>
            <h2 id="students-title">
              Local jobs that fit
              <br />
              your schedule.
            </h2>
          </div>
          <div className={styles.studentCopy}>
            <p>
              Find snow-clearing jobs close to home. Choose the work that fits
              around classes and other commitments, and earn by helping your
              neighbours.
            </p>
            <Link href="/signup" className={styles.primary}>
              Become a shoveler <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className={styles.finePrint}>
              Choose “operator” during setup. Students can upload a transcript
              or report card in Settings to be considered for verified student
              access. Eligibility requirements apply.
            </p>
          </div>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div>
            <p className={styles.eyebrow}>BEFORE YOU GET STARTED</p>
            <h2 id="faq-title">Common questions.</h2>
          </div>
          <div className={styles.questions}>
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={19} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <Brand />
          <p>Snow removal, close to home.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#how">How it works</a>
          <a href="#faq">FAQs</a>
          <Link href="/signup">
            Get started <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </footer>
    </div>
  );
}
