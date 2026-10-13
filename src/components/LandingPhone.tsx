"use client";

import { useState } from "react";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import Link from "next/link";
import {
  ArrowRight,
  BatteryFull,
  Banknote,
  CalendarDays,
  Check,
  Clock3,
  ClipboardList,
  CreditCard,
  Home,
  House,
  MapPin,
  Menu,
  MessageSquare,
  Mountain,
  RotateCcw,
  Shovel,
  Signal,
  Snowflake,
  Sparkles,
  Trees,
  Truck,
  UserRound,
  Wifi,
} from "lucide-react";
import styles from "./LandingPhone.module.css";

type View = "home" | "find" | "location" | "timing" | "review" | "success" | "jobs" | "messages" | "menu";
const tabs = [
  { view: "home" as const, label: "Home", icon: Home },
  { view: "find" as const, label: "Book help", icon: Shovel },
  { view: "jobs" as const, label: "Jobs", icon: ClipboardList },
  { view: "messages" as const, label: "Messages", icon: MessageSquare },
  { view: "menu" as const, label: "More", icon: Menu },
];
const operators = [
  { id: "jamie", name: "Jamie Morgan", company: "SnowPath Services Co.", payment: "Cash & card", icon: Snowflake, tone: "blue" },
  { id: "morgan", name: "Morgan Lee", company: "Northline Snow Inc.", payment: "Cash & card", icon: Mountain, tone: "green" },
  { id: "alex", name: "Alex Rivera", company: "Fresh Tracks Co.", payment: "Cash & card", icon: Sparkles, tone: "gold" },
  { id: "casey", name: "Casey Brooks", company: "ClearRoute Inc.", payment: "Cash & card", icon: Trees, tone: "violet" },
  { id: "taylor", name: "Taylor Chen", company: "WhitePine Property Care Co.", payment: "Cash & card", icon: Truck, tone: "mint" },
] as const;

function SampleRouteMap({ compact = false, operatorName = "Jamie" }: { compact?: boolean; operatorName?: string }) {
  return <div className={compact ? styles.routeMapSmall : styles.routeMap} aria-label="Sample route along Toronto streets">
    <svg className={styles.streetMap} viewBox="0 0 320 160" preserveAspectRatio="none" aria-hidden="true">
      <rect width="320" height="160" fill="#eaf2ed" />
      <path d="M0 40H320M0 82H320M0 122H320M42 0V160M102 0V160M162 0V160M222 0V160M282 0V160" fill="none" stroke="#fff" strokeWidth="21" />
      <path d="M0 40H320M0 82H320M0 122H320M42 0V160M102 0V160M162 0V160M222 0V160M282 0V160" fill="none" stroke="#c8d7dc" strokeWidth="14" />
      <path d="M0 40H320M0 82H320M0 122H320M42 0V160M102 0V160M162 0V160M222 0V160M282 0V160" fill="none" stroke="#e9f0f2" strokeWidth="1" strokeDasharray="5 7" />
      {[65,125,185,245].map(x => <g key={x} fill="#f9fcfa" stroke="#b9cfc4" strokeWidth="1.5"><rect x={x} y="12" width="24" height="16" rx="3" /><rect x={x} y="51" width="24" height="19" rx="3" /><rect x={x} y="94" width="24" height="16" rx="3" /><rect x={x} y="135" width="24" height="16" rx="3" /></g>)}
      <path className={styles.animatedRoute} d="M42 40H102V82H162V122H282" fill="none" stroke="#387da2" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
      <circle cx="42" cy="40" r="7" fill="#315f79" stroke="white" strokeWidth="3" />
      <circle cx="282" cy="122" r="7" fill="#fff" stroke="#315f79" strokeWidth="3" />
    </svg>
    <span className={`${styles.routePin} ${styles.routeStart}`}><MapPin size={compact ? 13 : 16} fill="currentColor" /></span>
    <span className={`${styles.routePin} ${styles.routeEnd}`}><House size={compact ? 13 : 16} /></span>
    <span className={styles.routeMapLabel}>{compact ? "ROUTE" : `${operatorName.toUpperCase()} · SAMPLE ROUTE`}</span>
  </div>;
}

