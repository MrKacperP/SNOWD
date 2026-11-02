"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BatteryFull, Check, Hand, Home, Lock, MousePointerClick, RotateCcw, Shovel, Signal, Wifi } from "lucide-react";
import type { JobStatus } from "@/lib/types";
import { priceOf, type DemoRole, type DemoSpot } from "@/app/demo/demoData";
import styles from "./LandingAppDemo.module.css";

// A random neighbourhood each visit; the street address in the demo is made up.
const SPOTS: DemoSpot[] = [
  { city: "Toronto", province: "ON", postalCode: "M4M 1A1", lat: 43.6677, lng: -79.3420 },
  { city: "Ottawa", province: "ON", postalCode: "K1S 1A1", lat: 45.3990, lng: -75.6860 },
  { city: "Calgary", province: "AB", postalCode: "T2T 1A1", lat: 51.0300, lng: -114.0950 },
  { city: "Montréal", province: "QC", postalCode: "H2J 1A1", lat: 45.5290, lng: -73.5850 },
  { city: "Winnipeg", province: "MB", postalCode: "R3M 1A1", lat: 49.8650, lng: -97.1600 },
  { city: "Halifax", province: "NS", postalCode: "B3H 1A1", lat: 44.6400, lng: -63.5880 },
];
const STEPS: JobStatus[] = ["pending", "accepted", "en-route", "in-progress", "completed"];
// The moves a visitor can make on the shoveler side, from each status.
const OPERATOR_MOVES: Partial<Record<JobStatus, JobStatus[]>> = {
  pending: ["accepted", "cancelled"],
  accepted: ["en-route"],
  "en-route": ["in-progress", "accepted"],
  "in-progress": ["completed"],
};
const AUTO_MS = 3800;
const WEB_WIDTH = 1280;
const WEB_HEIGHT = 820;

type Guide = { mode: "auto" | "you" | "done"; text: React.ReactNode; real?: string };

/** What the visitor should do now, or what the other side is doing for them. */
function guideFor(role: DemoRole, status: JobStatus | null, paid: boolean, booking: boolean, price: number): Guide {
  if (role === "client") {
    if (!status) return booking
      ? { mode: "you", text: <>Pick what to clear, confirm the address, choose ASAP, then tap <b>Request snow help</b>.</> }
      : { mode: "you", text: <>Tap <b>Find a shoveler</b>, then <b>Request help</b> on a nearby shoveler.</> };
    if (status === "pending") return { mode: "auto", text: "Waiting for Northside Snow Co. to accept your request…", real: "The shoveler gets a ping and taps Accept." };
    if (status === "accepted") return { mode: "auto", text: "Confirmed! Jamie is getting ready to head out…", real: "Jamie taps On my way when they leave." };
    if (status === "en-route") return { mode: "auto", text: "Jamie is on the way. The live arrival time is on your map…", real: "Jamie taps Start work at your door." };
    if (status === "in-progress") return { mode: "auto", text: "Clearing your driveway now…", real: "Jamie snaps a completion photo to finish." };
    return { mode: "done", text: "All clear! That’s a whole visit, start to finish." };
  }
  if (!status) return { mode: "auto", text: "A homeowner nearby is booking you…", real: "Requests in your service area land on your dashboard." };
  if (status === "pending") return { mode: "you", text: <>New request! Tap <b>Accept</b> to take the job.</> };
  if (status === "accepted") return { mode: "you", text: <>Tap <b>On my way</b> when you leave. Morgan gets your arrival time.</> };
  if (status === "en-route") return { mode: "you", text: <>At the property? Tap <b>Start work</b>.</> };
  if (status === "in-progress") return { mode: "you", text: <>Done clearing? Tap <b>Add photo &amp; complete work</b>.</> };
  if (status === "completed" && !paid) return { mode: "you", text: <>Collect the cash, then tap <b>Confirm cash received</b>.</> };
  if (status === "cancelled") return { mode: "done", text: "Request declined. It moves to your history." };
  return { mode: "done", text: `$${price.toFixed(2)} earned. That’s the whole job.` };
}

/** Fits a fixed-size iframe into whatever width its frame gets. */
function useFit(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);
  return { ref, scale };
}

