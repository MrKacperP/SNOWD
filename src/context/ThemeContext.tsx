"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemePreference } from "@/lib/types";

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Load stored preference
  useEffect(() => {
    const stored = localStorage.getItem("snowd-theme") as ThemePreference | null;
    if (stored) {
      setThemeState(stored);
    }
  }, []);

  // Apply theme class to <html>
  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (theme === "dark") {
        isDark = true;
      } else if (theme === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      document.documentElement.classList.toggle("dark", isDark);
      setResolvedTheme(isDark ? "dark" : "light");
    };

    applyTheme();

    // Listen for system preference changes
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem("snowd-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
