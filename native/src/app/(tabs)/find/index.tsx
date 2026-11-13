import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SNOWD_MAP } from "~/components/MapStyle";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CardSkeletons } from "~/components/brand";
import { Avatar, Button, Chip, Empty, Icon, Loading, SwipeTabs, usePenguinRefresh } from "~/components/ui";
import { useAuth, type Profile } from "~/context/auth";
import { money } from "~/lib/format";
import { quoteFor, useOperators, type NearbyOperator } from "~/lib/operators";
import { colors, radius, shadow, space, type } from "~/lib/theme";

const CARD_WIDTH = Dimensions.get("window").width - 56;
const TORONTO = { latitude: 43.6532, longitude: -79.3832 };

export default function Find() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { operators, loading, error, reload } = useOperators(profile);
  const [onlyNearby, setOnlyNearby] = useState(true);
  const [cardsOnly, setCardsOnly] = useState(false);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"map" | "list">("list");
  const switchMode = (next: "map" | "list") => {
    void Haptics.selectionAsync();
    setMode(next);
  };
  // Swiping up on the cards opens the full list; the list has a Map button to come back.
  const swipeUp = usePanGesture({
    activeOffsetY: [-18, 18],
    failOffsetX: [-12, 12],
    runOnJS: true,
    onDeactivate: (event) => {
      const { translationY, velocityY } = event as unknown as { translationY: number; velocityY: number };
      if (translationY < -40 || velocityY < -500) switchMode("list");
    },
  });
  const { scrollProps, indicator } = usePenguinRefresh(reload, undefined, false);
  const map = useRef<MapView>(null);
  const list = useRef<FlatList<NearbyOperator>>(null);

  const shown = useMemo(() => operators.filter((o) => (!onlyNearby || o.servesYou) && (!cardsOnly || quoteFor(o, profile).card)), [operators, onlyNearby, cardsOnly, profile]);
  const home = typeof profile?.lat === "number" && typeof profile?.lng === "number" ? { latitude: profile.lat, longitude: profile.lng } : TORONTO;

  const focus = (index: number, scrollList = true) => {
    const op = shown[index];
    if (!op) return;
    setSelected(index);
    if (scrollList) list.current?.scrollToIndex({ index, animated: true });
    if (typeof op.lat === "number" && typeof op.lng === "number")
      map.current?.animateToRegion({ latitude: op.lat, longitude: op.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 350);
  };

  return (
    <View style={{ flex: 1 }}>
      {mode === "map" ? (
      <MapView ref={map} {...SNOWD_MAP} style={StyleSheet.absoluteFill} initialRegion={{ ...home, latitudeDelta: 0.12, longitudeDelta: 0.12 }} showsUserLocation>
        <Marker coordinate={home} title="Your home">
          <View style={styles.homePin}>
            <Icon name="house.fill" size={14} color="#fff" />
          </View>
        </Marker>
        {shown.map((op, i) =>
          typeof op.lat === "number" && typeof op.lng === "number" ? (
            <Marker key={op.uid} coordinate={{ latitude: op.lat, longitude: op.lng }} onPress={() => focus(i)} tracksViewChanges={false} accessibilityLabel={`${op.businessName || op.displayName}, ${money(quoteFor(op, profile).cash)}`}>
              <View style={[styles.pricePin, i === selected && { backgroundColor: colors.ink }]}>
                <Text style={{ color: i === selected ? "#fff" : colors.ink, fontWeight: "800", fontSize: 15 }}>{money(quoteFor(op, profile).cash).replace(".00", "")}</Text>
              </View>
            </Marker>
          ) : null,
        )}
      </MapView>
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + 8 }, mode === "list" && { backgroundColor: "rgba(246,248,251,0.97)", paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <View style={styles.titleBar}>
          <Icon name="magnifyingglass" size={16} color={colors.muted} />
          <Text accessibilityRole="header" style={[type.headline, { flex: 1 }]} numberOfLines={1}>Shovelers near {profile?.city || "you"}</Text>
          <Text style={type.caption}>{loading ? "…" : `${shown.length} found`}</Text>
        </View>
        <View style={styles.segment} accessibilityRole="tablist">
          {(["list", "map"] as const).map((m) => (
            <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} accessibilityLabel={m === "map" ? "Map view" : "List view"} onPress={() => switchMode(m)} style={[styles.segmentItem, mode === m && styles.segmentOn]}>
              <Icon name={m === "map" ? "map.fill" : "list.bullet"} size={14} color={mode === m ? "#fff" : colors.ink} />
              <Text style={{ fontWeight: "800", fontSize: 15, color: mode === m ? "#fff" : colors.ink }}>{m === "map" ? "Map" : "List"}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="Serves my address" icon="mappin" selected={onlyNearby} onPress={() => { setOnlyNearby(!onlyNearby); setSelected(0); }} />
          <Chip label="Takes cards" icon="creditcard" selected={cardsOnly} onPress={() => { setCardsOnly(!cardsOnly); setSelected(0); }} />
        </View>
      </View>

      {mode === "list" ? (
        <SwipeTabs tab="/find">
          <Animated.FlatList
            data={shown}
            keyExtractor={(o) => o.uid}
            style={{ flex: 1, backgroundColor: colors.bg }}
            contentContainerStyle={{ paddingTop: insets.top + 168, paddingHorizontal: space.lg, paddingBottom: insets.bottom + 100, gap: space.md }}
            {...scrollProps}
            ListHeaderComponent={<View>{indicator}</View>}
            ListEmptyComponent={loading ? <CardSkeletons count={4} /> : <Empty icon="person.2.slash" title={error || "No shovelers serve this area yet"} body={error ? undefined : onlyNearby ? "Turn off “Serves my address” to see everyone nearby." : "Check back soon, new shovelers join every week."} />}
            renderItem={({ item }) => <OperatorCard op={item} profile={profile} onOpen={() => router.push(`/operator/${item.uid}`)} onBook={() => router.push(`/book/${item.uid}`)} />}
          />
        </SwipeTabs>
      ) : null}

      {mode === "map" ? (
      <View style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 62 }}>
        <GestureDetector gesture={swipeUp}>
          <Pressable accessibilityRole="button" accessibilityLabel="Show all as a list" onPress={() => switchMode("list")} style={styles.handleWrap}>
            <View style={styles.handle} />
            <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 13 }}>Swipe up for list</Text>
          </Pressable>
        </GestureDetector>
        {loading ? (
          <View style={[styles.card, { marginHorizontal: 28, height: 150 }]}>
            <Loading />
          </View>
        ) : !shown.length ? (
          <View style={[styles.card, { marginHorizontal: 20, alignItems: "center" }]}>
            <Text style={type.headline}>{error || "No shovelers serve this area yet"}</Text>
            <Text style={[type.callout, { textAlign: "center" }]}>{error ? "" : onlyNearby ? "Turn off “Serves my address” to see everyone nearby." : "Check back soon, new shovelers join every week."}</Text>
            {error ? <Button title="Try again" small onPress={() => void reload()} /> : null}
          </View>
        ) : (
          <FlatList
            ref={list}
            horizontal
            data={shown}
            keyExtractor={(o) => o.uid}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 28, gap: 12 }}
            getItemLayout={(_, index) => ({ length: CARD_WIDTH + 12, offset: (CARD_WIDTH + 12) * index, index })}
            onMomentumScrollEnd={(e) => focus(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)), false)}
            renderItem={({ item }) => {
              const quote = quoteFor(item, profile);
              return (
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.businessName || item.displayName}, ${money(quote.cash)} cash. View profile`} onPress={() => router.push(`/operator/${item.uid}`)} style={({ pressed }) => [styles.card, { width: CARD_WIDTH }, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <Avatar uri={item.logoUrl || item.avatar} name={item.businessName || item.displayName} size={50} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={type.headline} numberOfLines={1}>{item.businessName || item.displayName}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Icon name="star.fill" size={13} color={colors.sun} />
                        <Text style={type.caption}>
                          {item.reviewCount ? `${item.rating.toFixed(1)} (${item.reviewCount})` : "New"}
                          {item.distanceKm != null ? ` · ${item.distanceKm.toFixed(1)} km` : ""}
                          {item.isStudent ? " · Student" : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={type.title}>{money(quote.cash)}</Text>
                      <Text style={type.caption}>{quote.card ? "cash or card" : "cash only"}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button title="View profile" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push(`/operator/${item.uid}`)} />
                    <Button title="Request" icon="paperplane.fill" small style={{ flex: 1 }} disabled={!item.servesYou} onPress={() => router.push(`/book/${item.uid}`)} />
                  </View>
                  {!item.servesYou ? <Text style={[type.caption, { textAlign: "center" }]}>Doesn’t serve your address</Text> : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
      ) : null}
    </View>
  );
}

/** One shoveler in the list view: photo, rating, distance, price and the two actions. */
function OperatorCard({ op, profile, onOpen, onBook }: { op: NearbyOperator; profile: Profile; onOpen: () => void; onBook: () => void }) {
  const quote = quoteFor(op, profile);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${op.businessName || op.displayName}, ${money(quote.cash)} cash. View profile`} onPress={onOpen} style={({ pressed }) => [styles.listCard, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Avatar uri={op.logoUrl || op.avatar} name={op.businessName || op.displayName} size={56} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={type.headline} numberOfLines={1}>{op.businessName || op.displayName}</Text>
          {op.tagline ? <Text style={type.caption} numberOfLines={1}>{op.tagline}</Text> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="star.fill" size={13} color={colors.sun} />
            <Text style={type.caption}>
              {op.reviewCount ? `${op.rating.toFixed(1)} (${op.reviewCount})` : "New"}
              {op.distanceKm != null ? ` · ${op.distanceKm.toFixed(1)} km` : ""}
              {op.isStudent ? " · Student" : ""}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={type.title}>{money(quote.cash)}</Text>
          <Text style={type.caption}>{quote.card ? "cash or card" : "cash only"}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Profile" variant="secondary" small style={{ flex: 1 }} onPress={onOpen} />
        <Button title={op.servesYou ? "Request" : "Not in your area"} icon={op.servesYou ? "paperplane.fill" : undefined} small style={{ flex: 2 }} disabled={!op.servesYou} onPress={onBook} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.lg, gap: 10, zIndex: 10 },
  titleBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: space.lg, minHeight: 52, ...shadow, shadowOpacity: 0.12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, gap: space.md, ...shadow, shadowOpacity: 0.14, shadowRadius: 18 },
  pricePin: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, ...shadow, shadowOpacity: 0.2 },
  segment: { flexDirection: "row", alignSelf: "flex-start", padding: 4, gap: 4, borderRadius: radius.pill, backgroundColor: colors.surface, ...shadow, shadowOpacity: 0.12 },
  segmentItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, minHeight: 36, borderRadius: radius.pill },
  segmentOn: { backgroundColor: colors.ink },
  handleWrap: { alignSelf: "center", alignItems: "center", gap: 4, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.92)", ...shadow },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow },
  homePin: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
});
