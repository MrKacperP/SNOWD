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
