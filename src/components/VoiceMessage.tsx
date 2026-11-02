"use client";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./voice-message.module.css";

const BARS = 44;
const SPEEDS = [1, 1.5, 2];

// Stable placeholder shape until the real waveform has been decoded.
function placeholderPeaks(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: BARS }, (_, i) => {
    h = (h * 1103515245 + 12345) | 0;
    return 0.25 + ((Math.abs(h) % 100) / 100) * 0.55 * (0.7 + 0.3 * Math.sin(i / 3));
  });
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Voice note with a waveform that doubles as a seekable timeline and a tap-to-cycle speed button. */
export default function VoiceMessage({ src, id, durationMs, own, peaks: savedPeaks }: { src: string; id: string; durationMs?: number; own: boolean; peaks?: number[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState((durationMs || 0) / 1000);
  const [speed, setSpeed] = useState(1);
  const [peaks, setPeaks] = useState<number[]>(() => (savedPeaks?.length ? savedPeaks : placeholderPeaks(id)));
  const fallback = useMemo(() => placeholderPeaks(id), [id]);

  useEffect(() => {
    if (savedPeaks?.length) return;
    let cancelled = false;
    (async () => {
      try {
        const buffer = await (await fetch(src)).arrayBuffer();
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const decoded = await ctx.decodeAudioData(buffer);
        void ctx.close();
        const data = decoded.getChannelData(0);
        const size = Math.floor(data.length / BARS);
        const raw = Array.from({ length: BARS }, (_, i) => {
          let sum = 0;
          for (let j = 0; j < size; j += 1) sum += Math.abs(data[i * size + j]);
          return sum / (size || 1);
        });
        const max = Math.max(...raw, 0.0001);
        if (!cancelled) {
          setPeaks(raw.map((v) => Math.max(0.12, v / max)));
          if (!durationMs) setDuration(decoded.duration);
        }
      } catch {
        if (!cancelled) setPeaks(fallback);
      }
    })();
    return () => { cancelled = true; };
  }, [src, durationMs, fallback, savedPeaks]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play(); else audio.pause();
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seekTo = (clientX: number) => {
    const audio = audioRef.current;
    const box = waveRef.current?.getBoundingClientRect();
    if (!audio || !box || !duration) return;
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    audio.currentTime = ratio * duration;
    setProgress(ratio);
  };

  return (
    <div className={styles.player} data-own={own}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setDuration(d); }}
        onTimeUpdate={(e) => { const a = e.currentTarget; if (a.duration && Number.isFinite(a.duration)) setProgress(a.currentTime / a.duration); }}
      />
      <button type="button" className={styles.play} onClick={toggle} aria-label={playing ? "Pause voice message" : "Play voice message"}>
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <div
        ref={waveRef}
        className={styles.wave}
        role="slider"
        tabIndex={0}
        aria-label="Voice message timeline"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekTo(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons) seekTo(e.clientX); }}
        onKeyDown={(e) => {
          const audio = audioRef.current;
          if (!audio) return;
          if (e.key === "ArrowRight") audio.currentTime += 5;
          if (e.key === "ArrowLeft") audio.currentTime -= 5;
        }}
      >
        {peaks.map((peak, i) => (
          <span key={i} data-played={(i + 0.5) / BARS <= progress} style={{ height: `${Math.round(peak * 100)}%` }} />
        ))}
      </div>
      <div className={styles.side}>
        <button type="button" className={styles.speed} onClick={cycleSpeed} aria-label={`Playback speed ${speed}x`}>{speed}x</button>
        <span className={styles.time}>{clock(playing || progress > 0 ? progress * duration : duration)}</span>
      </div>
    </div>
  );
}
