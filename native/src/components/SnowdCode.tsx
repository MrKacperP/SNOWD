import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, interpolate, interpolateColor, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { encode, NOTCH_DEG, ORANGE, ORANGE_R, ORANGE_WIDTH, RING_WIDTH, RINGS } from "~/lib/penguinCode";
import { PENGUIN } from "./brand";

// The QR maths from `qrcode` (already installed with react-native-qrcode-svg); it ships no types.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QR = require("qrcode") as { create: (v: string, o: { errorCorrectionLevel: string }) => { modules: { size: number; data: ArrayLike<number> } } };

/** The penguin's charcoal: the arcs and dots rest on this colour. */
const INK = "#262a35";
const AnimatedG = Animated.createAnimatedComponent(G);

/** A point `r` from the centre, `deg` clockwise from straight up (matches the scanner in penguinCode). */
const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.sin(a)).toFixed(4)} ${(-r * Math.cos(a)).toFixed(4)}`;
};
const arc = (r: number, from: number, to: number) => `M${pt(r, from)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${pt(r, to)}`;

/** The penguin bobbing and swaying on the spot. */
function BobbingPenguin({ size, bob }: { size: number; bob: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(bob.value, [0, 1], [size * 0.04, -size * 0.09]) }, { rotate: `${interpolate(bob.value, [0, 1], [-10, 10])}deg` }],
  }));
  return (
    <View pointerEvents="none" style={{ position: "absolute" }}>
      <Animated.View style={style}>
        <Image source={PENGUIN} style={{ width: size, height: size * 1.07 }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

/** Dark, vivid colours the arcs sweep through. All stay dark (and none is orange), so the code always reads. */
const SWEEP_BLUE = "#2350ff";
const SWEEP_VIOLET = "#6d28d9";
const SECTORS = 8;

/**
 * One slice of one ring. A spiral of colour sweeps round and out through the slices, the arcs swell
 * as it passes, and on first show the slices pop in one after another.
 */
function Slice({ d, ring, sector, t, appear, tint }: { d: string; ring: number; sector: number; t: SharedValue<number>; appear: SharedValue<number>; tint: string }) {
  const props = useAnimatedProps(() => {
    const phase = (t.value + 2 - sector / SECTORS - ring * 0.14) % 1;
    const wave = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    const delay = (sector / SECTORS) * 0.5 + ring * 0.1;
    const shown = Math.min(1, Math.max(0, (appear.value - delay) / 0.35));
    return {
      stroke: interpolateColor(phase, [0, 0.25, 0.5, 0.75, 1], [INK, tint, SWEEP_BLUE, SWEEP_VIOLET, INK]),
      strokeWidth: RING_WIDTH * (0.82 + 0.18 * wave) * shown,
      opacity: shown,
    };
  });
  return <AnimatedG animatedProps={props}><Path d={d} fill="none" strokeLinecap="round" /></AnimatedG>;
}

const SPECKS = 30;

/** A soft ring that swells out from the code and fades, like a ripple on water. */
function Ripple({ k, size, t }: { k: number; size: number; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = (t.value * 5 + k / 3) % 1;
    return { opacity: 0.45 * (1 - p), transform: [{ scale: 1 + p * 0.32 }] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: "#fff" }, style]} />;
}

/** One speck of snow orbiting the code, drifting in and out and twinkling. */
function Speck({ i, size, orbit }: { i: number; size: number; orbit: SharedValue<number> }) {
  const seed = (i * 9301 + 49297) % 233280 / 233280;
  const speed = i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 2;
  const start = (i / SPECKS) * Math.PI * 2;
  const dot = 3 + seed * 4;
  const style = useAnimatedStyle(() => {
    const a = start + orbit.value * Math.PI * 2 * speed;
    const r = (size / 2) * (1.07 + 0.1 * (0.5 + 0.5 * Math.sin(orbit.value * Math.PI * 4 + i)));
    return {
      opacity: 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(orbit.value * Math.PI * 6 + i * 1.7)),
      transform: [{ translateX: r * Math.sin(a) }, { translateY: -r * Math.cos(a) }],
    };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: dot, height: dot, borderRadius: dot / 2, backgroundColor: "#fff" }, style]} />;
}

/**
 * The SNOWD penguin code: the penguin in the middle with rings of arcs that spell your id, framed
 * in penguin orange, with snow orbiting round it. It turns, sweeps with colour, the arcs swell and
 * the penguin bobs. SNOWD's Scan reads it at any point in the animation.
 */
function PenguinCode({ bits, size, tint, t, bob, spin, orbit, appear }: { bits: number[]; size: number; tint: string; t: SharedValue<number>; bob: SharedValue<number>; spin: SharedValue<number>; orbit: SharedValue<number>; appear: SharedValue<number> }) {
  const slices = useMemo(() => {
    const out: { d: string; ring: number; sector: number }[] = [];
    let i = 0;
    RINGS.forEach(({ r, n }, ring) => {
      const on = bits.slice(i, (i += n));
      const seg = 360 / n;
      const paths = Array.from({ length: SECTORS }, () => "");
      // Runs of 1s become one arc with round ends; a lone short one is a dot.
      const inset = ((RING_WIDTH / 2 / r) * 180) / Math.PI + 0.9;
      for (let s = 0; s < n; ) {
        if (!on[s]) { s++; continue; }
        let e = s;
        while (e + 1 < n && on[e + 1]) e++;
        const from = s * seg + inset, to = (e + 1) * seg - inset;
        const mid = ((s + e + 1) * seg) / 2;
        paths[Math.min(SECTORS - 1, Math.floor((mid / 360) * SECTORS))] += to > from ? arc(r, from, to) : `M${pt(r, mid)}l0 0`;
        s = e + 1;
      }
      paths.forEach((d, sector) => d && out.push({ d, ring, sector }));
    });
    return out;
  }, [bits]);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const half = NOTCH_DEG / 2 + ((ORANGE_WIDTH / 2 / ORANGE_R) * 180) / Math.PI;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {[0, 1, 2].map((k) => <Ripple key={k} k={k} size={size} t={orbit} />)}
      {Array.from({ length: SPECKS }, (_, i) => <Speck key={i} i={i} size={size} orbit={orbit} />)}
      <Animated.View style={turn}>
        <Svg width={size} height={size} viewBox="-1.01 -1.01 2.02 2.02">
          <Circle r={1} fill="#fff" />
          {slices.map((x) => <Slice key={`${x.ring}-${x.sector}`} {...x} t={t} appear={appear} tint={tint} />)}
          <Path d={arc(ORANGE_R, half, 360 - half)} fill="none" stroke={ORANGE} strokeWidth={ORANGE_WIDTH} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <BobbingPenguin size={size * 0.31} bob={bob} />
    </View>
  );
}

/** A plain, scannable QR (round dots, round corner eyes, the penguin in the middle) for any phone camera. */
function PlainQR({ value, size, bob }: { value: string; size: number; bob: SharedValue<number> }) {
  const { n, d, hole } = useMemo(() => {
    const { size: n, data } = QR.create(value, { errorCorrectionLevel: "H" }).modules;
    const hole = Math.round(n * 0.26) | 1;
    const lo = (n - hole) / 2;
    const inEye = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    const r = 0.42;
    let d = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (!data[y * n + x] || inEye(x, y) || (x >= lo - 0.5 && x < lo + hole && y >= lo - 0.5 && y < lo + hole)) continue;
        d += `M${x + 0.5 - r} ${y + 0.5}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
      }
    return { n, d, hole };
  }, [value]);
  const pad = 2;
  const unit = size / (n + pad * 2);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`${-pad} ${-pad} ${n + pad * 2} ${n + pad * 2}`}>
        <Rect x={-pad} y={-pad} width={n + pad * 2} height={n + pad * 2} rx={pad + 3} fill="#fff" />
        <Path d={d} fill={INK} />
        {([[0, 0], [n - 7, 0], [0, n - 7]] as const).map(([x, y]) => (
          <G key={`${x}-${y}`}>
            <Rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={2.2} fill="none" stroke={INK} strokeWidth={1} />
            <Circle cx={x + 3.5} cy={y + 3.5} r={1.6} fill={INK} />
          </G>
        ))}
      </Svg>
      <BobbingPenguin size={hole * unit * 0.95} bob={bob} />
    </View>
  );
}