export default function LandingAppDemo() {
  // Never rendered, only sent to the frames, so a server/client difference is harmless.
  const [spot] = useState(() => SPOTS[Math.floor(Math.random() * SPOTS.length)]);
  const [role, setRole] = useState<DemoRole>("client");
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [paid, setPaid] = useState(false);
  const [booking, setBooking] = useState(false);
  const [services, setServices] = useState<string[]>(["driveway"]);
  const [load, setLoad] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const webFrame = useRef<HTMLIFrameElement>(null);
  const phoneFrame = useRef<HTMLIFrameElement>(null);
  const { ref: webViewport, scale: webScale } = useFit(WEB_WIDTH);

  // Only load the two app copies once the section is close to the screen; automation waits until it's on screen.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setLoad(true); near.disconnect(); } }, { rootMargin: "600px 0px" });
    const seen = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    near.observe(node);
    seen.observe(node);
    return () => { near.disconnect(); seen.disconnect(); };
  }, []);

  const sync = useCallback(() => {
    for (const frame of [webFrame.current, phoneFrame.current]) frame?.contentWindow?.postMessage({ type: "snowd-demo", run, role, status, paid, services, spot }, window.location.origin);
  }, [run, role, status, paid, services, spot]);
  useEffect(sync, [sync]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type } = event.data || {};
      if (type === "snowd-demo-ready") sync();
      if (role === "client" && type === "snowd-demo-step") setBooking(true);
      if (role === "client" && type === "snowd-demo-request") {
        if (Array.isArray(event.data.services) && event.data.services.length) setServices(event.data.services);
        setStatus(current => current || "pending");
      }
      if (role === "operator" && type === "snowd-demo-advance") setStatus(current => current && OPERATOR_MOVES[current]?.includes(event.data.to) ? event.data.to : current);
      if (role === "operator" && type === "snowd-demo-paid") setPaid(true);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [sync, role]);

  // Whatever the other person does runs itself: the shoveler's steps for homeowners, the booking for shovelers.
  const guide = guideFor(role, status, paid, booking, priceOf(services));
  const automated = guide.mode === "auto" && inView && load;
  useEffect(() => {
    if (!automated) return;
    const timer = window.setTimeout(() => setStatus(current => role === "operator" ? current || "pending" : current && STEPS[STEPS.indexOf(current) + 1]), AUTO_MS);
    return () => window.clearTimeout(timer);
  }, [automated, role, status]);

  function restart(next = role) {
    setRole(next);
    setRun(current => current + 1);
    setStatus(null);
    setPaid(false);
    setBooking(false);
    setServices(["driveway"]);
  }

  const other: DemoRole = role === "client" ? "operator" : "client";
  const GuideIcon = guide.mode === "auto" ? Hand : guide.mode === "you" ? MousePointerClick : Check;

  return (
    <section ref={sectionRef} id="demo" className={styles.section} aria-label="Try the SNOWD demo">
      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.roles} role="radiogroup" aria-label="Choose a demo" data-reveal>
            <button type="button" role="radio" aria-checked={role === "client"} onClick={() => role !== "client" && restart("client")}><Home size={18} aria-hidden="true" />I’m a homeowner</button>
            <button type="button" role="radio" aria-checked={role === "operator"} onClick={() => role !== "operator" && restart("operator")}><Shovel size={18} aria-hidden="true" />I’m a shoveler</button>
          </div>
        </div>

        <div className={styles.stage}>
          {guide.mode !== "you" && <div className={styles.guide} data-mode={guide.mode}>
            <span className={styles.guideIcon} aria-hidden="true"><GuideIcon size={18} /></span>
            <div className={styles.guideText} aria-live="polite">
              <strong>{guide.mode === "auto" ? "Hands off" : "All done"}</strong>
              <span>{guide.text}</span>
              {guide.real && <small>Demo autoplay. In the real app: {guide.real}</small>}
            </div>
            {guide.mode === "done" && <div className={styles.guideActions}>
              <button type="button" onClick={() => restart()}><RotateCcw size={15} aria-hidden="true" />Start over</button>
              <button type="button" data-primary onClick={() => restart(other)}>Try the {other === "client" ? "homeowner" : "shoveler"} side<ArrowRight size={15} aria-hidden="true" /></button>
            </div>}
            {guide.mode === "auto" && <span className={styles.guideBar} aria-hidden="true"><i key={`${run}-${role}-${status}`} data-paused={!automated || undefined} style={{ animationDuration: `${AUTO_MS}ms` }} /></span>}
          </div>}
          <div className={styles.browser}>
            <div className={styles.chrome} aria-hidden="true">
              <span className={styles.dots}><i /><i /><i /></span>
              <span className={styles.url}><Lock size={11} />snowd.ca/dashboard</span>
            </div>
            <div ref={webViewport} className={styles.webViewport} style={{ height: WEB_HEIGHT * webScale }}>
              {load && <iframe ref={webFrame} src="/demo" title={`SNOWD web app demo, ${role === "client" ? "homeowner" : "shoveler"} view, with sample data`} onLoad={sync} style={{ width: WEB_WIDTH, height: WEB_HEIGHT, transform: `scale(${webScale})` }} />}
            </div>
          </div>
          <div className={styles.phone}>
            <span className={styles.island} aria-hidden="true" />
            <div className={styles.phoneViewport}>
              <div className={styles.statusBar} aria-hidden="true"><span>9:41</span><span><Signal size={13} /> <Wifi size={13} /> <BatteryFull size={16} /></span></div>
              {load && <iframe ref={phoneFrame} src="/demo" title={`SNOWD mobile app demo, ${role === "client" ? "homeowner" : "shoveler"} view, with sample data`} onLoad={sync} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
