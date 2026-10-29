"use client";

import { useState } from "react";
import { ArrowRight, Camera, Check, Clock3, House, MessageCircle, Shovel } from "lucide-react";
import styles from "./LandingProductShowcase.module.css";

type View = "home" | "jobs" | "messages";

export default function LandingProductShowcase() {
  const [view, setView] = useState<View>("home");

  return (
    <section id="how" className={styles.showcase} aria-labelledby="showcase-title">
      <div className={styles.heading}>
        <h2 id="showcase-title">Your snow day, at a glance.</h2>
        <p>See your visit from request to all clear.</p>
      </div>
      <div className={styles.preview}>
        <div className={styles.previewTop}>
          <div className={styles.previewBrand}><span className={styles.brandMark}><Shovel size={20} aria-hidden="true" /></span><strong>snowd<span>.</span></strong></div>
          <span className={styles.sampleBadge}>Sample app preview</span>
        </div>
        <div className={styles.previewBody}>
          <nav className={styles.tabs} aria-label="Preview app screens">
            <button type="button" aria-current={view === "home" ? "page" : undefined} onClick={() => setView("home")}><House size={20} aria-hidden="true" /> Home</button>
            <button type="button" aria-current={view === "jobs" ? "page" : undefined} onClick={() => setView("jobs")}><Shovel size={20} aria-hidden="true" /> Visits</button>
            <button type="button" aria-current={view === "messages" ? "page" : undefined} onClick={() => setView("messages")}><MessageCircle size={20} aria-hidden="true" /> Messages</button>
          </nav>
          <div className={styles.screen} aria-live="polite">
            {view === "home" && <>
              <div className={styles.screenHeading}><div><span>Good morning, Morgan</span><h3>Your snow day</h3></div><span className={styles.weatherIcon} aria-hidden="true">❄</span></div>
              <div className={styles.mainCard}>
                <span className={styles.cardLabel}>NEXT VISIT <span className={styles.status}>Confirmed</span></span>
                <h4>Driveway + walkway</h4>
                <p>Jamie is coming today at 11:30 AM.</p>
                <div className={styles.facts}><span><Clock3 size={19} aria-hidden="true" /> 11:30 AM</span><span><House size={19} aria-hidden="true" /> Home</span><strong>$42 CAD</strong></div>
              </div>
              <div className={styles.miniCards}><div><MessageCircle size={23} aria-hidden="true" /><strong>Chat with Jamie</strong><ArrowRight size={18} aria-hidden="true" /></div><div><Camera size={23} aria-hidden="true" /><strong>Completion photo</strong><span>When done</span></div></div>
            </>}
            {view === "jobs" && <>
              <div className={styles.screenHeading}><div><span>Your visits</span><h3>Driveway + walkway</h3></div></div>
              <div className={styles.mainCard}><span className={styles.cardLabel}>TODAY’S VISIT <span className={styles.status}>Confirmed</span></span><h4>Jamie · 11:30 AM</h4><p>18 Snowdrop Lane · Maple Hollow</p><div className={styles.timeline}><span><Check size={17} /> Request sent</span><span><Check size={17} /> Accepted</span><span className={styles.upcoming}><Clock3 size={17} /> Work starts next</span><span><Camera size={17} /> Photo when done</span></div></div>
            </>}
            {view === "messages" && <>
              <div className={styles.screenHeading}><div><span>Your messages</span><h3>Jamie</h3></div></div>
              <div className={styles.chatCard}><div className={styles.chatBubble}>I’ve accepted your request. I’ll let you know when I’m on my way.</div><span>Jamie · Sample conversation</span><div className={styles.chatReply}>Thanks, see you soon!</div></div>
            </>}
          </div>
        </div>
      </div>
    </section>
  );
}
