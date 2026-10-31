"use client";

import { useEffect } from "react";

// Fades in every [data-reveal] element on the page the first time it scrolls into view.
export default function ScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach(node => node.dataset.revealed = "true");
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).dataset.revealed = "true";
      observer.unobserve(entry.target);
    }), { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    nodes.forEach(node => observer.observe(node));
    document.documentElement.dataset.revealReady = "true";
    return () => observer.disconnect();
  }, []);
  return null;
}
