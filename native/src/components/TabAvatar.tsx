import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useEffect, useRef, useState } from "react";
import { View, type ImageSourcePropType } from "react-native";
import Svg, { Circle, ClipPath, Defs, Image as SvgImage } from "react-native-svg";

/** The tab bar icon size, in points, and the scale it's drawn at so it stays sharp. */
const PT = 28;
const SCALE = 3;
const PX = PT * SCALE;
/** The ring around the photo when the Profile tab is selected. */
const RING = 2.5 * SCALE;

export type TabAvatarIcon = { default: ImageSourcePropType; selected: ImageSourcePropType };

// Made once per photo URL for the whole session, so switching tabs never redraws it.
const cache = new Map<string, TabAvatarIcon>();

const source = (base64: string): ImageSourcePropType => ({ uri: `data:image/png;base64,${base64}`, width: PT, height: PT, scale: SCALE });

/**
 * Turns a profile photo into round tab bar icons: the plain photo, and the photo inside a ring in
 * `ring`'s colour for when the tab is selected. Returns null until they're ready (or if the photo
 * can't be loaded), so the tab keeps its person symbol meanwhile. Render `renderer` somewhere
 * on screen; it draws off to the side, invisibly.
 */
export function useTabAvatar(url: string | undefined, ring: string) {
  const key = url ? `${url}|${ring}` : "";
  const [icon, setIcon] = useState<TabAvatarIcon | null>(() => (key ? cache.get(key) || null : null));
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    setIcon(key ? cache.get(key) || null : null);
    setPhoto("");
    if (!url || cache.has(key)) return;
    let live = true;
    // A small, centred square of the photo, so drawing it into a circle is quick.
    manipulateAsync(url, [], {})
      .then(({ width, height }) => {
        const side = Math.min(width, height);
        return manipulateAsync(url, [{ crop: { originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side } }, { resize: { width: PX, height: PX } }], { format: SaveFormat.PNG, base64: true });
      })
      .then((img) => live && img.base64 && setPhoto(`data:image/png;base64,${img.base64}`))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url, key]);

  const renderer = photo && !icon ? <Renderer photo={photo} ring={ring} onDone={(made) => { cache.set(key, made); setIcon(made); }} /> : null;
  return { icon, renderer };
}

/** Draws the two round icons with react-native-svg and exports them as PNGs. */
function Renderer({ photo, ring, onDone }: { photo: string; ring: string; onDone: (icon: TabAvatarIcon) => void }) {
  const plain = useRef<Svg>(null);
  const ringed = useRef<Svg>(null);
  const loaded = useRef(0);
  const done = useRef(false);

  const onLoad = () => {
    loaded.current += 1;
    if (loaded.current < 2 || done.current) return;
    done.current = true;
    // One frame later, so both photos have been painted before they're exported.
    requestAnimationFrame(() => {
      plain.current?.toDataURL((a) => {
        ringed.current?.toDataURL((b) => onDone({ default: source(a), selected: source(b) }), { width: PX, height: PX });
      }, { width: PX, height: PX });
    });
  };

  const inner = PX / 2 - RING * 1.6;
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ position: "absolute", left: -1000, top: 0, opacity: 0 }}>
      <Svg ref={plain} width={PX} height={PX}>
        <Defs>
          <ClipPath id="full">
            <Circle cx={PX / 2} cy={PX / 2} r={PX / 2} />
          </ClipPath>
        </Defs>
        <SvgImage href={photo} width={PX} height={PX} clipPath="url(#full)" preserveAspectRatio="xMidYMid slice" onLoad={onLoad} />
      </Svg>
      <Svg ref={ringed} width={PX} height={PX}>
        <Defs>
          <ClipPath id="inner">
            <Circle cx={PX / 2} cy={PX / 2} r={inner} />
          </ClipPath>
        </Defs>
        <Circle cx={PX / 2} cy={PX / 2} r={PX / 2 - RING / 2} stroke={ring} strokeWidth={RING} fill="none" />
        <SvgImage href={photo} x={PX / 2 - inner} y={PX / 2 - inner} width={inner * 2} height={inner * 2} clipPath="url(#inner)" preserveAspectRatio="xMidYMid slice" onLoad={onLoad} />
      </Svg>
    </View>
  );
}
