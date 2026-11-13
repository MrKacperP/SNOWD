import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
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

/** A snow shovel, drawn so it reads at pin size. */
export function ShovelIcon({ size = 18, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* D-grip, shaft and a wide scoop blade, angled like it's mid-push. */}
      <Path d="M17.2 2.3a2.3 2.3 0 0 1 3.3 3.3l-.9.9-3.3-3.3.9-.9Z" fill={color} />
      <Rect x="10.6" y="4.4" width="2.2" height="11.2" rx="1.1" transform="rotate(45 11.7 10)" fill={color} />
      <Path d="M3.1 13.6 8 12.4l3.6 3.6-1.2 4.9c-.2.8-1.2 1.1-1.8.5l-5.9-5.9c-.6-.6-.3-1.6.4-1.9Z" fill={color} />
    </Svg>
  );
}

/** The map pin for a job's address: a shovel in a round badge with a small point underneath. */
export function ShovelPin({ color, size = 40 }: { color?: string; size?: number }) {
  const theme = useAppTheme();
  const fill = color || theme.accent;
  return (
    <View style={{ alignItems: "center" }}>
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
