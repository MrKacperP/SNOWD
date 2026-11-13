import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { useAppTheme } from "~/lib/appearance";
import { colors } from "~/lib/theme";
import { Icon } from "./ui";

const BARS = 40;
/** Live recording shows this many of the latest samples, scrolling in from the right. */
const LIVE_BARS = 34;
/** Loudness (0–1) above which a bar counts as speech and turns blue. */
export const SPEECH = 0.36;
const GREY = "#c3ccd8";
const SPEEDS = [1, 1.5, 2] as const;

export const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Squeezes any number of loudness samples (0–1) into `count` bars for drawing. */
export function toBars(samples: number[], count = BARS) {
  if (!samples.length) return Array.from({ length: count }, () => 0.06);
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i / count) * samples.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) / count) * samples.length));
    const slice = samples.slice(from, to);
    return Math.max(0.06, Math.min(1, slice.reduce((a, b) => Math.max(a, b), 0)));
  });
}

/** One bar: grows to its level with a spring; blue when it's speech, grey when it's quiet. */
function Bar({ level, height, speech, dim, accent }: { level: number; height: number; speech: boolean; dim: boolean; accent: string }) {
  const h = useSharedValue(3);
  useEffect(() => {
    h.value = withSpring(Math.max(3, level * height), { damping: 14, stiffness: 220, mass: 0.6 });
  }, [level, height, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[styles.bar, style, { backgroundColor: speech ? accent : GREY, opacity: dim ? 0.4 : 1 }]} />;
}

/**
 * Voice levels drawn as bars: grey, with the parts where someone is speaking in blue. The same bars
 * are used while recording, when reviewing and in the chat, so a note looks the way it sounded.
 * With `progress`, the part not yet played is faded; drag or tap along it to jump anywhere.
 */
export function Waveform({ peaks, progress, onSeek, height = 30, count = BARS }: { peaks: number[]; progress?: number; onSeek?: (fraction: number) => void; height?: number; count?: number }) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const bars = toBars(peaks, count);
  const seek = (x: number) => width && onSeek?.(Math.max(0, Math.min(1, x / width)));
  const pan = usePanGesture({
    enabled: !!onSeek,
    minDistance: 0,
    runOnJS: true,
    onActivate: (e) => seek((e as unknown as { x: number }).x),
    onUpdate: (e) => seek((e as unknown as { x: number }).x),
  });
  return (
    <GestureDetector gesture={pan}>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={[styles.wave, { height }]} hitSlop={{ top: 10, bottom: 10 }}>
        {bars.map((v, i) => (
          <Bar key={i} level={v} height={height} speech={v >= SPEECH} dim={progress !== undefined && (i + 0.5) / bars.length > progress} accent={theme.accent} />
        ))}
      </View>
    </GestureDetector>
  );
}

/** The bars while you're recording: the newest sample enters on the right and the rest scroll left. */
export function LiveWaveform({ samples, height = 26 }: { samples: number[]; height?: number }) {
  const theme = useAppTheme();
  const latest = samples.slice(-LIVE_BARS);
  const first = samples.length - latest.length;
  return (
    <View style={[styles.wave, { height, justifyContent: "flex-end" }]}>
      {Array.from({ length: LIVE_BARS - latest.length }, (_, i) => (
        <View key={`pad${i}`} style={[styles.bar, { height: 3, backgroundColor: GREY, opacity: 0.5 }]} />
      ))}
      {latest.map((v, i) => (
        // Keyed by the sample's position in the whole recording, so each bar keeps its spring as it scrolls.
        <Bar key={first + i} level={Math.max(0.06, v)} height={height} speech={v >= SPEECH} dim={false} accent={theme.accent} />
      ))}
    </View>
  );
}

/**
 * A voice note you can play, scrub through and speed up (tap 1× → 1.5× → 2×), like WhatsApp.
 * Used in chat bubbles and for reviewing a recording before it's sent.
 */
