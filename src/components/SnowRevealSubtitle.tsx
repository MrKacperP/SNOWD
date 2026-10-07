"use client";

import { useEffect, useRef } from "react";
import styles from "./SnowRevealSubtitle.module.css";

const words = "A clear driveway. A little more time. Find someone local to take snow clearing off your hands.".split(" ");
const SNOW_TIME = 3.8;
const CYCLE = 2.65;
const PUSH_START = .15;
const PUSH_END = 1.65;
const RELEASE = 2.02;
const PAD_X = 70;
const PAD_Y = 75;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const noise = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

type Line = { left: number; right: number; top: number; bottom: number };
type Flake = { x: number; y: number; radius: number; line: number; delay: number; duration: number };
const load = Array.from({ length: 14 }, (_, i) => ({
  x: 3 + noise(i + 40) * 15,
  y: -3 - noise(i + 80) * 13,
  radius: 4 + noise(i + 120) * 2.2,
}));

// Cache organic snow shapes so each frame only composites small images.
function makeSnowClump(seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(24, 24);
  const points = Array.from({ length: 12 }, (_, i) => {
    const angle = i / 12 * Math.PI * 2;
    const radius = 16 + noise(seed * 17 + i) * 5;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  ctx.beginPath();
  ctx.moveTo((points[11].x + points[0].x) / 2, (points[11].y + points[0].y) / 2);
  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  });
  ctx.closePath();
  const shade = ctx.createLinearGradient(-8, -18, 10, 20);
  shade.addColorStop(0, "#ffffff");
  shade.addColorStop(.55, "#f7fcff");
  shade.addColorStop(1, "#ccdfeb");
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.clip();
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = i % 3 ? "rgba(255,255,255,.55)" : "rgba(127,165,188,.12)";
    ctx.fillRect(noise(seed + i * 7) * 40 - 20, noise(seed + i * 13) * 40 - 20, .8, .8);
  }
  return canvas;
}

function makeSnowDrift(line: Line, seed: number) {
  const width = line.right - line.left + 12;
  const height = line.bottom - line.top + 12;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * 2);
  canvas.height = Math.ceil(height * 2);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  const count = Math.ceil(width / 9);
  const crest = Array.from({ length: count + 1 }, (_, i) => ({
    x: i / count * width,
    y: 5 + Math.sin(i * .77 + seed) * 2.2 + noise(i + seed * 41) * 3.5,
  }));
  crest[0].y = height - 7;
  crest[count].y = height - 8;
  ctx.beginPath(); ctx.moveTo(0, height - 6);
  crest.forEach((point, i) => {
    const next = crest[Math.min(i + 1, count)];
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  });
  ctx.lineTo(width - 2, height - 5);
  for (let i = count; i >= 0; i--) ctx.lineTo(i / count * width, height - 3 - noise(i * 3 + seed) * 2);
  ctx.closePath();
  const shade = ctx.createLinearGradient(0, 4, 0, height);
  shade.addColorStop(0, "#ffffff");
  shade.addColorStop(.48, "#f7fcff");
  shade.addColorStop(.82, "#e8f2f8");
  shade.addColorStop(1, "#c8deeb");
  ctx.fillStyle = shade;
  ctx.shadowColor = "rgba(73,120,146,.12)";
  ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
  ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.clip();
  // Fine grain and shallow blue pockets give the bank depth without dot outlines.
  for (let i = 0; i < width * 2; i++) {
    const x = noise(seed + i * 11) * width;
    const y = noise(seed + i * 19) * height;
    ctx.fillStyle = i % 4 ? "rgba(255,255,255,.7)" : "rgba(106,151,178,.12)";
    ctx.fillRect(x, y, .45 + noise(i) * .55, .45);
  }
  for (let i = 0; i < count; i++) {
    const x = i * 9;
    ctx.beginPath(); ctx.ellipse(x, height - 6 - noise(i + seed) * 6, 3 + noise(i) * 5, .7, -.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(145,180,200,.10)"; ctx.fill();
  }
  return { canvas, width, height };
}

