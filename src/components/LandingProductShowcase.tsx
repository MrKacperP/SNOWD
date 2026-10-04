"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Home,
  House,
  MessageSquare,
  Settings,
  Shovel,
  User,
} from "lucide-react";
import styles from "./LandingProductShowcase.module.css";

const jobs = [
  { person: "Robert K.", service: "Walkway", time: "Today, 1:00 PM", status: "Confirmed" },
  { person: "Ana P.", service: "Driveway", time: "Tomorrow, 9:00 AM", status: "Requested" },
];

export default function LandingProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<"home" | "jobs" | "messages">("home");
  const [service, setService] = useState("Driveway + walkway");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.showcase} ${visible ? styles.visible : ""}`} aria-labelledby="showcase-title">
      <div className={styles.copy}>
        <h2 id="showcase-title">From first flake<br />to all clear.</h2>
        <p>Request help, check in with your shoveler, and see when the job is done.</p>
      </div>

      <div className={styles.stage}>
        <div className={styles.desktop}>
          <div className={styles.desktopBody}>
            <aside className={styles.sidebar} aria-label="Demo dashboard navigation">
              <div className={styles.sidebarBrand}><Image src="/logo.png" alt="" width={29} height={29} /><span><strong>snowd.</strong><small>Snow service network</small></span></div>
              <div className={styles.account}><small>ACCOUNT</small><strong>Morgan R.</strong><span>Client</span></div>
              <nav className={styles.demoNav} aria-label="Preview navigation">
                <button className={view === "home" ? styles.active : ""} onClick={() => setView("home")}><Home size={16} /> Home</button>
                <Link href="/signup?role=client"><Shovel size={16} /> Book help</Link>
                <button className={view === "jobs" ? styles.active : ""} onClick={() => setView("jobs")}><ClipboardList size={16} /> Jobs</button>
                <button className={view === "messages" ? styles.active : ""} onClick={() => setView("messages")}><MessageSquare size={16} /> Messages</button>
                <span><CircleDollarSign size={16} /> Payments</span>
              </nav>
              <div className={styles.sidebarFooter}><span><Bell size={16} /> Notifications</span><span><User size={16} /> Morgan R.</span></div>
            </aside>
            <div className={styles.dashboard}>
              <div className={styles.welcome}><small>Good morning</small><h3>{view === "home" ? "Your snow day" : view === "jobs" ? "Work orders" : "Messages"}</h3></div>
              {view === "home" && <>
                <section className={styles.nextAction}>
                  <div className={styles.actionHeading}><div><small>Next step</small><h4>Visit confirmed.</h4></div><span>Confirmed</span></div>
                  <p>Your shoveler will update you when they leave.</p>
                  <div className={styles.visitSummary}>
                    <div><span>Your shoveler</span><strong>Maya R.</strong></div>
                    <div><span>When</span><strong>Today, 11:30 AM</strong></div>
                    <div><span>Total</span><strong>$42.00 CAD</strong></div>
                  </div>
                  <div className={styles.actionLinks}><Link href="/signup?role=client">View visit <ArrowRight size={13} /></Link><Link href="/signup?role=client">Book another</Link></div>
                </section>
                <section className={styles.visits}>
                  <div className={styles.visitsHeading}><h4>Other visits</h4><Link href="/signup?role=client">View all</Link></div>
                  {jobs.map((job) => <div className={styles.visit} key={job.person}><div><strong><User size={13} /> {job.person}</strong><span>{job.service} · {job.time}</span></div><em>{job.status}</em></div>)}
                </section>
                <div className={styles.shortcuts}><span><CalendarDays size={17} /><b>Schedule</b><ArrowRight size={14} /></span><span><CreditCard size={17} /><b>Payments</b><ArrowRight size={14} /></span><span><Settings size={17} /><b>Your account &amp; property</b><ArrowRight size={14} /></span></div>
              </>}
              {view === "jobs" && <section className={styles.visits}><div className={styles.visitsHeading}><h4>Current work orders</h4><Link href="/signup?role=client">View all</Link></div>{jobs.map((job) => <div className={styles.visit} key={job.person}><div><strong><User size={13} /> {job.person}</strong><span>{job.service} · {job.time}</span></div><em>{job.status}</em></div>)}</section>}
              {view === "messages" && (
                <div className={`${styles.panel} ${styles.messages}`}>
                  <div className={styles.panelTitle}><div><h4>Messages</h4><span>Everything is ready for today</span></div></div>
                  <div className={styles.message}><span>J</span><div><b>Jamie</b><p>I’m on my way. I’ll send a photo when the driveway is clear.</p></div><small>9:42</small></div>
                  <div className={styles.message}><span>S</span><div><b>SNOWD support</b><p>Your payment is protected until the job is complete.</p></div><small>Yesterday</small></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.phone}>
          <div className={styles.phoneTop}><span>9:41</span><i /><span>•••</span></div>
          <div className={styles.phoneHeader}><Image src="/logo.png" alt="" width={19} height={21} /><b>snowd.</b><span>1 of 2</span></div>
          <div className={styles.phoneContent}>
            {booked ? (
              <div className={styles.booked}><span><Check size={27} /></span><h3>Help requested.</h3><p>Jamie will confirm your visit shortly.</p><div><CalendarDays size={17} /><b>Today · 11:30 AM</b></div></div>
            ) : (
              <>
                <p className={styles.phoneKicker}>BOOK SNOW HELP</p><h3>What needs<br />clearing?</h3><p className={styles.phoneIntro}>Choose a service for your home.</p>
                <button className={styles.select} onClick={() => setService(service === "Driveway + walkway" ? "Front steps" : "Driveway + walkway")}><span><Shovel size={18} /><b>{service}</b></span><ChevronDown size={17} /></button>
                <div className={styles.address}><span><House size={16} /></span><div><small>YOUR HOME</small><b>18 Maple Avenue</b></div><Check size={15} /></div>
                <div className={styles.phonePrice}><span>Estimated total<small>Includes service fees</small></span><strong>{service === "Front steps" ? "$24" : "$42"}<small> CAD</small></strong></div>
              </>
            )}
            <button className={styles.bookButton} onClick={() => setBooked(!booked)}>{booked ? "Start again" : "Request snow help"}</button>
          </div>
          <div className={styles.phoneHome} />
        </div>
      </div>
    </section>
  );
}
