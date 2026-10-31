"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BatteryFull, Lock, RotateCcw, Signal, Wifi } from "lucide-react";
import type { JobStatus } from "@/lib/types";
import type { DemoSpot } from "@/app/demo/page";
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
const STEP_MS = 3200;
const WEB_WIDTH = 1280;
const WEB_HEIGHT = 820;

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
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [load, setLoad] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const webFrame = useRef<HTMLIFrameElement>(null);
  const phoneFrame = useRef<HTMLIFrameElement>(null);
  const { ref: webViewport, scale: webScale } = useFit(WEB_WIDTH);

  // Only load the two app copies once the section is close to the screen.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setLoad(true); observer.disconnect(); } }, { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sync = useCallback(() => {
    for (const frame of [webFrame.current, phoneFrame.current]) frame?.contentWindow?.postMessage({ type: "snowd-demo", status, spot }, window.location.origin);
  }, [spot, status]);
  useEffect(sync, [sync]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "snowd-demo-ready") sync();
      if (event.data?.type === "snowd-demo-request") setStatus(current => current || "pending");
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [sync]);

  // The shoveler side runs itself: accept, head out, clear, finish.
  useEffect(() => {
    if (!status || status === "completed") return;
    const timer = window.setTimeout(() => setStatus(STEPS[STEPS.indexOf(status) + 1]), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <section ref={sectionRef} id="demo" className={styles.section} aria-labelledby="demo-title">
      <div className={styles.inner}>
        <h2 id="demo-title" className={styles.title} data-reveal>Try it. <span>Booked in three taps.</span></h2>
        <div className={styles.stage}>
          <div className={styles.browser}>
            <div className={styles.chrome} aria-hidden="true">
              <span className={styles.dots}><i /><i /><i /></span>
              <span className={styles.url}><Lock size={11} />snowd.ca/dashboard</span>
            </div>
            <div ref={webViewport} className={styles.webViewport} style={{ height: WEB_HEIGHT * webScale }}>
              {load && <iframe ref={webFrame} src="/demo" title="SNOWD web app demo with sample data" onLoad={sync} style={{ width: WEB_WIDTH, height: WEB_HEIGHT, transform: `scale(${webScale})` }} />}
            </div>
          </div>
          <div className={styles.phone}>
            <span className={styles.island} aria-hidden="true" />
            <div className={styles.phoneViewport}>
              <div className={styles.statusBar} aria-hidden="true"><span>9:41</span><span><Signal size={13} /> <Wifi size={13} /> <BatteryFull size={16} /></span></div>
              {load && <iframe ref={phoneFrame} src="/demo" title="SNOWD mobile app demo with sample data" onLoad={sync} />}
            </div>
          </div>
        </div>
        {status === "completed" && <button type="button" className={styles.restart} onClick={() => setStatus(null)}><RotateCcw size={15} aria-hidden="true" />Start over</button>}
      </div>
    </section>
  );
}
