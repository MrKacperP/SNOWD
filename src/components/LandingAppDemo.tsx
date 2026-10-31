"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight, BatteryFull, Bell, Camera, Check, CircleDollarSign, ClipboardList, Clock3, CloudSnow,
  Home, Lock, MapPin, Menu, MessageSquare, Monitor, Navigation, RotateCcw, Send, Shovel, Signal,
  Smartphone, Star, Wifi, X,
} from "lucide-react";
import SampleStreetRoute from "./SampleStreetRoute";
import styles from "./LandingAppDemo.module.css";

type Stage = "none" | "pending" | "accepted" | "en-route" | "in-progress" | "completed";
type ClientView = "home" | "book" | "jobs" | "messages" | "payments";
type OperatorView = "home" | "jobs" | "messages" | "payments";
type Message = { id: number; from: "client" | "operator" | "system"; text: string };
type Toast = { id: number; text: string } | null;

const services = [
  { id: "driveway", label: "Driveway", price: 30 },
  { id: "walkway", label: "Walkway", price: 8 },
  { id: "steps", label: "Front steps", price: 4 },
] as const;
const shovelers = [
  { id: "jamie", name: "Jamie Morgan", company: "SnowPath Services Co.", rating: "4.9", jobs: 128, distance: "0.8 km", available: true },
  { id: "alex", name: "Alex Rivera", company: "Fresh Tracks Co.", rating: "4.8", jobs: 74, distance: "1.6 km", available: false },
  { id: "casey", name: "Casey Brooks", company: "ClearRoute Inc.", rating: "5.0", jobs: 41, distance: "2.3 km", available: false },
];
const status: Record<Exclude<Stage, "none">, { label: string; tone: string; title: string; detail: string }> = {
  pending: { label: "Awaiting confirmation", tone: "sun", title: "Request sent to Jamie", detail: "You’ll be notified the moment Jamie accepts." },
  accepted: { label: "Confirmed", tone: "green", title: "Jamie is booked", detail: "Your visit is confirmed. Jamie will head out shortly." },
  "en-route": { label: "On the way", tone: "plain", title: "Jamie is on the way", detail: "Arriving in about 6 minutes." },
  "in-progress": { label: "Work in progress", tone: "plain", title: "Clearing now", detail: "Jamie is clearing your driveway, walkway, and steps." },
  completed: { label: "Completed", tone: "mint", title: "All clear!", detail: "Jamie finished and sent a completion photo." },
};
const operatorNext: Partial<Record<Stage, { label: string; to: Stage; icon: typeof Check; note: string }>> = {
  accepted: { label: "Head out", to: "en-route", icon: Navigation, note: "Morgan will see you on the map." },
  "en-route": { label: "I’ve arrived · Start", to: "in-progress", icon: Shovel, note: "Starts the visit timer." },
  "in-progress": { label: "Finish with photo", to: "completed", icon: Camera, note: "Snap the cleared driveway to finish." },
};
const clientToasts: Partial<Record<Stage, string>> = {
  accepted: "Jamie accepted your request",
  "en-route": "Jamie is on the way",
  "in-progress": "Jamie started clearing",
  completed: "All clear! Completion photo received",
};

function Badge({ stage }: { stage: Exclude<Stage, "none"> }) {
  return <span className={styles.badge} data-tone={status[stage].tone}>{status[stage].label}</span>;
}

function DemoToast({ toast, onClose }: { toast: Toast; onClose: (toast: Toast) => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => onClose(null), 3800);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  return <div key={toast.id} className={styles.toast} role="status"><Bell size={15} aria-hidden="true" /><span>{toast.text}</span></div>;
}

