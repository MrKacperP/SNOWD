"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemePreference } from "@/lib/types";

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
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Load stored preference
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("snowd-theme") as ThemePreference | null;
    if (stored && (stored === "light" || stored === "dark")) {
      setThemeState(stored);
    } else {
      // Default to light mode - simple and consistent
      setThemeState("light");
      localStorage.setItem("snowd-theme", "light");
    }
  }, []);

  // Apply theme class to <html>
  useEffect(() => {
    if (!mounted) return;
    
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    setResolvedTheme(isDark ? "dark" : "light");
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem("snowd-theme", newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
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
