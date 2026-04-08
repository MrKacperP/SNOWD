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

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("snowd-theme", "light");
    setThemeState("light");
    setResolvedTheme("light");
  }, []);

  const setTheme = (newTheme: ThemePreference) => {
    void newTheme;
    setThemeState("light");
    setResolvedTheme("light");
    document.documentElement.classList.remove("dark");
    localStorage.setItem("snowd-theme", "light");
  };

  const toggleTheme = () => {
    setTheme("light");
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
