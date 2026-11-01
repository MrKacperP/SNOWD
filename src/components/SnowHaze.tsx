"use client";

import { useEffect, useRef } from "react";

type Flake = { x: number; y: number; r: number; speed: number; drift: number; phase: number; alpha: number };

/**
 * A faint, slow snowfall behind the app on the plain page colour. Sparse and
 * pale on purpose: it should read as weather, never compete with content.
 */
export default function SnowHaze() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let frame = 0;
    let last = 0;

    const spawn = (anywhere: boolean): Flake => {
      const near = Math.random() < 0.25;
      return {
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : -8,
        r: near ? 1.8 + Math.random() * 1.6 : 0.8 + Math.random() * 1.1,
        speed: near ? 14 + Math.random() * 10 : 7 + Math.random() * 7,
        drift: 6 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        alpha: near ? 0.45 + Math.random() * 0.25 : 0.3 + Math.random() * 0.25,
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        ctx.fillStyle = `rgba(150, 176, 204, ${f.alpha})`;
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(f.phase) * f.drift, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.round((width * height) / 11000));
      flakes = Array.from({ length: count }, () => spawn(true));
      draw();
    };

    // Speeds are per second so the fall stays gentle on high-refresh screens.
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.speed * dt;
        f.phase += dt * 0.6;
        if (f.y > height + 8) flakes[i] = spawn(false);
      }
      draw();
      frame = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden && !reduceMotion) frame = requestAnimationFrame(loop);
    };

    resize();
    if (!reduceMotion) frame = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="snow-haze" aria-hidden="true" />;
}
