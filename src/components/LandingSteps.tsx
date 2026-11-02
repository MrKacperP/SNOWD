"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, Camera, CreditCard, Maximize2, MapPin, MessageCircle, Navigation, Play, ShieldCheck, Tag, X, Zap } from "lucide-react";
import { BookVisual, FollowVisual, PhotoVisual } from "./LandingStepVisuals";
import styles from "./LandingSteps.module.css";

const steps = [
  {
    visual: BookVisual, title: "Book in a minute", text: "Pick nearby help, choose what to clear, and see the price up front.",
    tagline: "Like ordering takeout, but for your driveway.",
    points: [
      { icon: MapPin, title: "See who’s close", text: "Shovelers near your address, with ratings and how far away they are." },
      { icon: Tag, title: "Price before you press", text: "Pick driveway, walkway or steps and the total updates. No haggling at the door." },
      { icon: Zap, title: "Now or later", text: "Ask for help ASAP, or book a time that suits your morning." },
    ],
  },
  {
    visual: FollowVisual, title: "Follow every step", text: "Get notified when your shoveler accepts, heads out, and starts.",
    tagline: "A pizza tracker, minus the pizza.",
    points: [
      { icon: Bell, title: "A ping at every step", text: "Requested, confirmed, on the way, clearing, done. You’ll never wonder." },
      { icon: Navigation, title: "Live arrival time", text: "When your shoveler heads out, their ETA and rough area show on your map." },
      { icon: MessageCircle, title: "Chat built in", text: "Gate code? Car in the way? Message your shoveler right from the work order." },
    ],
  },
  {
    visual: PhotoVisual, title: "See it done", text: "A completion photo lands in the app the moment the job is finished.",
    tagline: "Proof, not promises.",
    points: [
      { icon: Camera, title: "Photo of the finish", text: "Your shoveler snaps the cleared areas before the job can close." },
      { icon: CreditCard, title: "Pay after the proof", text: "Cards are charged only after the photo. Cash is paid once the work is done." },
      { icon: ShieldCheck, title: "Missed a spot?", text: "Message your shoveler or our support team and we’ll sort it out." },
    ],
  },
];

/** The three "how it works" cards; each opens a closer look with its animation up top. */
export default function LandingSteps() {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open !== null && !node.open) node.showModal();
    if (open === null && node.open) node.close();
  }, [open]);

  function close() {
    const last = open;
    setOpen(null);
    if (last !== null) triggers.current[last]?.focus();
  }

  function tryDemo() {
    setOpen(null);
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const step = open !== null ? steps[open] : null;
  return <>
    <ol className={styles.steps}>
      {steps.map(({ visual: Visual, title, text }, index) => (
        <li key={title} data-reveal style={{ transitionDelay: `${index * 120}ms` }}>
          <button type="button" ref={node => { triggers.current[index] = node; }} className={styles.card} onClick={() => setOpen(index)} aria-haspopup="dialog">
            <Visual />
            <span className={styles.copy}><small>0{index + 1}</small><h3>{title}</h3><p>{text}</p></span>
            <span className={styles.more}><Maximize2 size={14} aria-hidden="true" />See how it works</span>
          </button>
        </li>
      ))}
    </ol>

    <dialog ref={dialog} className={styles.dialog} aria-labelledby="step-dialog-title" onClose={() => open !== null && close()} onClick={event => event.target === event.currentTarget && close()}>
      {step && open !== null && <div key={open} className={styles.panel}>
        <button type="button" className={styles.close} onClick={close} aria-label="Close"><X size={20} /></button>
        <div className={styles.visual}><step.visual /></div>
        <div className={styles.body}>
          <small className={styles.count}>Step {open + 1} of {steps.length}</small>
          <h3 id="step-dialog-title">{step.title}</h3>
          <p className={styles.tagline}>{step.tagline}</p>
          <ul className={styles.points}>
            {step.points.map(({ icon: Icon, title, text }, index) => <li key={title} style={{ animationDelay: `${120 + index * 90}ms` }}>
              <span aria-hidden="true"><Icon size={20} /></span>
              <div><strong>{title}</strong><p>{text}</p></div>
            </li>)}
          </ul>
          <div className={styles.nav}>
            <button type="button" onClick={() => setOpen(open - 1)} disabled={open === 0} aria-label="Previous step"><ArrowLeft size={18} /></button>
            <span className={styles.dots} aria-hidden="true">{steps.map((item, index) => <i key={item.title} data-on={index === open || undefined} />)}</span>
            {open < steps.length - 1
              ? <button type="button" onClick={() => setOpen(open + 1)} aria-label="Next step"><ArrowRight size={18} /></button>
              : <button type="button" data-primary onClick={tryDemo}><Play size={16} aria-hidden="true" />Try the demo</button>}
          </div>
        </div>
      </div>}
    </dialog>
  </>;
}
