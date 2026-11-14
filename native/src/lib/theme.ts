import { Platform } from "react-native";
// Brand tokens mirror the website's globals.css so both apps feel like one product.
export const colors = {
  ink: "#112b3b",
  text: "#112b3b",
  muted: "#526873",
  // Darkened from #8a9aa3 so small labels and placeholders reach 4.5:1 on white.
  faint: "#64757f",
  bg: "#f6f8fb",
  surface: "#ffffff",
  surfaceAlt: "#f0f4f8",
  border: "#e3e9ef",
  // Outlines of things you tap or type in, which need to be easier to see than dividers.
  borderStrong: "#c3ced6",
  accent: "#2350ff",
  accentDark: "#1a3fd6",
  accentSoft: "#eef2ff",
  sun: "#ff8b45",
  sunSoft: "#fff0e6",
  sunText: "#b3500e",
  sunBorder: "#ffd9bf",
  mint: "#18765a",
  mintSoft: "#e6f4ef",
  accentBorder: "#d6defe",
  danger: "#dc2626",
  dangerSoft: "#fdecec",
  bubbleMine: "#2350ff",
  bubbleTheirs: "#ffffff",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const type = {
  largeTitle: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.6, color: colors.ink },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3, color: colors.ink },
  headline: { fontSize: 17, fontWeight: "600" as const, color: colors.ink },
  // Reading sizes sit one step above the iOS minimums so nobody has to squint.
  body: { fontSize: 17, color: colors.ink, lineHeight: 24 },
  callout: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  caption: { fontSize: 14, color: colors.muted, lineHeight: 19 },
  overline: { fontSize: 13, fontWeight: "700" as const, letterSpacing: 0.5, color: colors.faint, textTransform: "uppercase" as const },
};

export const shadow = {
  shadowColor: "#0b2233",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

/** Smallest comfortable tap target, in points. */
export const tap = 44;

/**
 * One colour per work order step, the same as the website's progress bar (timeline.module.css):
 * amber requested → teal confirmed → blue on the way → violet clearing → green done.
 * `bar` fills the progress bar, `text` is readable on white, `soft` is a tinted background.
 */
export const stepColors = {
  pending: { bar: "#e0952b", text: "#a35f06", soft: "#fdf3e4" },
  accepted: { bar: "#1f9aa8", text: "#137480", soft: "#e4f4f6" },
  "en-route": { bar: "#2f6fe0", text: "#2257bd", soft: "#e8effc" },
  "in-progress": { bar: "#7a5af5", text: "#5b3ad6", soft: "#efebfe" },
  completed: { bar: "#23955a", text: "#1a7546", soft: "#e6f4ec" },
  cancelled: { bar: "#d92d20", text: "#b42318", soft: "#fdecea" },
} as const;

export type StepKey = keyof typeof stepColors;
export const stepColor = (status: string) => stepColors[(status in stepColors ? status : "pending") as StepKey];

/** Night-sky blues for the home page hero, matching the website's accent gradient. */
export const hero = { top: "#1b2f8f", mid: "#2350ff", bottom: "#4f3df5", glow: "rgba(255,255,255,0.14)" };

/* ───────────────────────── Premium design system (dashboard v2) ───────────────────────── */

/**
 * SNOWD's royal / electric blue identity, with icy surfaces and dark navy type.
 * Every text colour here reaches at least 4.5:1 on the surface it is meant for.
 */
export const brand = {
  royalDeep: "#0b1a6b",
  royal: "#1530b8",
  electric: "#2350ff",
  electricBright: "#4d7cff",
  sky: "#8fb6ff",
  ice: "#eaf1ff",
  iceDeep: "#d6e3ff",
  frost: "#f5f8ff",
  navy: "#112b3b",
  /** Secondary text on white: 7.4:1. */
  slate: "#526873",
  onBlue: "#ffffff",
  /** Secondary text on the header gradient: 7:1 on royal. */
  onBlueSoft: "#dbe6ff",
  live: "#0f8a52",
  liveBright: "#22c55e",
  liveSoft: "#e3f7ec",
  paused: "#55657a",
  pausedSoft: "#eef1f5",
  gold: "#b25e00",
  goldSoft: "#fff3df",
};

/** An eased (smoothstep) fade from clear to `hex` (#rrggbb), so a coloured band melts into the page with no edge. */
export function fadeInto(hex: string) {
  return `linear-gradient(180deg, ${hex}00 0%, ${hex}0f 15%, ${hex}37 30%, ${hex}80 50%, ${hex}c8 70%, ${hex}ef 85%, ${hex} 100%)`;
}

/**
 * A longer, ease-out fade into `hex`: it turns mostly page-coloured within the first quarter, then
 * trails off softly. Used where cards sit on the fade, so they read on a light ground, not on blue.
 */
export function fadeIntoLong(hex: string) {
  return `linear-gradient(180deg, ${hex}00 0%, ${hex}73 10%, ${hex}bf 22%, ${hex}e0 38%, ${hex}f2 58%, ${hex}fa 78%, ${hex} 100%)`;
}

/** Gradients, as CSS strings for React Native's `backgroundImage`. */
export const gradient = {
  header: `linear-gradient(160deg, ${brand.royalDeep} 0%, ${brand.royal} 42%, ${brand.electric} 78%, ${brand.electricBright} 100%)`,
  earnings: `linear-gradient(145deg, ${brand.royal} 0%, ${brand.electric} 62%, #5b6cff 100%)`,
  ice: `linear-gradient(180deg, #ffffff 0%, ${brand.frost} 100%)`,
  glow: "radial-gradient(circle at 50% 50%, rgba(143,182,255,0.55) 0%, rgba(143,182,255,0) 70%)",
  /** Header colour melting into the page: an eased (smoothstep) ramp with many stops, so no band or edge shows. */
  pageFade: fadeInto("#f6f8fb"),
  live: `linear-gradient(135deg, #0f8a52 0%, #16a663 100%)`,
};

const rounded = Platform.select({ ios: "ui-rounded", default: undefined });

/**
 * Type scale. Sizes are the design's point sizes; every Text still follows the system text size
 * (Dynamic Type / Android font scale), so layouts are built to wrap, never to clip.
 */
export const font = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const, letterSpacing: -0.6, color: brand.navy },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800" as const, letterSpacing: -0.5, color: brand.navy },
  section: { fontSize: 23, lineHeight: 29, fontWeight: "700" as const, letterSpacing: -0.3, color: brand.navy },
  cardTitle: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.2, color: brand.navy },
  metric: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const, letterSpacing: -0.6, fontFamily: rounded, fontVariant: ["tabular-nums" as const], color: brand.navy },
  metricSm: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const, letterSpacing: -0.4, fontFamily: rounded, fontVariant: ["tabular-nums" as const], color: brand.navy },
  body: { fontSize: 18, lineHeight: 25, color: brand.navy },
  bodyStrong: { fontSize: 18, lineHeight: 25, fontWeight: "600" as const, color: brand.navy },
  secondary: { fontSize: 17, lineHeight: 23, color: brand.slate },
  label: { fontSize: 16, lineHeight: 21, fontWeight: "600" as const, color: brand.slate },
  button: { fontSize: 18, lineHeight: 22, fontWeight: "700" as const },
  rounded,
};

