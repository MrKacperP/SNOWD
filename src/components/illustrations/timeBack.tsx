// Hand-drawn props for the "Time back for you" scenes. Each is a plain SVG
// sized by its container, so scenes can move them anywhere in the card.

const INK = "#2d2a35";

const WOOL: [number, number, number][] = [[18, 26, 9], [28, 19, 10], [40, 19, 10], [50, 26, 9], [44, 33, 9], [30, 34, 10], [20, 33, 8]];

/** Side-on sheep facing right. `shorn` swaps the wool for a bare pink body. */
export function Sheep({ shorn }: { shorn?: boolean }) {
  return <svg viewBox="0 0 72 52" aria-hidden="true">
    {[22, 28, 42, 48].map(x => <rect key={x} x={x} y="36" width="4" height="14" rx="2" fill={INK} />)}
    {shorn ? <ellipse cx="35" cy="30" rx="18" ry="10" fill="#f7c9c4" stroke="#e29c95" strokeWidth="2" />
      : <><g fill="#cfd6e0">{WOOL.map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r + 2} />)}</g>
        <g fill="#fff">{WOOL.map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} />)}</g></>}
    <ellipse cx="58" cy="22" rx="7" ry="9" fill={INK} transform="rotate(-15 58 22)" />
    <ellipse cx="52" cy="17" rx="5" ry="2.5" fill={INK} transform="rotate(-30 52 17)" />
    <circle cx="60" cy="20" r="1.6" fill="#fff" />
    {shorn && <path d="M53 26q2 2 5 1" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />}
  </svg>;
}

export function Barn() {
  return <svg viewBox="0 0 96 84" aria-hidden="true">
    <path d="M6 36 48 8l42 28v46H6z" fill="#d2443a" />
    <path d="M2 38 48 6l46 32" fill="none" stroke="#f4efe6" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
    <rect x="38" y="20" width="20" height="14" rx="2" fill="#7b241d" stroke="#f4efe6" strokeWidth="3" />
    <rect x="30" y="46" width="36" height="36" fill="#5a1913" />
    <rect x="30" y="46" width="36" height="36" fill="none" stroke="#f4efe6" strokeWidth="3" />
    <path d="M30 46l36 36M66 46 30 82" stroke="#f4efe6" strokeWidth="3" />
    <path d="M6 82h84" stroke="#9e2f27" strokeWidth="2" />
  </svg>;
}

export function WoolPuff() {
  return <svg viewBox="0 0 48 32" aria-hidden="true">
    <g fill="#cfd6e0">{[[12, 18, 9], [24, 12, 11], [36, 18, 9], [24, 22, 9]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r + 1.5} />)}</g>
    <g fill="#fff">{[[12, 18, 9], [24, 12, 11], [36, 18, 9], [24, 22, 9]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} />)}</g>
  </svg>;
}

export function Mug() {
  return <svg viewBox="0 0 80 72" aria-hidden="true">
    <path d="M58 30h6a10 10 0 0 1 0 20h-6" fill="none" stroke="#2350ff" strokeWidth="6" />
    <path d="M10 22h50v34a14 14 0 0 1-14 14H24a14 14 0 0 1-14-14z" fill="#2350ff" />
    <ellipse cx="35" cy="22" rx="25" ry="6" fill="#6b3b22" stroke="#1b3bc4" strokeWidth="3" />
    <rect x="20" y="15" width="10" height="9" rx="2.5" fill="#fff" stroke="#e3e7ef" strokeWidth="1.5" transform="rotate(-12 25 19)" />
    <rect x="34" y="14" width="10" height="9" rx="2.5" fill="#fff8f3" stroke="#e3e7ef" strokeWidth="1.5" transform="rotate(10 39 18)" />
    <path d="M28 44v12M22 47l12 6M34 47l-12 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".85" />
  </svg>;
}

export function Steam() {
  return <svg viewBox="0 0 20 40" aria-hidden="true"><path d="M10 38c-6-6 6-10 0-18S14 6 10 2" fill="none" stroke="#b8c4d6" strokeWidth="3" strokeLinecap="round" /></svg>;
}

export function Marshmallow() {
  return <svg viewBox="0 0 24 22" aria-hidden="true"><rect x="2" y="2" width="20" height="18" rx="5" fill="#fff" stroke="#c2ccdb" strokeWidth="2" /><path d="M6 8h12" stroke="#ead9cc" strokeWidth="2" strokeLinecap="round" /></svg>;
}

/** Top-down kid in a snow suit; arms and legs are separate groups so they can sweep. */
export function SnowAngelKid({ armClass, legClass }: { armClass?: string; legClass?: string }) {
  return <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 18c-22 0-34 18-34 38s14 30 34 30 34-10 34-30-12-38-34-38z" fill="#e7eef8" />
    <g className={armClass}>
      <path d="M44 42 22 30" stroke="#ff7a59" strokeWidth="9" strokeLinecap="round" />
      <path d="M56 42 78 30" stroke="#ff7a59" strokeWidth="9" strokeLinecap="round" />
    </g>
    <g className={legClass}>
      <path d="M46 64 38 84" stroke="#2350ff" strokeWidth="10" strokeLinecap="round" />
      <path d="M54 64 62 84" stroke="#2350ff" strokeWidth="10" strokeLinecap="round" />
    </g>
    <rect x="40" y="38" width="20" height="30" rx="9" fill="#ff7a59" />
    <circle cx="50" cy="30" r="10" fill="#f4c9a8" />
    <path d="M40 28a10 10 0 0 1 20 0z" fill="#2350ff" />
    <circle cx="50" cy="17" r="4" fill="#fff" />
    <circle cx="46.5" cy="31" r="1.3" fill={INK} /><circle cx="53.5" cy="31" r="1.3" fill={INK} />
    <path d="M47 35q3 2.5 6 0" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
  </svg>;
}

