"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemePreference } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const resolveTheme = (value: ThemePreference): "light" | "dark" => {
    if (value === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return value;
  };

  // Load stored preference
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("snowd-theme") as ThemePreference | null;
    if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
      setThemeState(stored);
    } else {
      setThemeState("system");
      localStorage.setItem("snowd-theme", "system");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncWithSystem = () => {
      if (theme !== "system") return;
      const systemTheme = media.matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", systemTheme === "dark");
      setResolvedTheme(systemTheme);
    };

    syncWithSystem();
    media.addEventListener("change", syncWithSystem);

    return () => media.removeEventListener("change", syncWithSystem);
  }, [theme, mounted]);

  // Apply theme class to <html>
  useEffect(() => {
    if (!mounted) return;
    
    const nextResolved = resolveTheme(theme);
    document.documentElement.classList.toggle("dark", nextResolved === "dark");
    setResolvedTheme(nextResolved);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const pref = profile?.themePreference;
    if (!pref || (pref !== "light" && pref !== "dark" && pref !== "system")) return;
    setThemeState(pref);
    localStorage.setItem("snowd-theme", pref);
  }, [profile?.themePreference, mounted]);

  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem("snowd-theme", newTheme);
  };

  const toggleTheme = () => {
    const newTheme = resolveTheme(theme) === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