function shovel(ctx: CanvasRenderingContext2D) {
  // Side view: the cutting edge at (0, 0) is the shared snow-contact point.
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-43, -42); ctx.lineTo(-8, -9);
  ctx.strokeStyle = "#254455"; ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-42, -43); ctx.lineTo(-9, -11);
  ctx.strokeStyle = "#b6cdd8"; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.translate(-46, -47); ctx.rotate(-.75);
  ctx.beginPath(); ctx.roundRect(-11, -10, 22, 17, 5);
  ctx.fillStyle = "#203f50"; ctx.fill();
  ctx.beginPath(); ctx.roundRect(-6, -6, 12, 7, 2);
  ctx.fillStyle = "#cde3ec"; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.moveTo(-14, -15); ctx.quadraticCurveTo(-19, -2, -8, 2);
  ctx.lineTo(15, 1); ctx.lineTo(17, -3); ctx.quadraticCurveTo(-3, 0, -9, -16); ctx.closePath();
  ctx.fillStyle = "#367d9f"; ctx.fill(); ctx.strokeStyle = "#1d4f69"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -12); ctx.quadraticCurveTo(-7, -1, 12, -2);
  ctx.strokeStyle = "#98c9dc"; ctx.lineWidth = 1.5; ctx.stroke();
}

export default function SnowRevealSubtitle() {
  const sceneRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!scene || !canvas || !ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let disposed = false;
    let previousSize = "";

    const start = () => {
      if (disposed) return;
      cancelAnimationFrame(raf);
      const origin = scene.getBoundingClientRect();
      const leftPad = Math.min(PAD_X, Math.max(0, origin.left));
      const rightPad = Math.min(PAD_X, Math.max(0, window.innerWidth - origin.right));
      const width = origin.width + leftPad + rightPad;
      const height = origin.height + PAD_Y + 125;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.left = `-${leftPad}px`;
      ctx.setTransform(ratio, 0, 0, ratio, leftPad * ratio, PAD_Y * ratio);
      if (motion.matches) return;
      const lines: Line[] = [];
      const flakes: Flake[] = [];
      wordRefs.current.forEach((word) => {
        if (!word) return;
        const rect = word.getBoundingClientRect();
        const left = rect.left - origin.left;
        const top = rect.top - origin.top;
        let lineIndex = lines.findIndex((line) => Math.abs(line.top - top) < 3);
        if (lineIndex === -1) {
          lineIndex = lines.length;
          lines.push({ left, right: left + rect.width, top, bottom: top + rect.height - 1 });
        } else lines[lineIndex].right = left + rect.width;
      });
      lines.forEach((line, index) => {
        const count = Math.ceil((line.right - line.left) / 7);
        for (let i = 0; i < count; i++) {
          const seed = index * 137 + i;
          flakes.push({
            x: line.left + noise(seed + 1) * (line.right - line.left),
            y: line.top + noise(seed + 2) * (line.bottom - line.top),
            radius: 2.7 + noise(seed + 3) * 2.7,
            line: index, delay: noise(seed + 4) * 1.9, duration: 1.3 + noise(seed + 5) * .6,
          });
        }
      });
      const drifts = lines.map((line, index) => makeSnowDrift(line, index + 1));
      const clumps = Array.from({ length: 8 }, (_, index) => makeSnowClump(index + 1));
      const snow = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, spin = 0) => {
        const sprite = clumps[Math.floor(Math.abs(radius * 17)) % clumps.length];
        context.save(); context.translate(x, y); context.rotate(spin);
        context.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
        context.restore();
      };
      const started = performance.now();
      const draw = (now: number) => {
        const time = (now - started) / 1000;
        ctx.clearRect(-leftPad, -PAD_Y, width, height);
        lines.forEach((line, index) => {
          const local = time - SNOW_TIME - index * CYCLE;
          const progress = ease(clamp((local - PUSH_START) / (PUSH_END - PUSH_START)));
          const edge = line.left - 12 + (line.right - line.left + 18) * progress;
          const drift = drifts[index];
          const buildup = ease(clamp((time - .8) / 2.7));
          if (buildup === 0 || local >= PUSH_END) return;
          ctx.save();
          if (local > PUSH_START) {
            ctx.beginPath(); ctx.rect(edge + 6, line.top - 10, line.right - edge + 12, drift.height + 20); ctx.clip();
          }
          const h = drift.height * buildup;
          ctx.drawImage(drift.canvas, line.left - 6, line.bottom + 6 - h, drift.width, h);
          ctx.restore();
        });
        for (const flake of flakes) {
          const falling = (time - flake.delay) / flake.duration;
          if (falling <= 0 || falling >= 1) continue;
          const drift = Math.sin(falling * 4 + flake.x) * 8 * (1 - falling);
          snow(ctx, flake.x + drift, flake.y - (1 - falling) * 75, flake.radius, falling * .8);
        }
        ctx.globalAlpha = 1;

        lines.forEach((line, index) => {
          const age = time - SNOW_TIME - index * CYCLE - RELEASE;
          if (age < 0 || age > 1.1) return;
          // Launch from exactly the carried pile's final position, with gravity.
          const angle = -.58;
          load.forEach((piece, i) => {
            const x = line.right + 8 + piece.x * Math.cos(angle) - piece.y * Math.sin(angle);
            const y = line.bottom - 24 + piece.x * Math.sin(angle) + piece.y * Math.cos(angle);
            const vx = -65 - noise(i + 210) * 85;
            const vy = -105 - noise(i + 250) * 100;
            const py = y + vy * age + 410 * age * age;
            if (py > origin.height + 85) return;
            ctx.globalAlpha = 1;
            snow(ctx, x + vx * age, py, piece.radius, age * (i % 2 ? 3 : -2));
          });
        });
        ctx.globalAlpha = 1;

        const active = Math.floor((time - SNOW_TIME) / CYCLE);
        if (active >= 0 && active < lines.length) {
          const line = lines[active];
          const local = time - SNOW_TIME - active * CYCLE;
          const progress = ease(clamp((local - PUSH_START) / (PUSH_END - PUSH_START)));
          let x = line.left - 12 + (line.right - line.left + 18) * progress;
          let y = line.bottom;
          let angle = 0;
          if (local < PUSH_START) y -= (1 - local / PUSH_START) * 8;
          if (local > PUSH_END && local <= RELEASE) {
            const lift = ease((local - PUSH_END) / (RELEASE - PUSH_END));
            x += 2 * lift; y -= 24 * lift; angle = -.58 * lift;
          } else if (local > RELEASE) {
            const returnProgress = ease((local - RELEASE) / (CYCLE - RELEASE));
            const next = lines[active + 1];
            const targetX = next ? next.left - 12 : line.right + 35;
            const targetY = next ? next.bottom - 8 : line.bottom - 42;
            x = line.right + 8 + (targetX - line.right - 8) * returnProgress;
            y = line.bottom - 24 + (targetY - line.bottom + 24) * returnProgress - Math.sin(returnProgress * Math.PI) * 18;
            angle = -.58 + Math.sin(returnProgress * Math.PI) * .85 + returnProgress * .58;
            if (!next) ctx.globalAlpha = 1 - returnProgress;
          }
          // Contact shadow stays beneath the edge during the grounded push.
          if (local <= PUSH_END) {
            ctx.fillStyle = "rgba(58, 102, 123, .18)";
            ctx.beginPath(); ctx.ellipse(x + 5, line.bottom + 3, 15, 2, 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
          shovel(ctx);
          if (local <= RELEASE && progress > 0) {
            const size = .25 + .75 * Math.sqrt(progress);
            ctx.save(); ctx.scale(size, size);
            load.slice(0, Math.ceil(load.length * progress)).forEach((piece) => snow(ctx, piece.x, piece.y, piece.radius));
            ctx.restore();
          }
          // The metal cutting lip remains visible underneath the gathered snow.
          ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(17, 1);
          ctx.strokeStyle = "#a7c9d6"; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore(); ctx.globalAlpha = 1;
        }
        if (time < SNOW_TIME + lines.length * CYCLE + 1) raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => {
      const rect = scene.getBoundingClientRect();
      const size = `${rect.width}:${rect.height}`;
      if (size !== previousSize) { previousSize = size; start(); }
    });
    observer.observe(scene);
    document.fonts.ready.then(start);
    motion.addEventListener("change", start);
    return () => { disposed = true; cancelAnimationFrame(raf); observer.disconnect(); motion.removeEventListener("change", start); };
  }, []);

  return (
    <span className={styles.scene} ref={sceneRef}>
      {words.map((word, index) => (
        <span key={index} ref={(node) => { wordRefs.current[index] = node; }}>{word}{index < words.length - 1 ? " " : ""}</span>
      ))}
      <canvas ref={canvasRef} className={styles.animation} aria-hidden="true" />
    </span>
  );
}