/** The shape a snow angel leaves behind. */
export function AngelImprint() {
  return <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 20c-6 0-10 4-10 10 0 3 1 5 3 7L18 22c-6 0-10 8-6 14l28 14-6 32c0 6 8 8 12 4l4-14 4 14c4 4 12 2 12-4l-6-32 28-14c4-6 0-14-6-14L57 37c2-2 3-4 3-7 0-6-4-10-10-10z" fill="#dce7f7" stroke="#c3d3ea" strokeWidth="2" strokeLinejoin="round" />
  </svg>;
}

export function Snowflake() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><g stroke="#9db8ff" strokeWidth="2" strokeLinecap="round"><path d="M10 1v18M2.2 5.5l15.6 9M2.2 14.5l15.6-9" /></g></svg>;
}

export function SleepingCat({ breatheClass }: { breatheClass?: string }) {
  return <svg viewBox="0 0 110 64" aria-hidden="true">
    <ellipse cx="55" cy="58" rx="46" ry="5" fill="#e3e9f2" />
    <g className={breatheClass}>
      <path d="M18 56c-4-22 14-36 38-36s40 12 38 30c-1 6-6 8-12 8H26c-4 0-7-1-8-2z" fill="#f2a65a" stroke="#c97a2f" strokeWidth="2" />
      <path d="M40 24c2 6 2 12 0 18M56 22c2 7 2 14 0 20M72 26c2 6 2 12 0 18" stroke="#d98a3d" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
    <path d="M86 56c10 0 16-6 14-12" stroke="#c97a2f" strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M86 56c10 0 16-6 14-12" stroke="#f2a65a" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="24" cy="44" r="14" fill="#f2a65a" stroke="#c97a2f" strokeWidth="2" />
    <path d="M13 36l-1-12 9 7zM29 31l7-8 1 12z" fill="#f2a65a" stroke="#c97a2f" strokeWidth="2" strokeLinejoin="round" />
    <path d="M17 44q3 2 6 0M27 44q3 2 6 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M23 49l2 1.5 2-1.5" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>;
}

export function Yarn() {
  return <svg viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="13" fill="#2350ff" />
    <path d="M6 10c8 2 14 8 16 18M4 18c8-1 14 2 18 9M10 4c6 5 10 12 10 22M26 7c-6 2-12 7-16 18" stroke="#7d9bff" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>;
}

export function Snowball() {
  return <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="#f8fbff" stroke="#a7bbd6" strokeWidth="2.5" />
    <path d="M10 14q4-4 9-3" stroke="#dbe5f3" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="26" cy="27" r="2" fill="#dbe5f3" /><circle cx="14" cy="26" r="1.5" fill="#dbe5f3" />
  </svg>;
}

export function SnowmanFace() {
  return <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="15" cy="16" r="2.2" fill={INK} /><circle cx="25" cy="16" r="2.2" fill={INK} />
    <path d="M20 21l12 3-12 3z" fill="#ff8a2a" stroke="#e06d10" strokeWidth="1" strokeLinejoin="round" />
    <path d="M13 29q7 4 14 0" stroke={INK} strokeWidth="2" strokeDasharray="1 3" strokeLinecap="round" fill="none" />
  </svg>;
}

export function TopHat() {
  return <svg viewBox="0 0 40 30" aria-hidden="true"><rect x="2" y="23" width="36" height="5" rx="2.5" fill={INK} /><rect x="9" y="3" width="22" height="22" rx="2" fill={INK} /><rect x="9" y="17" width="22" height="4" fill="#d2443a" /></svg>;
}

export function Pan() {
  return <svg viewBox="0 0 120 40" aria-hidden="true">
    <path d="M78 16h36a4 4 0 0 1 0 8H78z" fill="#5b4636" />
    <path d="M4 12h76l-6 18a8 8 0 0 1-8 6H18a8 8 0 0 1-8-6z" fill="#3a3f4b" />
    <path d="M4 12h76" stroke="#5c6475" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}

export function Pancake() {
  return <svg viewBox="0 0 64 20" aria-hidden="true">
    <ellipse cx="32" cy="11" rx="29" ry="8" fill="#d99a4e" />
    <ellipse cx="32" cy="9" rx="27" ry="6" fill="#f2c27a" />
    <rect x="26" y="4" width="12" height="6" rx="1.5" fill="#fff3c2" stroke="#f0d27a" />
  </svg>;
}

export function Plate() {
  return <svg viewBox="0 0 90 20" aria-hidden="true"><ellipse cx="45" cy="12" rx="43" ry="7" fill="#fff" stroke="#c9d3e2" strokeWidth="2" /><ellipse cx="45" cy="10" rx="28" ry="3.5" fill="#eef2f8" /></svg>;
}
