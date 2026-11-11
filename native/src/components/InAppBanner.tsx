import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { presentNotification } from "@/lib/notificationPresentation";
import { notificationRoute, type AppNotification } from "~/lib/notifications";
import { colors, radius, shadow, space, type } from "~/lib/theme";
import { Icon } from "./ui";

/**
 * Drops a banner from the top of the screen when a new job, message or payment update
 * arrives while the app is open. Tapping it opens the update; it hides itself after a few seconds.
 * Updates about the chat or order already on screen are skipped.
 */
export function InAppBanner({ items, onOpen }: { items: AppNotification[]; onOpen: (id: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const seen = useRef<Set<string> | null>(null);
  const [current, setCurrent] = useState<AppNotification | null>(null);

  useEffect(() => {
    // The first list is history, not news.
    if (!seen.current) {
      if (items.length) seen.current = new Set(items.map((i) => i.id));
      return;
    }
    const fresh = items.find((i) => !i.read && !seen.current!.has(i.id));
    items.forEach((i) => seen.current!.add(i.id));
    if (!fresh) return;
    const route = notificationRoute(fresh);
    if (route && pathname === route) return;
    setCurrent(fresh);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [items, pathname]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), 4500);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;
  const view = presentNotification(current);
  const route = notificationRoute(current);
  return (
    <Animated.View entering={SlideInUp.springify().damping(18)} exiting={SlideOutUp.duration(200)} style={{ position: "absolute", top: insets.top + 6, left: space.md, right: space.md, zIndex: 100 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${view.title}. ${view.detail || ""}. Open`}
        onPress={() => {
          onOpen(current.id);
          setCurrent(null);
          if (route) router.push(route as never);
        }}
        style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.ink, ...shadow, shadowOpacity: 0.25 }, pressed && { opacity: 0.9 }]}
      >
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
          <Icon name={view.kind === "message" ? "bubble.left.fill" : view.kind === "payment" ? "creditcard.fill" : "snowflake"} size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.headline, { color: "#fff", fontSize: 15 }]} numberOfLines={1}>{view.title}</Text>
          {view.detail ? <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }} numberOfLines={2}>{view.detail}</Text> : null}
        </View>
        <Pressable accessibilityLabel="Dismiss" hitSlop={10} onPress={() => setCurrent(null)}>
          <Icon name="xmark" size={13} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
