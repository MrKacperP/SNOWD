"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BatteryFull, Bell, CalendarDays, Check, ClipboardList, CreditCard, Home, MapPin, Menu, MessageSquare, RotateCcw, Search, Shovel, Signal, Star, UserRound, Wifi } from "lucide-react";
import styles from "./LandingPhone.module.css";

type View = "home" | "find" | "review" | "payment" | "success" | "jobs" | "messages" | "menu";
const tabs = [
  { view: "home" as const, label: "Home", icon: Home },
  { view: "find" as const, label: "Book help", icon: Shovel },
  { view: "jobs" as const, label: "Jobs", icon: ClipboardList },
  { view: "messages" as const, label: "Messages", icon: MessageSquare },
  { view: "menu" as const, label: "More", icon: Menu },
];

export default function LandingPhone() {
  const [view, setView] = useState<View>("home");
  const [requested, setRequested] = useState(false);
  const [service, setService] = useState("Driveway");
  const [schedule, setSchedule] = useState<"asap" | "scheduled">("asap");
  const [payment, setPayment] = useState<"cash" | "credit">("cash");
  const [cashAcknowledged, setCashAcknowledged] = useState(true);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [demoDate, setDemoDate] = useState("");
  const [demoTime, setDemoTime] = useState("09:00");
  const serviceLabel = service === "Driveway" ? "driveway" : "walkway";
  const activeTab = view === "review" || view === "payment" || view === "success" ? "find" : view;
  const sendRequest = () => { setRequested(true); setView("success"); };
  const nextAction = view === "home" ? { label: "Find a shoveler", action: () => setView("find") }
    : view === "find" ? { label: "Continue with Jamie", action: () => setView("review") }
    : view === "review" ? { label: "Continue to payment", action: () => setView("payment") }
    : view === "payment" ? { label: "Request snow help", action: sendRequest }
    : { label: "Find a shoveler", action: () => setView("find") };

  return <div className={styles.demo}>
    <p className={styles.caption}>Try the client app</p>
    <div className={styles.phone} aria-label="Interactive preview of the Snowd client workflow">
      <div className={styles.status}><span>9:41</span><span className={styles.island} /><span><Signal size={12} /><Wifi size={12} /><BatteryFull size={17} /></span></div>
      <header className={styles.header}>
        <Image src="/logo.png" alt="" width={27} height={27} /><span className={styles.brand}>snowd<span>.</span><small>MARKETPLACE</small></span>
        <button type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(value => !value)}><Bell size={16} /></button>
      </header>
      {notificationsOpen && <div className={styles.notification}><b>Notifications</b><p>{requested ? "Your sample request is waiting for Jamie." : "You’re all caught up."}</p><button onClick={() => setNotificationsOpen(false)}>Close</button></div>}
      <main className={styles.screen} key={view}>
        {(["home", "find", "review", "payment", "success"] as View[]).includes(view) && <div className={styles.demoStep}>Step {view === "home" ? 1 : view === "find" ? 2 : view === "review" ? 3 : view === "payment" ? 4 : 5} of 5</div>}
        {view === "home" && <>
          <p className={styles.eyebrow}>Good morning</p><h3>Your snow day</h3>
          <section className={styles.bookingCard}>
            <p className={styles.location}><MapPin size={14} /> Toronto, ON</p>
            <h4>Need snow cleared?</h4>
            <p>Find a nearby shoveler for your driveway, walkway, or steps.</p>
            <button className={styles.bookingAction} onClick={() => setView("find")}>Find a shoveler <ArrowRight size={15} /></button>
            <span className={styles.actionNote}>Choose a shoveler, then send a job request.</span>
          </section>
          <div className={styles.sectionHeading}><b>Current work orders</b><button onClick={() => setView("jobs")}>View all</button></div>
          <div className={styles.empty}><MapPin size={17} /><span><b>{requested ? "Request sent" : "All clear for now"}</b><small>{requested ? "Jamie will review your request." : "Your next visit will appear here."}</small></span></div>
        </>}
        {view === "find" && <>
          <h3>Find a shoveler</h3><p className={styles.description}>Choose snow help in Toronto.</p>
          <div className={styles.address}><MapPin size={14} /> Toronto, ON <button onClick={() => setView("menu")}>Change</button></div>
          <div className={styles.searchRow}><label><Search size={15} /><input aria-label="Search shovelers" placeholder="Search shovelers" value={search} onChange={event => setSearch(event.target.value)} /></label><button type="button" aria-label="Filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}>Filters</button></div>
          {filtersOpen && <div className={styles.filterRow}><button onClick={() => setService("Driveway")}>Driveway</button><button onClick={() => setService("Walkway")}>Walkway</button></div>}
          {(!search || "jamie".includes(search.toLowerCase())) ? <div className={styles.operator}>
            <div className={styles.operatorTop}><span className={styles.avatar}>J</span><span><b>Jamie</b><small>New operator · Toronto</small></span><button type="button" aria-label={saved ? "Unsave Jamie" : "Save Jamie"} aria-pressed={saved} onClick={() => setSaved(value => !value)}><Star size={17} fill={saved ? "currentColor" : "none"} /></button></div>
            <p>{serviceLabel} · medium property</p><div className={styles.price}><CreditCard size={15} /> Cash after work</div>
          </div> : <div className={styles.empty}><Search size={17} /><span><b>No operators found</b><small>Try searching for Jamie.</small></span></div>}
        </>}
        {view === "review" && <>
          <p className={styles.eyebrow}>Review your request</p><h3>Request snow help</h3>
          <div className={styles.operatorSummary}><span className={styles.avatar}>J</span><b>Jamie</b><small>Toronto</small></div>
          <fieldset className={styles.field}><legend>Service</legend><div className={styles.choices}>{["Driveway", "Walkway"].map(option => <button type="button" key={option} aria-pressed={service === option} onClick={() => setService(option)}>{option}</button>)}</div></fieldset>
          <fieldset className={styles.field}><legend>When?</legend><div className={styles.choices}><button type="button" aria-pressed={schedule === "asap"} onClick={() => setSchedule("asap")}>ASAP</button><button type="button" aria-pressed={schedule === "scheduled"} onClick={() => setSchedule("scheduled")}>Schedule</button></div></fieldset>
          {schedule === "scheduled" && <div className={styles.dateRow}><input aria-label="Job date" type="date" value={demoDate} onChange={event => setDemoDate(event.target.value)} /><input aria-label="Preferred time" type="time" value={demoTime} onChange={event => setDemoTime(event.target.value)} /></div>}
          <p className={styles.helper}>Jamie will confirm the visit after reviewing your request.</p>
        </>}
        {view === "payment" && <>
          <p className={styles.eyebrow}>Review your request</p><h3>Payment</h3>
          <div className={styles.operatorSummary}><span className={styles.avatar}>J</span><b>Jamie</b><small>{serviceLabel} · {schedule === "asap" ? "ASAP" : "Scheduled"}</small></div>
          <label className={styles.paymentLabel}>Payment<select aria-label="Payment method" value={payment} onChange={event => { setPayment(event.target.value as "cash" | "credit"); setCashAcknowledged(true); }}><option value="cash">Cash after the job</option><option value="credit">Card after photo proof</option></select></label>
          {payment === "cash" && <label className={styles.acknowledge}><input type="checkbox" checked={cashAcknowledged} onChange={event => setCashAcknowledged(event.target.checked)} /> I’ll pay the operator in cash after the work is done.</label>}
          {payment === "credit" && <p className={styles.helper}>Authorize your card after Jamie accepts. It is charged only after photo proof.</p>}
          <p className={styles.helper}>The visit is confirmed when Jamie accepts.</p>
        </>}
        {view === "success" && <div className={styles.success}>
          <span className={styles.successIcon}><Check size={32} /></span><h3>Help requested.</h3>
          <p>Jamie will review your request. We’ll let you know when they respond.</p>
          <div className={styles.successDetail}><CalendarDays size={17} />{schedule === "asap" ? "As soon as possible" : `${demoDate} · ${demoTime}`}</div>
          <button onClick={() => setView("jobs")}>View work order <ArrowRight size={15} /></button>
        </div>}
        {view === "jobs" && <><p className={styles.eyebrow}>Your visits</p><h3>Work orders</h3>{requested ? <button className={styles.job} onClick={() => setView("messages")}><b>Jamie · {serviceLabel}</b><small>Requested · Waiting for confirmation</small><span>Open messages <ArrowRight size={14} /></span></button> : <div className={styles.empty}><ClipboardList size={17} /><span><b>No work orders yet</b><small>Requested visits will appear here.</small></span></div>}</>}
        {view === "messages" && <><p className={styles.eyebrow}>Stay connected</p><h3>Messages</h3><p className={styles.description}>Your visits and conversations, in one place.</p>{requested ? <button className={styles.job} onClick={() => setView("jobs")}><b>Jamie</b><small>Your job request conversation</small><span>View work order <ArrowRight size={14} /></span></button> : <div className={styles.empty}><MessageSquare size={17} /><span><b>No messages yet</b><small>Conversations appear after a visit is requested.</small></span></div>}</>}
        {view === "menu" && <><p className={styles.eyebrow}>Account</p><h3>More options</h3><button className={styles.menuItem} onClick={() => setView("home")}><UserRound size={16} /> Your snow day <ArrowRight size={15} /></button><button className={styles.menuItem} onClick={() => setView("jobs")}><ClipboardList size={16} /> Work orders <ArrowRight size={15} /></button><button className={styles.menuItem} onClick={() => setView("messages")}><MessageSquare size={16} /> Messages <ArrowRight size={15} /></button></>}
      </main>
      {view !== "home" && <div className={styles.actionArea}>{view === "success" ? <Link className={styles.primary} href="/signup?role=client">Sign up to request help <ArrowRight size={16} /></Link> : <button className={styles.primary} onClick={nextAction.action} disabled={(view === "payment" && payment === "cash" && !cashAcknowledged) || (view === "review" && schedule === "scheduled" && !demoDate)}>{nextAction.label}<ArrowRight size={16} /></button>}</div>}
      <nav className={styles.bottomNav} aria-label="Demo navigation">{tabs.map(({ view: tab, label, icon: Icon }) => <button key={tab} aria-label={label} aria-current={activeTab === tab ? "page" : undefined} onClick={() => setView(tab)}><Icon size={20} /></button>)}</nav>
      <div className={styles.homeIndicator} />
    </div>
    <p className={styles.disclaimer}>Sample walkthrough · no request is sent</p>
    {view === "success" ? <button className={styles.realApp} onClick={() => setView("home")}><RotateCcw size={14} /> Replay demo</button> : <Link href="/signup?role=client" className={styles.realApp}>Start a real snow day <ArrowRight size={15} /></Link>}
  </div>;
}