export default function LandingAppDemo() {
  const [stage, setStage] = useState<Stage>("none");
  const [clientView, setClientView] = useState<ClientView>("home");
  const [operatorView, setOperatorView] = useState<OperatorView>("home");
  const [picked, setPicked] = useState<string[]>(["driveway", "walkway", "steps"]);
  const [timing, setTiming] = useState<"asap" | "tomorrow">("asap");
  const [payment, setPayment] = useState<"card" | "cash">("card");
  const [messages, setMessages] = useState<Message[]>([]);
  const [clientDraft, setClientDraft] = useState("");
  const [clientToast, setClientToast] = useState<Toast>(null);
  const [phoneToast, setPhoneToast] = useState<Toast>(null);
  const [unreadPhone, setUnreadPhone] = useState(0);
  const [unreadWeb, setUnreadWeb] = useState(0);
  const [device, setDevice] = useState<"web" | "phone">("web");
  const [inView, setInView] = useState(false);
  const [earned, setEarned] = useState(86);
  const sectionRef = useRef<HTMLElement>(null);
  const nextId = useRef(1);

  const total = services.filter(service => picked.includes(service.id)).reduce((sum, service) => sum + service.price, 0);
  const serviceText = services.filter(service => picked.includes(service.id)).map(service => service.label.toLowerCase()).join(", ") || "no services";
  const when = timing === "asap" ? "As soon as possible" : "Tomorrow, 8:00 AM";

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } }, { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const id = () => nextId.current++;
  const addMessage = (from: Message["from"], text: string) => setMessages(list => [...list, { id: id(), from, text }]);

  function advance(next: Stage) {
    setStage(next);
    const text = clientToasts[next];
    if (text) { setClientToast({ id: id(), text }); }
    if (next === "accepted") addMessage("system", "Jamie accepted the request.");
    if (next === "completed") { addMessage("system", "Visit completed · photo attached."); setEarned(value => value + total); }
  }
  function sendRequest() {
    if (!picked.length) return;
    setStage("pending");
    setClientView("home");
    setMessages([{ id: id(), from: "system", text: `Request sent · ${serviceText} · $${total} CAD` }]);
    setPhoneToast({ id: id(), text: `New request · Morgan Lee · $${total}` });
    setOperatorView("home");
  }
  function decline() {
    setStage("none");
    addMessage("system", "Jamie couldn’t take this one. Try another time.");
    setClientToast({ id: id(), text: "Jamie declined · no charge" });
  }
  function cancel() {
    setStage("none");
    addMessage("system", "Morgan cancelled the request.");
    setPhoneToast({ id: id(), text: "Morgan cancelled the request" });
  }
  function reset() {
    setStage("none"); setClientView("home"); setOperatorView("home"); setMessages([]); setClientDraft("");
    setPicked(["driveway", "walkway", "steps"]); setTiming("asap"); setPayment("card");
    setUnreadPhone(0); setUnreadWeb(0); setClientToast(null); setPhoneToast(null); setEarned(86);
  }
  function sendFromClient(event: FormEvent) {
    event.preventDefault();
    const text = clientDraft.trim();
    if (!text) return;
    addMessage("client", text.slice(0, 240));
    setClientDraft("");
    if (operatorView !== "messages") setUnreadPhone(count => count + 1);
    setPhoneToast({ id: id(), text: `Morgan: ${text.slice(0, 40)}` });
  }
  function replyFromPhone(text: string) {
    addMessage("operator", text);
    if (clientView !== "messages") setUnreadWeb(count => count + 1);
    setClientToast({ id: id(), text: `Jamie: ${text}` });
  }
  const openClient = (view: ClientView) => { setClientView(view); if (view === "messages") setUnreadWeb(0); };
  const openOperator = (view: OperatorView) => { setOperatorView(view); if (view === "messages") setUnreadPhone(0); };

  const hint = stage === "none"
    ? clientView === "book" ? { device: "web", text: "Pick your services, then send the request." } : { device: "web", text: "Start on the web app: click “Find a shoveler”." }
    : stage === "pending" ? { device: "phone", text: "Jamie’s phone just buzzed. Accept the request." }
    : stage === "completed" ? { device: "web", text: "Done! Check the completion photo, then send a thank-you." }
    : { device: "phone", text: `On Jamie’s phone, tap “${operatorNext[stage]?.label}”. Watch the web app update.` };
  const step = { none: clientView === "book" ? 2 : 1, pending: 3, accepted: 4, "en-route": 4, "in-progress": 5, completed: 6 }[stage];
  const showsTrack = stage === "en-route" || stage === "in-progress";

  const clientNav = [
    { view: "home" as const, label: "Home", icon: Home },
    { view: "book" as const, label: "Book help", icon: Shovel },
    { view: "jobs" as const, label: "Jobs", icon: ClipboardList },
    { view: "messages" as const, label: "Messages", icon: MessageSquare, count: unreadWeb },
    { view: "payments" as const, label: "Payments", icon: CircleDollarSign },
  ];
  const operatorNav = [
    { view: "home" as const, label: "Home", icon: Home },
    { view: "jobs" as const, label: "Jobs", icon: ClipboardList, count: stage === "pending" ? 1 : 0 },
    { view: "messages" as const, label: "Messages", icon: MessageSquare, count: unreadPhone },
    { view: "payments" as const, label: "Payments", icon: CircleDollarSign },
  ];

  const chat = (viewer: "client" | "operator") => (
    <div className={styles.thread} aria-live="polite">
      {messages.length === 0 && <p className={styles.empty}>No messages yet. {viewer === "client" ? "Book a visit to chat with Jamie." : "Messages from clients appear here."}</p>}
      {messages.map(message => message.from === "system"
        ? <p key={message.id} className={styles.systemLine}>{message.text}</p>
        : <p key={message.id} className={styles.bubble} data-mine={message.from === viewer}>{message.text}</p>)}
    </div>
  );

  return (
    <section ref={sectionRef} id="demo" className={styles.section} data-inview={inView} aria-labelledby="demo-title">
      <div className={styles.inner}>
        <header className={styles.heading} data-reveal>
          <p className={styles.kicker}>Live demo · No sign-in needed</p>
          <h2 id="demo-title">Book on the web.<br /><span>Watch it happen on the phone.</span></h2>
          <p>Built from the real SNOWD app with sample data. You’re Morgan on the web app, booking Jamie, a shoveler whose phone is on the right. Nothing here is a real booking.</p>
        </header>

        <div className={styles.guide} data-reveal>
          <span className={styles.stepCount}>Step {step} of 6</span>
          <p aria-live="polite"><strong>{hint.device === "web" ? <Monitor size={16} aria-hidden="true" /> : <Smartphone size={16} aria-hidden="true" />}</strong>{hint.text}</p>
          <div className={styles.deviceSwitch} role="group" aria-label="Choose device">
            <button type="button" aria-pressed={device === "web"} data-nudge={hint.device === "web" && device !== "web"} onClick={() => setDevice("web")}><Monitor size={16} aria-hidden="true" />Web app</button>
            <button type="button" aria-pressed={device === "phone"} data-nudge={hint.device === "phone" && device !== "phone"} onClick={() => setDevice("phone")}><Smartphone size={16} aria-hidden="true" />Mobile app</button>
          </div>
          <button type="button" className={styles.reset} onClick={reset}><RotateCcw size={15} aria-hidden="true" />Restart</button>
        </div>

        <div className={styles.stage} data-device={device}>
          {/* Web app: client dashboard */}
          <div className={styles.browser} data-highlight={hint.device === "web"} aria-label="SNOWD web app demo, signed in as Morgan" role="region">
            <div className={styles.chrome} aria-hidden="true">
              <span className={styles.dots}><i /><i /><i /></span>
              <span className={styles.url}><Lock size={11} />snowd.ca/dashboard{clientView === "home" ? "" : clientView === "book" ? "/find" : `/${clientView}`}</span>
            </div>
            <div className={styles.webApp}>
              <aside className={styles.sidebar}>
                <div className={styles.brand}><Image src="/logo.png" alt="" width={22} height={25} /><strong>snowd</strong></div>
                <div className={styles.weather}><CloudSnow size={16} aria-hidden="true" /><strong>−6°C</strong> Light snow</div>
                <nav className={styles.webNav} aria-label="Demo web app navigation">
                  {clientNav.map(({ view, label, icon: Icon, count }) => (
                    <button key={view} type="button" aria-current={clientView === view ? "page" : undefined} onClick={() => openClient(view)}>
                      <Icon size={18} aria-hidden="true" /><span>{label}</span>{!!count && <b className={styles.count}>{count}</b>}
                    </button>
                  ))}
                </nav>
                <div className={styles.account}><span className={styles.avatar}>ML<i className={styles.online} aria-label="Online" /></span><span><strong>Morgan Lee</strong><small>Client</small></span></div>
              </aside>

              <div className={styles.webMain}>
                <DemoToast toast={clientToast} onClose={setClientToast} />
                {clientView === "home" && <div className={styles.screen} key="home">
                  <h3 className={styles.pageTitle}>Your snow day</h3>
                  <div className={styles.mapCard}>
                    <div className={styles.map}><SampleStreetRoute key={showsTrack ? "track" : "idle"} journey={showsTrack} /></div>
                    <p className={styles.mapFooter}><MapPin size={14} aria-hidden="true" />18 Snowdrop Lane · Maple Hollow{showsTrack && <strong>{stage === "en-route" ? "Jamie · 6 min away" : "Jamie is here"}</strong>}</p>
                  </div>
                  {stage === "none" ? (
                    <div className={styles.bookingCard}>
                      <p className={styles.location}><MapPin size={14} aria-hidden="true" />Maple Hollow, ON</p>
                      <h4>Need snow cleared?</h4>
                      <button type="button" className={styles.mainAction} data-pulse onClick={() => setClientView("book")}>Find a shoveler <ArrowRight size={18} aria-hidden="true" /></button>
                    </div>
                  ) : (
                    <div className={styles.nextAction} data-stage={stage}>
                      <div className={styles.nextHead}><h4>{status[stage].title}</h4><Badge stage={stage} /></div>
                      <p>{status[stage].detail}</p>
                      <dl className={styles.summary}>
                        <div><dt>Your shoveler</dt><dd>Jamie Morgan</dd></div>
                        <div><dt>When</dt><dd>{stage === "en-route" ? "Arriving in 6 min" : stage === "in-progress" ? "Clearing now" : when}</dd></div>
                        <div><dt>{payment === "card" ? "Card" : "Cash"}</dt><dd>${total} CAD</dd></div>
                      </dl>
                      {stage === "completed" && <figure className={styles.photo}><Image src="/landing/snowd-cleared-driveway.png" alt="Completion photo of a freshly cleared driveway" width={941} height={1672} sizes="640px" /><figcaption><Camera size={14} aria-hidden="true" />Completion photo · just now</figcaption></figure>}
                      <div className={styles.actions}>
                        <button type="button" className={styles.secondaryAction} onClick={() => openClient("messages")}><MessageSquare size={16} aria-hidden="true" />Message Jamie</button>
                        {stage === "pending" && <button type="button" className={styles.textAction} onClick={cancel}>Cancel request</button>}
                      </div>
                    </div>
                  )}
                  <div className={styles.savedCard}><span>Time back for you</span><strong>{stage === "completed" ? "2 h 05 min" : "1 h 20 min"}</strong><small>Estimated from completed visits</small></div>
                </div>}

                {clientView === "book" && <div className={styles.screen} key="book">
                  <h3 className={styles.pageTitle}>Book help</h3>
                  {stage !== "none" ? <div className={styles.bookingCard}><h4>You already have a visit booked.</h4><button type="button" className={styles.mainAction} onClick={() => setClientView("home")}>View your visit <ArrowRight size={18} aria-hidden="true" /></button></div> : <>
                    <p className={styles.sub}>Shovelers near 18 Snowdrop Lane</p>
                    <ul className={styles.shovelers}>
                      {shovelers.map(person => (
                        <li key={person.id} data-selected={person.available} data-busy={!person.available}>
                          <span className={styles.avatar} aria-hidden="true">{person.name.split(" ").map(part => part[0]).join("")}</span>
                          <span className={styles.personText}><strong>{person.name}</strong><small>{person.company}</small></span>
                          <span className={styles.personMeta}><span><Star size={13} aria-hidden="true" />{person.rating} · {person.jobs} jobs</span><small>{person.available ? `${person.distance} · Available` : "Busy right now"}</small></span>
                        </li>
                      ))}
                    </ul>
                    <fieldset className={styles.fieldset}>
                      <legend>What should Jamie clear?</legend>
                      <div className={styles.chips}>
                        {services.map(service => {
                          const on = picked.includes(service.id);
                          return <button key={service.id} type="button" aria-pressed={on} onClick={() => setPicked(list => on ? list.filter(item => item !== service.id) : [...list, service.id])}>{on && <Check size={14} aria-hidden="true" />}{service.label} <small>${service.price}</small></button>;
                        })}
                      </div>
                    </fieldset>
                    <div className={styles.twoCol}>
                      <fieldset className={styles.fieldset}>
                        <legend>When</legend>
                        <div className={styles.chips}>
                          <button type="button" aria-pressed={timing === "asap"} onClick={() => setTiming("asap")}><Clock3 size={14} aria-hidden="true" />ASAP</button>
                          <button type="button" aria-pressed={timing === "tomorrow"} onClick={() => setTiming("tomorrow")}>Tomorrow 8 AM</button>
                        </div>
                      </fieldset>
                      <fieldset className={styles.fieldset}>
                        <legend>Payment</legend>
                        <div className={styles.chips}>
                          <button type="button" aria-pressed={payment === "card"} onClick={() => setPayment("card")}>Card</button>
                          <button type="button" aria-pressed={payment === "cash"} onClick={() => setPayment("cash")}>Cash</button>
                        </div>
                      </fieldset>
                    </div>
                    <div className={styles.totalRow}>
                      <span><small>Total</small><strong>${total} CAD</strong></span>
                      <button type="button" className={styles.mainAction} data-pulse disabled={!picked.length} onClick={sendRequest}>Send request <Send size={17} aria-hidden="true" /></button>
                    </div>
                  </>}
                </div>}

                {clientView === "jobs" && <div className={styles.screen} key="jobs">
                  <h3 className={styles.pageTitle}>Jobs</h3>
                  <ul className={styles.list}>
                    {stage !== "none" && <li><span><strong>Jamie Morgan</strong><small>{serviceText} · {when}</small></span><Badge stage={stage} /></li>}
                    <li><span><strong>Jamie Morgan</strong><small>driveway, walkway · Jan 12</small></span><span className={styles.badge} data-tone="mint">Completed</span></li>
                    <li><span><strong>Alex Rivera</strong><small>driveway · Dec 28</small></span><span className={styles.badge} data-tone="mint">Completed</span></li>
                  </ul>
                </div>}

                {clientView === "messages" && <div className={`${styles.screen} ${styles.chatScreen}`} key="messages">
                  <h3 className={styles.pageTitle}>Jamie Morgan</h3>
                  {chat("client")}
                  <form className={styles.composer} onSubmit={sendFromClient}>
                    <label className={styles.srOnly} htmlFor="demo-client-message">Message Jamie</label>
                    <input id="demo-client-message" value={clientDraft} onChange={event => setClientDraft(event.target.value)} placeholder={stage === "none" ? "Book a visit first" : "Message Jamie…"} disabled={stage === "none"} maxLength={240} autoComplete="off" />
                    <button type="submit" aria-label="Send message" disabled={stage === "none" || !clientDraft.trim()}><Send size={16} aria-hidden="true" /></button>
                  </form>
                  {stage !== "none" && <div className={styles.quick}>{["Thanks Jamie!", "The side gate is open.", "Please salt the steps."].map(text => <button key={text} type="button" onClick={() => setClientDraft(text)}>{text}</button>)}</div>}
                </div>}

                {clientView === "payments" && <div className={styles.screen} key="payments">
                  <h3 className={styles.pageTitle}>Payments</h3>
                  <ul className={styles.list}>
                    {stage === "completed" && <li><span><strong>Jamie Morgan · {payment === "card" ? "Visa •• 4242" : "Paid in cash"}</strong><small>Today</small></span><strong>${total}.00</strong></li>}
                    {stage !== "none" && stage !== "completed" && payment === "card" && <li><span><strong>Jamie Morgan · Authorized</strong><small>Charged when the visit is done</small></span><strong>${total}.00</strong></li>}
                    <li><span><strong>Jamie Morgan · Visa •• 4242</strong><small>Jan 12</small></span><strong>$38.00</strong></li>
                    <li><span><strong>Alex Rivera · Paid in cash</strong><small>Dec 28</small></span><strong>$30.00</strong></li>
                  </ul>
                </div>}
              </div>
            </div>
          </div>

          {/* Mobile app: shoveler */}
          <div className={styles.phoneWrap}>
            <div className={styles.phone} data-highlight={hint.device === "phone"} role="region" aria-label="SNOWD mobile app demo, signed in as shoveler Jamie">
              <div className={styles.notch} aria-hidden="true" />
              <div className={styles.statusBar} aria-hidden="true"><span>9:41</span><span><Signal size={13} /><Wifi size={13} /><BatteryFull size={15} /></span></div>
              <div className={styles.phoneScreen}>
                <DemoToast toast={phoneToast} onClose={setPhoneToast} />
                {operatorView === "home" && <div className={styles.phoneBody} key="op-home">
                  <div className={styles.phoneHead}><span><small>Good morning</small><strong>Jamie</strong></span><span className={styles.available}><i />Available</span></div>
                  {stage === "none" && <div className={styles.waiting}><span className={styles.radar} aria-hidden="true"><Shovel size={20} /></span><strong>Waiting for requests</strong><small>New requests near you appear here.</small></div>}
                  {stage === "pending" && <div className={styles.request}>
                    <span className={styles.newTag}>New request</span>
                    <strong className={styles.reqName}>Morgan Lee</strong>
                    <small>18 Snowdrop Lane · 0.8 km</small>
                    <p className={styles.reqServices}>{serviceText}</p>
                    <div className={styles.reqFacts}><span><Clock3 size={13} aria-hidden="true" />{timing === "asap" ? "ASAP" : "Tomorrow 8 AM"}</span><strong>${total}</strong></div>
                    <div className={styles.reqButtons}>
                      <button type="button" className={styles.decline} onClick={decline}><X size={15} aria-hidden="true" />Decline</button>
                      <button type="button" className={styles.accept} data-pulse onClick={() => advance("accepted")}><Check size={15} aria-hidden="true" />Accept</button>
                    </div>
                  </div>}
                  {stage !== "none" && stage !== "pending" && <div className={styles.jobCard} data-stage={stage}>
                    <div className={styles.nextHead}><strong>Morgan Lee</strong><Badge stage={stage} /></div>
                    <small>18 Snowdrop Lane · {serviceText}</small>
                    {showsTrack && <div className={styles.phoneMap}><SampleStreetRoute key="op-track" journey /></div>}
                    {stage === "completed" ? <p className={styles.paid}><Check size={15} aria-hidden="true" />{payment === "card" ? `$${total} paid to your account` : `Collect $${total} cash`}</p> : <>
                      <button type="button" className={styles.accept} data-pulse onClick={() => advance(operatorNext[stage]!.to)}>{(() => { const Icon = operatorNext[stage]!.icon; return <Icon size={15} aria-hidden="true" />; })()}{operatorNext[stage]!.label}</button>
                      <small className={styles.note}>{operatorNext[stage]!.note}</small>
                    </>}
                  </div>}
                  <div className={styles.earnings}><span>Today’s earnings</span><strong>${earned}.00</strong><small>{stage === "completed" ? "3 visits" : "2 visits"} · paid same day</small></div>
                </div>}

                {operatorView === "jobs" && <div className={styles.phoneBody} key="op-jobs">
                  <strong className={styles.phoneTitle}>Jobs</strong>
                  <ul className={styles.list}>
                    {stage !== "none" && <li><span><strong>Morgan Lee</strong><small>${total} · {timing === "asap" ? "ASAP" : "Tomorrow"}</small></span><Badge stage={stage} /></li>}
                    <li><span><strong>Priya Shah</strong><small>$48 · 7:10 AM</small></span><span className={styles.badge} data-tone="mint">Completed</span></li>
                    <li><span><strong>Dan Okafor</strong><small>$38 · 6:30 AM</small></span><span className={styles.badge} data-tone="mint">Completed</span></li>
                  </ul>
                </div>}

                {operatorView === "messages" && <div className={`${styles.phoneBody} ${styles.chatScreen}`} key="op-msg">
                  <strong className={styles.phoneTitle}>Morgan Lee</strong>
                  {chat("operator")}
                  {stage !== "none" && <div className={styles.quick}>{["On my way!", "Be there in 10 min.", "All done, have a great day!"].map(text => <button key={text} type="button" onClick={() => replyFromPhone(text)}>{text}</button>)}</div>}
                </div>}

                {operatorView === "payments" && <div className={styles.phoneBody} key="op-pay">
                  <strong className={styles.phoneTitle}>Payments</strong>
                  <div className={styles.earnings}><span>This week</span><strong>${earned + 312}.00</strong><small>Next payout · tomorrow</small></div>
                  <ul className={styles.list}>
                    {stage === "completed" && <li><span><strong>Morgan Lee</strong><small>{payment === "card" ? "Card" : "Cash"} · today</small></span><strong>+${total}</strong></li>}
                    <li><span><strong>Priya Shah</strong><small>Card · today</small></span><strong>+$48</strong></li>
                    <li><span><strong>Dan Okafor</strong><small>Cash · today</small></span><strong>+$38</strong></li>
                  </ul>
                </div>}
              </div>
              <nav className={styles.dock} aria-label="Demo mobile app navigation">
                {operatorNav.map(({ view, label, icon: Icon, count }) => (
                  <button key={view} type="button" aria-current={operatorView === view ? "page" : undefined} onClick={() => openOperator(view)}>
                    <span className={styles.dockIcon}><Icon size={19} strokeWidth={operatorView === view ? 2 : 1.7} aria-hidden="true" />{!!count && <b className={styles.dot}>{count}</b>}</span><span>{label}</span>
                  </button>
                ))}
                <button type="button" disabled aria-label="More (not in demo)"><span className={styles.dockIcon}><Menu size={19} strokeWidth={1.7} aria-hidden="true" /></span><span>More</span></button>
              </nav>
              <span className={styles.homeBar} aria-hidden="true" />
            </div>
            <p className={styles.phoneCaption}>Jamie’s phone · SNOWD for iOS &amp; Android</p>
          </div>
        </div>
      </div>
    </section>
  );
}
