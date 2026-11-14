import { StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import Svg, { G, Path } from "react-native-svg";
import { useAppTheme } from "~/lib/appearance";

/**
 * SNOWD's map look: Apple's muted map with no shops, transit or 3D buildings, always light, so
 * the job pin and service area are the only things that stand out.
 */
export const SNOWD_MAP = {
  mapType: "mutedStandard" as const,
  showsPointsOfInterests: false,
  showsBuildings: false,
  showsTraffic: false,
  showsIndoors: false,
  showsCompass: false,
  showsScale: false,
  userInterfaceStyle: "light" as const,
};

/** A snow shovel (D-grip, shaft, scoop), drawn so it reads at pin size. */
export function ShovelIcon({ size = 18, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform="rotate(40 12 12)" fill={color}>
        <Path fillRule="evenodd" d="M9.2 1.2h5.6a1.2 1.2 0 0 1 1.2 1.2v2.4a1.2 1.2 0 0 1-1.2 1.2h-1.9v7.4h-1.8V6h-1.9A1.2 1.2 0 0 1 8 4.8V2.4a1.2 1.2 0 0 1 1.2-1.2Zm.6 1.6v1.6h4.4V2.8H9.8Z" />
        <Path d="M10.4 12.6h3.2l3.1 2.2v5.4a1.8 1.8 0 0 1-1.8 1.8H9.1a1.8 1.8 0 0 1-1.8-1.8v-5.4l3.1-2.2Z" />
      </G>
    </Svg>
  );
}

/**
 * For a custom map marker: lets the marker redraw until its artwork (SVG, colours) has painted, then
 * freezes it so the map stays smooth. Freezing from the first frame leaves pins blank or half drawn.
 * Pass anything that changes the pin's look as `deps`, so it redraws once more when that changes.
 */
export function useMarkerRedraw(...deps: unknown[]) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return tracks;
}

/** The map pin for a job's address: a shovel in a round badge with a small point underneath. */
export function ShovelPin({ color, size = 40 }: { color?: string; size?: number }) {
  const theme = useAppTheme();
  const fill = color || theme.accent;
  return (
    // Room around the badge so its border and shadow aren't clipped; none below, so the point stays the anchor.
    <View style={{ alignItems: "center", paddingHorizontal: 6, paddingTop: 6 }}>
      <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill }]}>
        <ShovelIcon size={size * 0.5} />
      </View>
      <View style={[styles.point, { borderTopColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", boxShadow: "0px 4px 10px rgba(17,43,59,0.28)" },
  point: { width: 0, height: 0, marginTop: -2, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent" },
});
