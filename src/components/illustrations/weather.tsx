import styles from "./illustrations.module.css";

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";

/** Open-Meteo WMO weather code → the illustration family that shows it. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code <= 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

const CLOUD = "M19 50h28a11 11 0 0 0 1.5-21.9A15 15 0 0 0 20 24.5 12.8 12.8 0 0 0 19 50z";

function Sun({ small }: { small?: boolean }) {
  return <g className={styles.sun} transform={small ? "translate(10 -8) scale(.62)" : undefined} style={{ transformOrigin: "32px 32px" }}>
    <g className={styles.sunRays} stroke="#ffb627" strokeWidth="3.5" strokeLinecap="round">
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => <line key={angle} x1="32" y1="6" x2="32" y2="12" transform={`rotate(${angle} 32 32)`} />)}
    </g>
    <circle cx="32" cy="32" r="13" fill="#ffd34d" stroke="#ffb627" strokeWidth="2" />
  </g>;
}

function Moon() {
  return <g>
    <path d="M40 12a20 20 0 1 0 12 30A16 16 0 0 1 40 12z" fill="#f4e6ad" stroke="#d9c37a" strokeWidth="2" strokeLinejoin="round" />
    <path className={styles.twinkle} d="M14 14l1.5 3.5L19 19l-3.5 1.5L14 24l-1.5-3.5L9 19l3.5-1.5z" fill="#f4e6ad" />
    <path className={`${styles.twinkle} ${styles.delay}`} d="M52 52l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#f4e6ad" />
  </g>;
}

function Cloud({ tone = "light", className }: { tone?: "light" | "grey" | "dark"; className?: string }) {
  const fill = tone === "dark" ? "#6f7d92" : tone === "grey" ? "#dfe6f0" : "#ffffff";
  const stroke = tone === "dark" ? "#4f5b6d" : "#b9c7da";
  return <path className={className} d={CLOUD} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />;
}

/** Animated, emoji-free weather mark. 64×64 viewBox; size it with CSS. */
export function WeatherArt({ kind, isDay = true, className }: { kind: WeatherKind; isDay?: boolean; className?: string }) {
  return <svg className={`${styles.weather} ${className || ""}`} viewBox="0 0 64 64" aria-hidden="true">
    {kind === "clear" && (isDay ? <Sun /> : <Moon />)}
    {kind === "partly" && <>{isDay ? <Sun small /> : <g transform="translate(14 -6) scale(.6)"><Moon /></g>}<Cloud className={styles.drift} /></>}
    {kind === "cloudy" && <><g transform="translate(9 -9) scale(.8)"><Cloud tone="grey" className={styles.driftSlow} /></g><Cloud className={styles.drift} /></>}
    {kind === "fog" && <><g transform="translate(0 -8)"><Cloud tone="grey" /></g>
      <g stroke="#9fb0c6" strokeWidth="3" strokeLinecap="round">
        <line className={styles.fogLine} x1="12" y1="48" x2="44" y2="48" />
        <line className={`${styles.fogLine} ${styles.delay}`} x1="20" y1="55" x2="54" y2="55" />
      </g></>}
    {kind === "rain" && <><g transform="translate(0 -10)"><Cloud tone="grey" /></g>
      <g stroke="#3d7bff" strokeWidth="3" strokeLinecap="round">
        {[22, 32, 42].map((x, index) => <line key={x} className={styles.drop} style={{ animationDelay: `${index * .25}s` }} x1={x} y1="44" x2={x - 3} y2="51" />)}
      </g></>}
    {kind === "snow" && <><g transform="translate(0 -10)"><Cloud /></g>
      {[20, 32, 44].map((x, index) => <g key={x} className={styles.flake} style={{ animationDelay: `${index * .6}s` }}>
        <path d={`M${x} 40v10M${x - 4.3} 42.5l8.6 5M${x + 4.3} 42.5l-8.6 5`} stroke="#3d7bff" strokeWidth="2.4" strokeLinecap="round" />
      </g>)}</>}
    {kind === "storm" && <><g transform="translate(0 -10)"><Cloud tone="dark" /></g>
      <path className={styles.bolt} d="M33 40l-7 11h6l-3 10 10-14h-6l4-7z" fill="#ffd34d" stroke="#e6a800" strokeWidth="1.5" strokeLinejoin="round" />
      <g stroke="#3d7bff" strokeWidth="3" strokeLinecap="round"><line className={styles.drop} x1="20" y1="44" x2="17" y2="51" /><line className={styles.drop} style={{ animationDelay: ".4s" }} x1="46" y1="44" x2="43" y2="51" /></g></>}
  </svg>;
}
