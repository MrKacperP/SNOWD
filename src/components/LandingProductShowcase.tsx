"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  House,
  MapPin,
  MessageCircle,
  Search,
  Shovel,
  Snowflake,
} from "lucide-react";
import styles from "./LandingProductShowcase.module.css";

const jobs = [
  { person: "Maya R.", place: "Cedarvale", service: "Driveway + steps", time: "Today, 11:30", price: "$42", status: "Confirmed" },
  { person: "Robert K.", place: "Leaside", service: "Walkway", time: "Today, 1:00", price: "$28", status: "On the way" },
  { person: "Ana P.", place: "Danforth", service: "Driveway", time: "Tomorrow, 9:00", price: "$35", status: "Requested" },
];

export default function LandingProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<"jobs" | "messages">("jobs");
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
        <p className={styles.eyebrow}>ONE SIMPLE PLACE</p>
        <h2 id="showcase-title">From first flake<br />to all clear.</h2>
        <p>Book from your phone. Follow every visit from your desktop. SNOWD keeps the whole snow day in view.</p>
      </div>

      <div className={styles.stage}>
        <div className={styles.desktop}>
          <div className={styles.desktopBar}>
            <span className={styles.miniBrand}><Image src="/logo.png" alt="" width={20} height={22} />snowd.</span>
            <label className={styles.search}><Search size={14} /><span>Search jobs or neighbours</span></label>
            <span className={styles.user}>MR</span>
          </div>
          <div className={styles.desktopBody}>
            <aside className={styles.sidebar} aria-label="Demo dashboard navigation">
              <button className={view === "jobs" ? styles.active : ""} onClick={() => setView("jobs")}><House size={15} /> Overview</button>
              <button onClick={() => setView("jobs")}><CalendarDays size={15} /> Jobs</button>
              <button className={view === "messages" ? styles.active : ""} onClick={() => setView("messages")}><MessageCircle size={15} /> Messages</button>
              <div className={styles.snowTotal}><Snowflake size={17} /><strong>8 jobs</strong><span>cleared this winter</span></div>
            </aside>
            <div className={styles.dashboard}>
              <div className={styles.welcome}><div><small>GOOD MORNING</small><h3>Your snow day</h3></div><Link href="/signup"><Shovel size={14} /> Book snow help</Link></div>
              <div className={styles.stats}>
                <div><span><CalendarDays size={16} /> Next visit</span><strong>Today</strong><small>11:30 AM</small></div>
                <div><span><CircleDollarSign size={16} /> Winter spend</span><strong>$218</strong><small>6 completed jobs</small></div>
                <div><span><Clock3 size={16} /> Time saved</span><strong>9.5 hrs</strong><small>More time indoors</small></div>
              </div>
              {view === "jobs" ? (
                <div className={styles.panel}>
                  <div className={styles.panelTitle}><div><h4>Upcoming help</h4><span>Live updates from your neighbourhood</span></div><Link href="/signup">View all</Link></div>
                  <div className={styles.jobHead}><span>SHOVELER</span><span>SERVICE</span><span>WHEN</span><span>STATUS</span><span>PRICE</span></div>
                  {jobs.map((job) => <div className={styles.job} key={job.person}><span><i>{job.person[0]}</i><b>{job.person}<small><MapPin size={9} /> {job.place}</small></b></span><span>{job.service}</span><span>{job.time}</span><em>{job.status}</em><strong>{job.price}</strong></div>)}
                </div>
              ) : (
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
              <div className={styles.booked}><span><Check size={27} /></span><h3>Help requested.</h3><p>Jamie will confirm your visit shortly.</p><div><CalendarDays size={17} /><b>Today · 11:30 AM</b></div><button onClick={() => setBooked(false)}>Book another demo</button></div>
            ) : (
              <>
                <p className={styles.phoneKicker}>BOOK SNOW HELP</p><h3>What needs<br />clearing?</h3><p className={styles.phoneIntro}>Choose a service for your home.</p>
                <button className={styles.select} onClick={() => setService(service === "Driveway + walkway" ? "Front steps" : "Driveway + walkway")}><span><Shovel size={18} /><b>{service}</b></span><ChevronDown size={17} /></button>
                <div className={styles.address}><span><House size={16} /></span><div><small>YOUR HOME</small><b>18 Maple Avenue</b></div><Check size={15} /></div>
                <div className={styles.phonePrice}><span>Estimated total<small>Includes service fees</small></span><strong>{service === "Front steps" ? "$24" : "$42"}<small> CAD</small></strong></div>
                <button className={styles.bookButton} onClick={() => setBooked(true)}>Request snow help</button>
                <p className={styles.safe}><Check size={12} /> You won’t be charged until a shoveler confirms.</p>
              </>
            )}
          </div>
          <div className={styles.phoneHome} />
        </div>
      </div>
      <p className={styles.tryIt}><span /> Try it — switch the dashboard view or book the sample visit.</p>
    </section>
  );
}