/**
 * Your SNOWD code. Shows the moving penguin code; tap it to flip to a plain QR that any phone
 * camera reads (for people who don't have SNOWD yet), and tap again to flip back.
 */
export function SnowdCode({ uid, link, size = 260, tint = "#0b1a6b" }: { uid: string; link: string; size?: number; tint?: string }) {
  const bits = useMemo(() => encode(uid), [uid]);
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  const bob = useSharedValue(0);
  const spin = useSharedValue(0);
  const flip = useSharedValue(0);
  const orbit = useSharedValue(0);
  const appear = useSharedValue(reduce ? 1.6 : 0);
  const [showQR, setShowQR] = useState(false);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
    bob.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
    spin.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false);
    orbit.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear }), -1, false);
    appear.value = withTiming(1.6, { duration: 1300, easing: Easing.out(Easing.cubic) });
  }, [reduce, t, bob, spin, orbit, appear]);
  useEffect(() => {
    flip.value = withTiming(showQR ? 1 : 0, { duration: reduce ? 0 : 450, easing: Easing.inOut(Easing.cubic) });
  }, [showQR, reduce, flip]);

  const front = useAnimatedStyle(() => ({ opacity: flip.value < 0.5 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${flip.value * 180}deg` }] }));
  const back = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${flip.value * 180 - 180}deg` }] }));
  // Breathes and tilts gently in 3D, like it's floating.
  const breathe = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${6 * Math.sin(orbit.value * Math.PI * 6)}deg` },
      { rotateY: `${6 * Math.cos(orbit.value * Math.PI * 4)}deg` },
      { scale: interpolate(bob.value, [0, 1], [0.97, 1.03]) },
    ],
  }));

  // No penguin code for this id: just the QR.
  if (!bits) return <PlainQR value={link} size={size} bob={bob} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={showQR ? "Your SNOWD QR code" : "Your SNOWD penguin code"}
      accessibilityHint={showQR ? "Shows your penguin code" : "Shows a QR code any phone camera can scan"}
      onPress={() => { void Haptics.selectionAsync(); setShowQR((v) => !v); }}
    >
      <Animated.View style={[{ width: size, height: size }, breathe]}>
        <Animated.View style={[{ position: "absolute" }, front]} pointerEvents="none">
          <PenguinCode bits={bits} size={size} tint={tint} t={t} bob={bob} spin={spin} orbit={orbit} appear={appear} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute" }, back]} pointerEvents="none">
          <PlainQR value={link} size={size} bob={bob} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
