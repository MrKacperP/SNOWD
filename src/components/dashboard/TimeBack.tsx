"use client";
import { useEffect, useState } from "react";
import { timeSavedLabel } from "@/lib/clientValue";
import { AngelImprint, Barn, Marshmallow, Mug, Pan, Pancake, Plate, Sheep, SleepingCat, SnowAngelKid, Snowball, Snowflake, SnowmanFace, Steam, TopHat, WoolPuff, Yarn } from "@/components/illustrations";
import styles from "./TimeBack.module.css";

export type SceneName = "sheep" | "cocoa" | "angel" | "nap" | "snowman" | "pancake";
type Example = { minutesEach: number; scene: SceneName; text: (count: number) => string };
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// Silly yardsticks for the time a visit gave back. Minutes are rough, on purpose.
const EXAMPLES: Example[] = [
  { minutesEach: 15, scene: "sheep", text: n => `That's ${plural(n, "whole sheep", "whole sheep")} you could've sheared — then watched ${n === 1 ? "it" : "them"} hop into the barn and back out without ${n === 1 ? "its coat" : "their coats"}.` },
  { minutesEach: 6, scene: "cocoa", text: n => `That's ${plural(n, "mug", "mugs")} of hot chocolate, with the marshmallows making a run for it.` },
  { minutesEach: 3, scene: "angel", text: n => `That's ${plural(n, "snow angel", "snow angels")} — the only kind of snow work worth doing.` },
  { minutesEach: 20, scene: "nap", text: n => `That's ${plural(n, "cat nap", "cat naps")}. The cat would like to know why you're still awake.` },
  { minutesEach: 40, scene: "snowman", text: n => `That's ${plural(n, "snowman", "snowmen")} rolled, stacked, and properly hatted.` },
  { minutesEach: 4, scene: "pancake", text: n => `That's ${plural(n, "pancake", "pancakes")} flipped — and at least one that flew across the kitchen.` },
];

function useCountUp(target: number, run: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target <= 0) {
      const frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    const duration = 1600, start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, run]);
  return value;
}

const FLAKES = [8, 22, 37, 55, 71, 88];

function Scene({ scene }: { scene: SceneName }) {
  return <div className={`${styles.stage} ${styles[scene]}`} aria-hidden="true">
    {FLAKES.map((left, index) => <span key={left} className={styles.flake} style={{ left: `${left}%`, animationDelay: `${index * -1.7}s`, animationDuration: `${7 + (index % 3) * 2}s` }}><Snowflake /></span>)}
    <span className={styles.ground} />
    {scene === "sheep" && <>
      <span className={styles.barn}><Barn /></span>
      <span className={styles.woolly}><span className={styles.hop}><Sheep /></span></span>
      <span className={styles.wool}><WoolPuff /></span>
      <span className={styles.shorn}><span className={styles.hop}><Sheep shorn /></span></span>
    </>}
    {scene === "cocoa" && <>
      <span className={styles.mug}><Mug /></span>
      {[0, 1].map(index => <span key={index} className={styles.steam} style={{ animationDelay: `${index * 1.1}s`, marginRight: index * 22 }}><Steam /></span>)}
      {[0, 1, 2].map(index => <span key={index} className={styles.mallow} style={{ animationDelay: `${index * 1.4}s` }}><span className={styles.bounce} style={{ animationDelay: `${index * 1.4}s` }}><Marshmallow /></span></span>)}
    </>}
    {scene === "angel" && <>
      <span className={`${styles.imprint} ${styles.imprintOne}`}><AngelImprint /></span>
      <span className={`${styles.imprint} ${styles.imprintTwo}`}><AngelImprint /></span>
      <span className={styles.kid}><SnowAngelKid armClass={styles.arms} legClass={styles.legs} /></span>
    </>}
    {scene === "nap" && <>
      <span className={styles.cat}><SleepingCat breatheClass={styles.breathe} /></span>
      {[0, 1, 2].map(index => <span key={index} className={styles.z} style={{ animationDelay: `${index * 1.2}s` }}><svg viewBox="0 0 20 20"><path d="M4 4h12L4 16h12" fill="none" stroke="#8aa0c4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>)}
      <span className={styles.yarn}><span className={styles.roll}><Yarn /></span></span>
    </>}
    {scene === "snowman" && <>
      <span className={`${styles.ball} ${styles.base}`}><span className={styles.spin}><Snowball /></span></span>
      <span className={`${styles.ball} ${styles.middle}`}><span className={styles.spin}><Snowball /></span></span>
      <span className={`${styles.ball} ${styles.head}`}><span className={styles.spin}><Snowball /></span><span className={styles.face}><SnowmanFace /></span></span>
      <span className={styles.hat}><TopHat /></span>
    </>}
    {scene === "pancake" && <>
      <span className={styles.plate}><Plate /></span>
      <span className={styles.stacked}><Pancake /></span>
      <span className={styles.pan}><Pan /></span>
      <span className={styles.cake}><span className={styles.flip}><Pancake /></span></span>
    </>}
  </div>;
}

export default function TimeBack({ minutes, loading, loadError, scene: fixedScene }: { minutes: number; loading: boolean; loadError: boolean; /** Pin one scene, for previews. */ scene?: SceneName }) {
  const ready = !loading && !loadError;
  const shown = useCountUp(minutes, ready);
  const options = EXAMPLES.filter(example => minutes / example.minutesEach >= 1);
  const [pick, setPick] = useState(0);
  // Random on the client only, so the server and first render agree.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPick(Math.floor(Math.random() * EXAMPLES.length)));
    return () => cancelAnimationFrame(frame);
  }, []);
  const example = EXAMPLES.find(item => item.scene === fixedScene) || (options.length ? options[pick % options.length] : null);
  const count = example ? Math.floor(minutes / example.minutesEach) : 0;
  const scene = example?.scene || "cocoa";

  return (
    <section className={`dashboard-earnings ${styles.card}`} aria-label="Estimated time saved">
      {ready && <Scene key={scene} scene={scene} />}
      <span className={styles.copy}>
        <span>Time back for you</span>
        <strong>{ready ? timeSavedLabel(shown) : "—"}</strong>
        <small>{loading ? "Loading completed visits…" : loadError ? "Could not load time saved." : example ? example.text(count) : "Your first cleared driveway starts the clock. Hot chocolate is on standby."}</small>
        {ready && options.length > 1 && <button type="button" className={styles.shuffle} onClick={() => setPick(value => value + 1)}>Another way to spend it</button>}
      </span>
    </section>
  );
}