/** 4/8-point spacing scale. */
export const gap = { x1: 4, x2: 8, x3: 12, x4: 16, x5: 20, x6: 24, x8: 32, x10: 40 };

export const corner = { sm: 12, md: 16, lg: 22, xl: 28, xxl: 34, pill: 999 };

/** Layered shadows: a tight contact shadow plus a soft blue ambient one. */
export const depth = {
  low: { boxShadow: "0px 1px 2px rgba(11,31,51,0.06), 0px 6px 16px rgba(20,48,140,0.06)" },
  mid: { boxShadow: "0px 2px 6px rgba(11,31,51,0.06), 0px 14px 32px rgba(20,48,140,0.12)" },
  high: { boxShadow: "0px 4px 12px rgba(11,26,107,0.10), 0px 24px 48px rgba(11,26,107,0.20)" },
};

/** Status presentation: every state has a label and an icon as well as a colour. */
export const statusTone = {
  info: { fg: brand.electric, bg: brand.ice, icon: "info.circle.fill" },
  success: { fg: brand.live, bg: brand.liveSoft, icon: "checkmark.circle.fill" },
  warning: { fg: brand.gold, bg: brand.goldSoft, icon: "exclamationmark.circle.fill" },
  danger: { fg: "#b42318", bg: "#fdecea", icon: "exclamationmark.triangle.fill" },
  neutral: { fg: brand.paused, bg: brand.pausedSoft, icon: "pause.circle.fill" },
} as const;

/* ───────────────────────── SNOWD design system (shared with the website's globals.css) ───────────────────────── */

/** Font families: Space Grotesk for headings, Instrument Sans for everything else (loaded in app/_layout). */
export const family = {
  heading: "SpaceGrotesk_700Bold",
  headingSemi: "SpaceGrotesk_600SemiBold",
  body: "InstrumentSans_400Regular",
  bodyMedium: "InstrumentSans_500Medium",
  bodySemi: "InstrumentSans_600SemiBold",
  bodyBold: "InstrumentSans_700Bold",
};

/** The website's tokens (--ink, --accent, --border, --surface-shadow…), for the app. */
export const ds = {
  ink: "#112b3b",
  ink2: "#294653",
  ink3: "#526873",
  bg: "#f6f8fb",
  bgAlt: "#f0f4f8",
  card: "#ffffff",
  border: "#d8e2e6",
  borderSoft: "#e7edef",
  accent: "#2350ff",
  accentDark: "#1a3fd6",
  accentSoft: "#eef2ff",
  accentBorder: "#d6defe",
  accentIndigo: "#4f3df5",
  accentGradient: "linear-gradient(135deg, #2350ff 0%, #3a47fb 55%, #4f3df5 100%)",
  sun: "#ff8b45",
  sunSoft: "#fff0e6",
  sunText: "#b3500e",
  mint: "#18765a",
  mintSoft: "#edf7f2",
  /** --chip background */
  chip: "rgba(17,17,17,0.05)",
  radius: 16,
  cardRadius: 22,
  /** --glass-shadow / app-card shadow */
  cardShadow: { boxShadow: "0px 5px 24px rgba(23,52,67,0.05)" },
  /** --accent-shadow */
  accentShadow: { boxShadow: "0px 6px 18px rgba(35,80,255,0.28)" },
};
