"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("snowd-theme") === "dark" ? "dark" : "light";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(theme);

  const applyTheme = useCallback((newTheme: ThemePreference) => {
    const root = document.documentElement;
    root.classList.toggle("dark", newTheme === "dark");
    root.style.colorScheme = newTheme;
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    setResolvedTheme(newTheme);
    localStorage.setItem("snowd-theme", newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
