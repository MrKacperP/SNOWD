"use client";

import { useEffect, useRef } from "react";

const BG = "5, 11, 22";

// Wind field seen from above: a steady drift with layered eddies, so flakes
// bunch into seams and split apart like currents meeting in open water.
function windAngle(x: number, y: number, t: number) {
  return 0.35
    + 0.9 * Math.sin(x * 0.0021 + t * 0.21) * Math.cos(y * 0.0034 - t * 0.17)
    + 0.55 * Math.sin((x + y) * 0.0013 - t * 0.11)
    + 0.3 * Math.cos(x * 0.0058 - y * 0.0041 + t * 0.29);
}

// Far flakes are small, dim and slow; near ones are larger, brighter and
// softer, which gives the night snowfall its depth.
const LAYERS = [
  { share: 0.55, size: [0.6, 1.2], speed: [0.35, 0.7], alpha: [0.25, 0.5] },
  { share: 0.33, size: [1.2, 2.2], speed: [0.8, 1.4], alpha: [0.5, 0.8] },
  { share: 0.12, size: [2.4, 4.2], speed: [1.6, 2.6], alpha: [0.7, 0.95] },
];

type Flake = { x: number; y: number; speed: number; size: number; alpha: number; wobble: number };

const between = ([min, max]: number[]) => min + Math.random() * (max - min);

export default function SnowStorm({ className = "auth-snowstorm" }: { className?: string }) {
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
    let t = Math.random() * 100;

    const spawn = (layer: (typeof LAYERS)[number], anywhere: boolean): Flake => ({
      x: anywhere ? Math.random() * width : -10 - Math.random() * 40,
      y: anywhere ? Math.random() * height : Math.random() * height,
      speed: between(layer.speed),
      size: between(layer.size),
      alpha: between(layer.alpha),
      wobble: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = `rgb(${BG})`;
      ctx.fillRect(0, 0, width, height);
      const count = Math.min(1400, Math.round((width * height) / 1300));
      flakes = LAYERS.flatMap(layer => Array.from({ length: Math.round(count * layer.share) }, () => spawn(layer, true)));
    };

    const layerOf = (f: Flake) => LAYERS.find(layer => f.size <= layer.size[1]) ?? LAYERS[LAYERS.length - 1];

    const step = () => {
      t += 0.01;
      // A strong fade keeps only a short blur behind each flake, enough to
      // show the wind without turning the snow into streaks.
      ctx.fillStyle = `rgba(${BG}, 0.42)`;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        const a = windAngle(f.x, f.y, t);
        f.wobble += 0.03;
        f.x += Math.cos(a) * f.speed + Math.sin(f.wobble) * 0.25;
        f.y += Math.sin(a) * f.speed + 0.25 * f.speed;

        if (f.size > 2.2) {
          ctx.fillStyle = `rgba(220, 232, 255, ${f.alpha * 0.18})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(244, 248, 255, ${f.alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();

        if (f.x > width + 20 || f.y > height + 20 || f.x < -60 || f.y < -60) {
          const fresh = spawn(layerOf(f), false);
          // Re-enter from the top edge as often as the left so the sky stays even.
          if (Math.random() < 0.5) { fresh.x = Math.random() * width; fresh.y = -10 - Math.random() * 40; }
          flakes[i] = fresh;
        }
      }
    };

    const loop = () => {
      step();
      frame = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduceMotion) frame = requestAnimationFrame(loop);
    };

    resize();
    if (reduceMotion) {
      for (let i = 0; i < 20; i++) step();
    } else {
      frame = requestAnimationFrame(loop);
    }
    // Observing the canvas lets the storm fill the viewport or any container it sits in.
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