export function VoicePlayer({ uri, durationMs, peaks = [] }: { uri: string; durationMs?: number; peaks?: number[] }) {
  const theme = useAppTheme();
  const player = useAudioPlayer(uri, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const total = (status.duration || 0) * 1000 || durationMs || 0;
  const position = (status.currentTime || 0) * 1000;
  const started = status.playing || position > 0;
  const progress = total ? position / total : 0;

  // Back to the start once it finishes, ready to play again.
  useEffect(() => {
    if (status.didJustFinish) void player.seekTo(0);
  }, [status.didJustFinish, player]);

  // A soft pulse on the play button while it plays.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = status.playing ? withRepeat(withSequence(withTiming(1.08, { duration: 500 }), withTiming(1, { duration: 500 })), -1) : withTiming(1);
  }, [status.playing, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const toggle = () => {
    void Haptics.selectionAsync();
    if (status.playing) player.pause();
    else {
      void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
      player.play();
    }
  };
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    player.setPlaybackRate(next);
    void Haptics.selectionAsync();
  };

  return (
    <View style={styles.player}>
      <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? "Pause voice message" : "Play voice message"} hitSlop={8} onPress={toggle}>
        <Animated.View style={[styles.play, { backgroundColor: theme.accent }, pulseStyle]}>
          <Icon name={status.playing ? "pause.fill" : "play.fill"} size={15} color="#fff" />
        </Animated.View>
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        <Waveform peaks={peaks} progress={started ? progress : 1} onSeek={total ? (f) => void player.seekTo((f * total) / 1000) : undefined} />
        <Text style={styles.time}>{clock(started ? position : total)}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Playback speed ${speed}x. Change`} hitSlop={8} onPress={cycleSpeed} style={styles.speed}>
        <Text style={{ fontSize: 12, fontWeight: "800", color: speed === 1 ? colors.muted : theme.accent }}>{speed}×</Text>
      </Pressable>
    </View>
  );
}

export type VoiceNote = { uri: string; durationMs: number; peaks: number[] };

/**
 * Hold-to-record: `start` on press-in, `stop` on release. Collects loudness while recording so the
 * note can be drawn as a waveform. Notes shorter than half a second are dropped as accidental taps.
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 90);
  const samples = useRef<number[]>([]);
  const [recording, setRecording] = useState(false);
  // Mirrors `recording` without waiting for a re-render, so a quick release always stops it.
  const active = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!recording || typeof state.metering !== "number") return;
    // Metering is in decibels (about −60 quiet to 0 loud); turn it into 0–1.
    samples.current.push(Math.max(0, Math.min(1, (state.metering + 55) / 55)));
  }, [state.metering, state.durationMillis, recording]);

  const start = async () => {
    setError("");
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Allow microphone access in Settings to send voice messages.");
      return false;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    samples.current = [];
    await recorder.prepareToRecordAsync();
    recorder.record();
    active.current = true;
    setRecording(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    return true;
  };

  const stop = async (): Promise<VoiceNote | null> => {
    if (!active.current) return null;
    active.current = false;
    const durationMs = recorder.getStatus().durationMillis || state.durationMillis;
    await recorder.stop();
    setRecording(false);
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!recorder.uri || durationMs < 500) return null;
    return { uri: recorder.uri, durationMs, peaks: toBars(samples.current, BARS).map((v) => Math.round(v * 100) / 100) };
  };

  // The current loudness, for the pulsing ring around the mic.
  const level = recording && typeof state.metering === "number" ? Math.max(0, Math.min(1, (state.metering + 55) / 55)) : 0;
  return { recording, durationMs: state.durationMillis, live: samples.current, level, start, stop, error };
}

const styles = StyleSheet.create({
  wave: { flexDirection: "row", alignItems: "center", gap: 2 },
  bar: { flex: 1, borderRadius: 2 },
  player: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 230 },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  time: { fontSize: 12, color: colors.muted, fontVariant: ["tabular-nums"] },
  speed: { minWidth: 38, height: 26, paddingHorizontal: 6, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
});
