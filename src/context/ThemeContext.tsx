"use client";
import React, { useEffect } from "react";
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "only light";
    try { localStorage.removeItem("snowd-theme"); } catch { /* Storage is optional. */ }
  }, []);
  return <>{children}</>;
}