export default function LandingPhone() {
  const [view, setView] = useState<View>("home");
  const [requested, setRequested] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(operators[0].id);
  const [schedule, setSchedule] = useState<"asap" | "scheduled" | null>(null);
  const [payment, setPayment] = useState<"cash" | "credit">("cash");
  const [demoDate, setDemoDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(addDays(new Date(), 1)));
  const [demoTime, setDemoTime] = useState("09:00");
  const selectedOperator = operators.find((operator) => operator.id === selectedOperatorId) || operators[0];
  const activeTab = ["location", "timing", "review", "success"].includes(view) ? "find" : view;
  const walkthroughStep = view === "home" || view === "find" ? 1 : view === "location" ? 2 : view === "timing" ? 3 : view === "review" ? 4 : 5;
  const goBack = () => setView(view === "find" ? "home" : view === "location" ? "find" : view === "timing" ? "location" : view === "review" ? "timing" : "home");
  const sendRequest = () => { setRequested(true); setView("success"); };
  const resetDemo = () => { setRequested(false); setSchedule(null); setPayment("cash"); setView("home"); };
  const showAction = view === "home" || view === "location" || view === "review" || view === "success" || (view === "timing" && schedule !== null);
  const actionLabel = view === "home" ? "Find a shoveler"
    : view === "location" ? "Confirm sample location"
    : view === "timing" ? "Review choices"
    : view === "review" ? "Send sample request"
    : "Start again";
  const action = view === "home" ? () => setView("find")
    : view === "location" ? () => setView("timing")
    : view === "timing" ? () => setView("review")
    : view === "review" ? sendRequest : resetDemo;
  const scheduledDateLabel = format(new Date(`${demoDate}T12:00:00`), "EEE, MMM d");
  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(calendarMonth)), end: endOfWeek(endOfMonth(calendarMonth)) });
  const timeOptions = Array.from({ length: 25 }, (_, index) => {
    const minutes = 7 * 60 + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
  const showNav = ["home", "jobs", "messages", "menu"].includes(view);

  return <div className={styles.demo}>
    <p className={styles.caption}>Step {walkthroughStep} of 5</p>
    <div className={styles.phone} aria-label="Interactive sample of the SNOWD client booking flow">
      <div className={styles.status}><span>9:41</span><span className={styles.island} /><span><Signal size={12} /><Wifi size={12} /><BatteryFull size={17} /></span></div>
      <main className={`${styles.screen} ${view === "home" ? styles.homeScreen : ""} ${view === "success" ? styles.successScreen : ""} ${view === "timing" && schedule === null ? styles.timingIntroScreen : ""}`} key={view}>
        {view === "home" && <>
          <section className={styles.locationMap} aria-label="Illustrated sample street in Toronto, Ontario">
            <span className={styles.mapRoadPrimary} /><span className={styles.mapRoadSecondary} />
            <span className={`${styles.mapHome} ${styles.mapHomeOne}`}><House size={16} /></span>
            <span className={`${styles.mapHome} ${styles.mapHomeTwo}`}><House size={16} /></span>
            <span className={`${styles.mapHome} ${styles.mapHomeThree}`}><House size={16} /></span>
            <span className={styles.mapDriveway} />
            <span className={styles.mapMarker}><MapPin size={24} fill="currentColor" /></span>
            <span className={styles.mapLabel}><MapPin size={12} /> Toronto, Ontario</span>
          </section>
          <section className={styles.orderIntro}><h3>Need your driveway shoveled?</h3></section>
        </>}

        {view === "find" && <>
          <div className={styles.screenTitle}><button type="button" onClick={goBack} aria-label="Back"><ArrowRight size={16} /></button><h3>Find a shoveler</h3></div>
          <div className={styles.operatorList}>{operators.map((operator) => {
            const Logo = operator.icon;
            return <button key={operator.id} type="button" className={styles.operatorChoice} onClick={() => { setSelectedOperatorId(operator.id); setView("location"); }}>
              <span className={`${styles.companyLogo} ${styles[operator.tone]}`}><Logo size={22} strokeWidth={1.8} /></span>
              <span className={styles.operatorInfo}><strong>{operator.name}</strong><span>{operator.company}</span><small>{operator.payment}</small></span>
              <ArrowRight className={styles.operatorArrow} size={17} />
            </button>;
          })}</div>
        </>}

        {view === "location" && <>
          <div className={styles.screenTitle}><button type="button" onClick={goBack} aria-label="Back"><ArrowRight size={16} /></button><h3>Where should {selectedOperator.name.split(" ")[0]} go?</h3></div>
          <section className={styles.savedLocationCard} aria-label="Saved sample property">
            <div className={styles.savedLocationMap} aria-hidden="true"><span className={styles.mapRoadPrimary} /><span className={styles.mapRoadSecondary} /><span className={`${styles.mapHome} ${styles.mapHomeOne}`}><House size={16} /></span><span className={`${styles.mapHome} ${styles.mapHomeTwo}`}><House size={16} /></span><span className={`${styles.mapHome} ${styles.mapHomeThree}`}><House size={16} /></span><span className={styles.mapDriveway} /><span className={styles.mapMarker}><MapPin size={24} fill="currentColor" /></span></div>
            <div className={styles.savedLocationDetails}><span>Your property</span><strong>18 Maple Avenue</strong><p>Toronto, Ontario <em>Sample address</em></p></div>
          </section>
        </>}

        {view === "timing" && <>
          {schedule !== null && <button type="button" onClick={() => setSchedule(null)} aria-label="Back to timing choices" className={styles.timingSelectedBack}><ArrowRight size={16} /></button>}
          {schedule === null && <div className={styles.timingIntro}><button type="button" onClick={goBack} aria-label="Back" className={styles.timingBack}><ArrowRight size={16} /></button><span className={styles.timingClock}><Clock3 size={56} strokeWidth={1.5} /></span><h3>When do you need help?</h3><div className={styles.timingOptions}><button type="button" onClick={() => setSchedule("asap")}><Sparkles size={19} /><span>ASAP</span></button><button type="button" onClick={() => setSchedule("scheduled")}><CalendarDays size={19} /><span>Scheduled</span></button></div></div>}
          {schedule === "asap" && <section className={styles.etaCard}>
            <SampleRouteMap compact operatorName={selectedOperator.name.split(" ")[0]} />
            <div className={styles.etaDetails}><small>{selectedOperator.name.toUpperCase()} · SAMPLE ETA</small><strong>About 12 minutes after confirmation</strong><span>{selectedOperator.name} → Your property</span><span>18 Maple Avenue · Toronto</span></div>
          </section>}
          {schedule === "scheduled" && <section className={styles.scheduleCard}>
            <div className={styles.calendarWidget}>
              <div className={styles.calendarHeader}><button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} aria-label="Previous month">‹</button><strong>{format(calendarMonth, "MMMM yyyy")}</strong><button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} aria-label="Next month">›</button></div>
              <div className={styles.calendarGrid}>{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}${index}`} className={styles.weekday}>{day}</span>)}{monthDays.map(day => {
                const value = format(day, "yyyy-MM-dd");
                const isPast = isBefore(day, new Date(new Date().setHours(0, 0, 0, 0)));
                return <button key={value} type="button" disabled={isPast} aria-pressed={value === demoDate} className={!isSameMonth(day, calendarMonth) ? styles.outsideMonth : ""} onClick={() => setDemoDate(value)}>{format(day, "d")}</button>;
              })}</div>
            </div>
            <div className={styles.timePickerSection}><div className={styles.timePickerHeading}><span>Choose a time</span><strong>{format(new Date(`2000-01-01T${demoTime}:00`), "h:mm a")}</strong></div><div className={styles.timePicker} role="listbox" aria-label="Choose sample time">{timeOptions.map(time => <button key={time} type="button" role="option" aria-selected={demoTime === time} onClick={() => setDemoTime(time)}>{format(new Date(`2000-01-01T${time}:00`), "h:mm a")}</button>)}</div></div>
          </section>}
        </>}

        {view === "review" && <>
          <div className={styles.screenTitle}><button type="button" onClick={goBack} aria-label="Back"><ArrowRight size={16} /></button><h3>Your sample request</h3></div>
          <div className={styles.reviewSummary}>
            <div className={styles.reviewOperator}><span className={`${styles.companyLogo} ${styles[selectedOperator.tone]}`}><selectedOperator.icon size={20} /></span><span><small>SHOVELER</small><strong>{selectedOperator.name} · {selectedOperator.company}</strong></span></div>
            <div className={styles.reviewRow}><span>Service</span><strong>2-car driveway · Walkway</strong></div>
            <div className={styles.reviewLocation}><span className={styles.reviewLocationIcon}><MapPin size={16} /></span><span><small>LOCATION · SAMPLE</small><strong>18 Maple Avenue</strong></span><b className={schedule === "asap" ? styles.asapLabel : ""}>{schedule === "asap" ? "~12 min" : "Scheduled"}</b></div>
            <div className={styles.reviewRow}><span>When</span><strong className={schedule === "asap" ? styles.asapLabel : ""}>{schedule === "asap" ? "ASAP · about 12 minutes after confirmation" : `${scheduledDateLabel} · ${demoTime}`}</strong></div>
          </div>
          <section className={styles.reviewMap} aria-label="Sample route along Toronto streets"><SampleRouteMap compact operatorName={selectedOperator.name.split(" ")[0]} /></section>
          <fieldset className={styles.paymentChoice}><legend>Payment</legend><div className={styles.choices}><button type="button" aria-pressed={payment === "cash"} onClick={() => setPayment("cash")}><span className={styles.paymentAsset}><Banknote size={25} /></span><span>Cash</span></button><button type="button" aria-pressed={payment === "credit"} onClick={() => setPayment("credit")}><span className={styles.paymentAsset}><CreditCard size={25} /></span><span>Card</span></button></div></fieldset>
        </>}

        {view === "success" && <div className={styles.success}>
          <span className={styles.successIcon}><Check size={30} /></span><h3>Sample request sent</h3>
          <section className={styles.successMapSummary}><SampleRouteMap compact operatorName={selectedOperator.name.split(" ")[0]} /><div className={styles.successFacts}><span><strong>Operator</strong>{selectedOperator.name}</span><span><strong>Payment</strong>{payment === "cash" ? "Cash" : "Card"}</span><span><strong>Date</strong><b className={schedule === "asap" ? styles.asapLabel : ""}>{schedule === "asap" ? "ASAP" : `${scheduledDateLabel} · ${format(new Date(`2000-01-01T${demoTime}:00`), "h:mm a")}`}</b>{schedule === "asap" && <small>~12 min ETA</small>}</span></div></section>
        </div>}

        {view === "jobs" && <><div className={styles.screenTitle}><button type="button" onClick={() => setView("home")} aria-label="Back"><ArrowRight size={16} /></button><h3>Work orders</h3></div>{requested ? <button className={styles.job} onClick={() => setView("messages")}><b>{selectedOperator.name} · Driveway</b><small>Requested</small><span>Open messages <ArrowRight size={14} /></span></button> : <div className={styles.empty}><ClipboardList size={17} /><span><b>None</b></span></div>}</>}
        {view === "messages" && <><div className={styles.screenTitle}><button type="button" onClick={() => setView("home")} aria-label="Back"><ArrowRight size={16} /></button><h3>Messages</h3></div>{requested ? <button className={styles.job} onClick={() => setView("jobs")}><b>{selectedOperator.name}</b><span>View work order <ArrowRight size={14} /></span></button> : <div className={styles.empty}><MessageSquare size={17} /><span><b>None</b></span></div>}</>}
        {view === "menu" && <><div className={styles.screenTitle}><button type="button" onClick={() => setView("home")} aria-label="Back"><ArrowRight size={16} /></button><h3>More</h3></div><button className={styles.menuItem} onClick={() => setView("home")}><UserRound size={16} /> Account <ArrowRight size={15} /></button></>}
      </main>
      {view === "timing" && schedule !== null && <div className={styles.timingDock}><div className={`${styles.timingOptions} ${styles.timingOptionsSelected}`}>
        <button type="button" aria-pressed={schedule === "asap"} onClick={() => setSchedule("asap")}><Sparkles size={19} /><span>ASAP</span></button>
        <button type="button" aria-pressed={schedule === "scheduled"} onClick={() => setSchedule("scheduled")}><CalendarDays size={19} /><span>Scheduled</span></button>
      </div></div>}
      {showAction && <div className={styles.actionArea}><button className={styles.primary} onClick={action}>{view === "success" && <RotateCcw size={17} />}{actionLabel}{view !== "success" && <ArrowRight size={18} />}</button></div>}
      {showNav && <nav className={styles.bottomNav} aria-label="Demo navigation">{tabs.map(({ view: tab, label, icon: Icon }) => <button key={tab} aria-label={label} aria-current={activeTab === tab ? "page" : undefined} onClick={() => setView(tab)}><Icon size={20} /></button>)}</nav>}
      <div className={styles.homeIndicator} />
    </div>
    <p className={styles.disclaimer}>Sample walkthrough · no request is sent</p>
    {view === "success" ? <button className={styles.realApp} onClick={resetDemo}><RotateCcw size={14} /> Replay demo</button> : <Link href="/signup?role=client" className={styles.realApp}>Start a real snow day <ArrowRight size={15} /></Link>}
  </div>;
}
