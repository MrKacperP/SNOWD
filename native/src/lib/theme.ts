// Brand tokens mirror the website's globals.css so both apps feel like one product.
export const colors = {
  ink: "#112b3b",
  text: "#112b3b",
  muted: "#526873",
  faint: "#8a9aa3",
  bg: "#f6f8fb",
  surface: "#ffffff",
  surfaceAlt: "#f0f4f8",
  border: "#e3e9ef",
  accent: "#2350ff",
  accentDark: "#1a3fd6",
  accentSoft: "#eef2ff",
  sun: "#ff8b45",
  sunSoft: "#fff0e6",
  mint: "#18765a",
  mintSoft: "#e6f4ef",
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
  body: { fontSize: 16, color: colors.ink, lineHeight: 22 },
  callout: { fontSize: 15, color: colors.muted, lineHeight: 20 },
  caption: { fontSize: 13, color: colors.muted },
  overline: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6, color: colors.faint, textTransform: "uppercase" as const },
};

export const shadow = {
  shadowColor: "#0b2233",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
