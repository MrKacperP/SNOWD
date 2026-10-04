"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BatteryFull, Camera, Check, CheckCheck, CreditCard, MapPin, Pause, Play, RotateCcw, Send, Shovel, Signal, Wifi } from "lucide-react";
import styles from "./LandingPhone.module.css";

const stages = ["Meet your shoveler", "Have a conversation", "Payment confirmed", "Capture the result", "Job complete"];
const durations = [3500, 6500, 4000, 4000, 5000];

export default function LandingPhone() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setStage((current) => (current + 1) % stages.length);
      setMessage("");
      setDraft("");
    }, durations[stage]);
    return () => window.clearTimeout(timer);
  }, [stage, playing]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [message]);

  function go(next: number) { setPlaying(false); setStage(next); }
  function restart() { setStage(0); setMessage(""); setDraft(""); setPlaying(false); }

  return (
    <div className={styles.demo}>
      <div className={styles.caption}>See how SNOWD works</div>
      <div className={styles.phone} aria-label="Interactive SNOWD app demo" onPointerDown={() => setPlaying(false)} onFocusCapture={() => setPlaying(false)}>
        <div className={styles.status}><span>9:41</span><div className={styles.island} /><span><Signal size={12} /><Wifi size={12} /><BatteryFull size={17} /></span></div>
        <header className={styles.header}><Image src="/logo.png" alt="" width={24} height={27} /><strong>snowd.</strong><span>DEMO</span></header>
        <div className={styles.screen}>
          <div className={styles.topline}><span>{stage === 3 ? "SHOVELER VIEW" : "YOUR SNOW DAY"}</span><span>0{stage + 1} / 05</span></div>
          <div className={styles.progress}>{stages.map((label, index) => <span key={label} data-active={index <= stage} />)}</div>
          <div key={stage} className={styles.scene}>
            {stage === 0 && <>
              <h3>Good morning,<br />snow day.</h3><p>Let’s get your path cleared.</p>
              <div className={styles.map}><div className={styles.road} /><span className={styles.pin}><MapPin size={28} /></span><span className={styles.shovelPin}><Shovel size={20} /></span><span className={styles.mapLabel}>Your neighbourhood</span></div>
              <div className={styles.helper}><span className={styles.avatar}>J</span><div><strong>Jamie</strong><small>Your local helping hand</small></div><span className={styles.available}>Nearby</span></div>
              <div className={styles.price}><span>Driveway + walkway</span><strong>$35 <small>CAD</small></strong></div>
            </>}
            {stage === 1 && <>
              <div className={styles.chatHeading}><span className={styles.avatar}>J</span><div><h3>Jamie</h3><small>Your neighbourhood shoveler</small></div></div>
              <div ref={chatRef} className={styles.chat} data-playing={playing}>
                <div className={styles.bubble}>Hey! Could you clear the driveway and front steps?<small>You · 9:41 <CheckCheck size={12} /></small></div>
                <div className={styles.reply}>Absolutely! I can head over this morning. $35 for everything.<small>Jamie · 9:42</small></div>
                <div className={styles.bubble}>Perfect. Thank you!<small>You · 9:42 <CheckCheck size={12} /></small></div>
                {message && <><div className={styles.bubble}>{message}</div><div className={styles.reply}>Got it! I’ll take care of it.</div></>}
              </div>
              <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); if (draft.trim()) { setMessage(draft.trim()); setDraft(""); setPlaying(false); } }}><input aria-label="Try a message to Jamie" placeholder="Try a message…" maxLength={120} value={draft} onChange={(event) => setDraft(event.target.value)} /><button aria-label="Send demo message" type="submit" disabled={!draft.trim()}><Send size={16} /></button></form>
            </>}
            {stage === 2 && <>
              <div className={styles.successIcon}><Check size={32} /></div><h3>Payment? Handled.</h3><p>Your demo payment was successful.</p>
              <div className={styles.receipt}><span>SNOW CLEARING</span><strong>$35.00 <small>CAD</small></strong><div><span>Driveway + walkway</span><Check size={15} /></div><div><CreditCard size={16} /><span>Demo card •••• 4242</span></div><div><span>Payment status</span><b>Successful</b></div></div>
              <p className={styles.note}>Sample payment · no charge</p>
            </>}
            {stage === 3 && <>
              <h3>One last snapshot.</h3><p>Jamie takes a photo of the finished job.</p><div className={styles.camera}><Image src="/landing/snowd-neighborhood-hero-v2.png" alt="Demo view of a cleared path outside a snowy home" fill sizes="300px" /><span className={styles.viewfinder} /></div>
            </>}
            {stage === 4 && <>
              <div className={styles.completeHeading}><span className={styles.successIcon}><Check size={25} /></span><div><h3>All clear.</h3><p>Go enjoy your day.</p></div></div><div className={styles.finishedPhoto}><Image src="/landing/snowd-neighborhood-hero-v2.png" alt="Example completion photo showing a shoveled walkway" fill sizes="300px" /><span><Camera size={13} /> Completion photo</span></div><div className={styles.completion}><CheckCheck size={19} /><div><strong>Job complete</strong><small>Photo shared with you</small></div></div>
            </>}
          </div>
          <button className={styles.primary} onClick={() => stage === 4 ? restart() : go(stage + 1)}>
            {stage === 0 ? "Chat with Jamie" : stage === 1 ? "Continue to payment" : stage === 2 ? "See the finished job" : stage === 3 ? "View completion photo" : "Try it again"}
            {stage === 4 ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
        <div className={styles.homeIndicator} />
      </div>
      <div className={styles.controls}><button onClick={() => go((stage + 4) % 5)} aria-label="Previous demo step"><ArrowLeft size={15} /></button><button onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause demo" : "Play demo"}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Autoplay on" : "Play demo"}</button><button onClick={restart} aria-label="Restart demo"><RotateCcw size={15} /></button></div>
      <Link href="/signup?role=client" className={styles.realApp}>Start a real snow day <ArrowRight size={15} /></Link>
    </div>
  );
}
