import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * The app's colour themes. Each one paints the headers (Home, Jobs, Messages, Profile, work orders),
 * the earnings line and the highlights in Messages. White text stays readable on every `deep`/`mid`.
 */
export const THEMES = {
  snowd: { label: "SNOWD blue", deep: "#0b1a6b", mid: "#1530b8", accent: "#2350ff", end: "#4f3df5", soft: "#dbe6ff" },
  midnight: { label: "Midnight", deep: "#0b1220", mid: "#1e293b", accent: "#3b6fe0", end: "#334155", soft: "#d5deea" },
  glacier: { label: "Glacier", deep: "#053b47", mid: "#0b6477", accent: "#0e7490", end: "#0891b2", soft: "#d3f1f6" },
  aurora: { label: "Aurora", deep: "#2e1065", mid: "#4c1d95", accent: "#6d28d9", end: "#9333ea", soft: "#ece0ff" },
  sunset: { label: "Sunset", deep: "#6b1d0c", mid: "#9a3412", accent: "#c2410c", end: "#d97706", soft: "#ffe6d5" },
  forest: { label: "Forest", deep: "#052e16", mid: "#14532d", accent: "#15803d", end: "#16a34a", soft: "#d8f5e1" },
} as const;

export type ThemeKey = keyof typeof THEMES;
export type AppTheme = (typeof THEMES)[ThemeKey] & {
  key: ThemeKey;
  /** The header gradient, top-left to bottom-right. */
  gradient: string;
  /** Home's header takes the live job's step colour instead of the theme. */
  jobColouredHeader: boolean;
};

type Settings = { theme: ThemeKey; jobColouredHeader: boolean };
const DEFAULTS: Settings = { theme: "snowd", jobColouredHeader: true };
const STORAGE_KEY = "snowd.appearance";

const build = (s: Settings): AppTheme => {
  const t = THEMES[s.theme] || THEMES.snowd;
  return { ...t, key: s.theme, jobColouredHeader: s.jobColouredHeader, gradient: `linear-gradient(160deg, ${t.deep} 0%, ${t.mid} 45%, ${t.accent} 85%, ${t.end} 100%)` };
};

const Ctx = createContext<{ theme: AppTheme; settings: Settings; update: (next: Partial<Settings>) => void }>({ theme: build(DEFAULTS), settings: DEFAULTS, update: () => {} });

/** Keeps the chosen look on this phone and shares it with every screen. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Settings>;
        setSettings({ theme: saved.theme && saved.theme in THEMES ? saved.theme : DEFAULTS.theme, jobColouredHeader: saved.jobColouredHeader ?? DEFAULTS.jobColouredHeader });
      })
      .catch(() => {});
  }, []);
  const update = useCallback((next: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  }, []);
  const value = useMemo(() => ({ theme: build(settings), settings, update }), [settings, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The current colour theme. */
export const useAppTheme = () => useContext(Ctx).theme;
/** The theme plus a way to change it, for the Appearance screen. */
export const useAppearance = () => useContext(Ctx);
