import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Circle, Marker, Polygon, type Region } from "react-native-maps";
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { CANADIAN_PROVINCES, type OperatorServiceArea } from "@/lib/types";
import { POSTAL_CODE, type AddressValue } from "~/components/AddressFields";
import { ShovelPin, SNOWD_MAP, useMarkerRedraw } from "~/components/MapStyle";
import { Icon } from "~/components/ui";
import { cityBoundary, type CityBoundary } from "~/lib/boundaries";
import { citiesNear, serviceAreaFor } from "~/lib/canadianCities";
import { currentLocation } from "~/lib/location";
import { ds, family, tap } from "~/lib/theme";

const TORONTO = { latitude: 43.6532, longitude: -79.3832 };

/** Turns a point on the map into a street address. */
async function addressAt(latitude: number, longitude: number): Promise<AddressValue> {
  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
  const match = CANADIAN_PROVINCES.find((p) => p.name === place?.region || p.code === place?.region);
  return {
    address: place ? [place.streetNumber, place.street].filter(Boolean).join(" ") : "",
    city: place?.city || place?.subregion || "",
    province: match?.code || "ON",
    postalCode: (place?.postalCode || "").toUpperCase(),
    lat: latitude,
    lng: longitude,
  };
}

/**
 * Pick your home on a map: the pin stays in the middle and you move the map under it (it lifts
 * while you drag and drops when you let go), or type your address in the box and the map flies
 * there. While you type, up to three matching addresses are listed under the box to tap. The address
 * found shows on a card under the map.
 */
export function HomeMap({ value, onChange, radiusKm }: { value: AddressValue; onChange: (value: AddressValue) => void; /** Draw a travel circle around the pin (operators). */ radiusKm?: number }) {
  const reduce = useReducedMotion();
  const map = useRef<MapView>(null);
  const [query, setQuery] = useState(value.address ? `${value.address}, ${value.city}` : "");
  const [busy, setBusy] = useState<"" | "locate" | "search" | "pin">("");
  const [problem, setProblem] = useState("");
  const skipNext = useRef(false);
  const dragging = useRef(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  // Addresses matching what's typed so far. Only text the person typed is looked up, not text we fill in.
  const [suggestions, setSuggestions] = useState<AddressValue[]>([]);
  const typed = useRef(false);
  const lookup = useRef(0);
  // Each look-up gets a number; "Enter it manually" bumps it so a late answer is ignored.
  const locateRun = useRef(0);
  const lift = useSharedValue(0);
  const pin = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 14 }, { scale: 1 + lift.value * 0.08 }] }));
  const shadow = useAnimatedStyle(() => ({ opacity: 0.25 - lift.value * 0.12, transform: [{ scaleX: 1 - lift.value * 0.35 }] }));
  const hasPoint = Number.isFinite(value.lat) && Number.isFinite(value.lng);
  const initial = useRef<Region>({ ...(hasPoint ? { latitude: value.lat!, longitude: value.lng! } : TORONTO), latitudeDelta: hasPoint ? 0.006 : 0.12, longitudeDelta: hasPoint ? 0.006 : 0.12 });

  const flyTo = (latitude: number, longitude: number) => {
    skipNext.current = true;
    map.current?.animateToRegion({ latitude, longitude, latitudeDelta: radiusKm ? 0.3 : 0.005, longitudeDelta: radiusKm ? 0.3 : 0.005 }, 700);
  };

  const locate = async () => {
    const run = ++locateRun.current;
    setProblem("");
    setBusy("locate");
    try {
      const here = await currentLocation().catch(async () => {
        const { granted } = await Location.getForegroundPermissionsAsync().catch(() => ({ granted: false }));
        throw new Error(granted ? "We couldn’t find you just now. Move the map or type your address instead." : "Location is off for SNOWD, so type your address below instead.");
      });
      if (run !== locateRun.current) return;
      const found = await addressAt(here.coords.latitude, here.coords.longitude);
      if (run !== locateRun.current) return;
      onChange(found);
      fill([found.address, found.city].filter(Boolean).join(", "));
      flyTo(here.coords.latitude, here.coords.longitude);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      if (run === locateRun.current) setProblem(e instanceof Error ? e.message : "We couldn’t find you. Type your address instead.");
    } finally {
      if (run === locateRun.current) setBusy("");
    }
  };

  /** Stops looking for the phone's location and puts the cursor in the address box. */
  const enterManually = () => {
    locateRun.current++;
    setBusy("");
    void Haptics.selectionAsync();
    setTimeout(() => input.current?.focus(), 50);
  };

  // No address yet: find where the phone is straight away (asking for location access if needed).
  useEffect(() => {
    if (hasPoint) return;
    void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Puts text in the box without treating it as typing, and closes the list. */
  const fill = (text: string) => {
    typed.current = false;
    lookup.current++;
    setSuggestions([]);
    setQuery(text);
  };

  // Look up matches a moment after typing stops.
  useEffect(() => {
    const text = query.trim();
    if (!typed.current || text.length < 4) {
      setSuggestions([]);
      return;
    }
    const run = ++lookup.current;
    const t = setTimeout(async () => {
      const hits = await Location.geocodeAsync(/canada/i.test(text) ? text : `${text}, Canada`).catch(() => []);
      const found = await Promise.all(hits.slice(0, 3).map((h) => addressAt(h.latitude, h.longitude)));
      if (run !== lookup.current) return;
      const seen = new Set<string>();
      setSuggestions(found.filter((f) => f.address && !seen.has(`${f.address}|${f.city}`) && seen.add(`${f.address}|${f.city}`)));
    }, 450);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (found: AddressValue) => {
    void Haptics.selectionAsync();
    Keyboard.dismiss();
    onChange(found);
    fill([found.address, found.city].filter(Boolean).join(", "));
    if (Number.isFinite(found.lat) && Number.isFinite(found.lng)) flyTo(found.lat!, found.lng!);
  };

  const search = async () => {
    const text = query.trim();
    if (!text) return;
    if (suggestions[0]) return pick(suggestions[0]);
    setProblem("");
    setBusy("search");
    try {
      const [hit] = await Location.geocodeAsync(/canada/i.test(text) ? text : `${text}, Canada`).catch(() => []);
      if (!hit) throw new Error("We couldn’t find that address. Try adding the city.");
      const found = await addressAt(hit.latitude, hit.longitude);
      onChange(found);
      fill([found.address, found.city].filter(Boolean).join(", ") || text);
      flyTo(hit.latitude, hit.longitude);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "We couldn’t find that address.");
    } finally {
      setBusy("");
    }
  };

  const settled = async (region: Region) => {
    lift.value = reduce ? 0 : withTiming(0, { duration: 180 });
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (!dragging.current) return;
    dragging.current = false;
    setBusy("pin");
    const found = await addressAt(region.latitude, region.longitude);
    setBusy("");
    onChange(found);
    fill([found.address, found.city].filter(Boolean).join(", "));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const needsPostal = !!value.address && !POSTAL_CODE.test(value.postalCode.trim());
  const center = hasPoint ? { latitude: value.lat!, longitude: value.lng! } : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.mapCard}>
        <MapView
          ref={map}
          {...SNOWD_MAP}
          style={StyleSheet.absoluteFill}
          initialRegion={initial.current}
          onPanDrag={() => {
            if (!dragging.current) {
              dragging.current = true;
              lift.value = reduce ? 0 : withTiming(1, { duration: 140 });
            }
          }}
          onRegionChangeComplete={(r) => void settled(r)}
        >
          {radiusKm && center ? <Circle center={center} radius={radiusKm * 1000} strokeColor={ds.accent} strokeWidth={2} fillColor="rgba(35,80,255,0.10)" /> : null}
        </MapView>
        {/* The pin, fixed in the middle; the map moves under it. */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <Animated.View style={pin}>
            <ShovelPin size={44} />
          </Animated.View>
          <Animated.View style={[styles.pinShadow, shadow]} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Use my current location" onPress={() => void locate()} style={({ pressed }) => [styles.locate, pressed && { opacity: 0.7 }]}>
          {busy === "locate" ? <ActivityIndicator color={ds.accent} /> : <Icon name="location.fill" size={18} color={ds.accent} />}
        </Pressable>
        {busy === "locate" && !hasPoint ? <Locating onManual={enterManually} /> : null}
        {!hasPoint && busy !== "locate" ? (
          <View pointerEvents="none" style={styles.dragHint}>
            <Icon name="hand.draw.fill" size={14} color={ds.ink2} />
            <Text style={styles.dragHintText}>Move the map to your door</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.search}>
        <Icon name="magnifyingglass" size={17} color={ds.ink3} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={(t) => {
            typed.current = true;
            setQuery(t);
          }}
          onFocus={() => busy === "locate" && enterManually()}
          placeholder="Or type your address"
          placeholderTextColor={ds.ink3}
          returnKeyType="search"
          onSubmitEditing={() => void search()}
          textContentType="fullStreetAddress"
          autoComplete="street-address"
          accessibilityLabel="Your address"
          style={styles.searchInput}
        />
        {busy === "search" ? (
          <ActivityIndicator color={ds.accent} />
        ) : query.trim() ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Find this address" hitSlop={8} onPress={() => void search()} style={styles.go}>
            <Icon name="arrow.right" size={15} color="#fff" weight="bold" />
          </Pressable>
        ) : null}
      </View>

      {suggestions.length ? (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(160)} style={styles.suggestions}>
          {suggestions.map((sug, i) => (
            <Pressable
              key={`${sug.address}|${sug.city}`}
              accessibilityRole="button"
              accessibilityLabel={`${sug.address}, ${sug.city}`}
              onPress={() => pick(sug)}
              style={({ pressed }) => [styles.suggestion, i > 0 && styles.suggestionSep, pressed && { backgroundColor: ds.bgAlt }]}
            >
              <Icon name="mappin" size={16} color={ds.ink3} />
              <View style={{ flex: 1 }}>
                <Text style={styles.foundTitle} numberOfLines={1}>{sug.address}</Text>
                <Text style={styles.foundSub} numberOfLines={1}>{[sug.city, sug.province, sug.postalCode].filter(Boolean).join(" · ")}</Text>
              </View>
              <Icon name="arrow.up.left" size={14} color={ds.ink3} />
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
      {value.address && !suggestions.length ? (
        <Animated.View key={`${value.address}${value.city}`} entering={reduce ? undefined : FadeIn.duration(200)} style={styles.found}>
          <View style={styles.foundIcon}>
            <Icon name="house.fill" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.foundTitle} numberOfLines={1}>{value.address}</Text>
            <Text style={styles.foundSub} numberOfLines={1}>{[value.city, value.province, value.postalCode].filter(Boolean).join(" · ")}</Text>
          </View>
          {busy === "pin" ? <ActivityIndicator color={ds.accent} /> : <Icon name="checkmark.circle.fill" size={22} color={needsPostal ? ds.ink3 : "#23955a"} />}
        </Animated.View>
      ) : null}
      {needsPostal ? (
        <View style={styles.search}>
          <Icon name="envelope.fill" size={16} color={ds.ink3} />
          <TextInput
            value={value.postalCode}
            onChangeText={(t) => onChange({ ...value, postalCode: t.toUpperCase() })}
            placeholder="Postal code, like M5V 2T6"
            placeholderTextColor={ds.ink3}
            autoCapitalize="characters"
            maxLength={7}
            textContentType="postalCode"
            autoComplete="postal-code"
            accessibilityLabel="Postal code"
            style={styles.searchInput}
          />
        </View>
      ) : null}
      {problem ? <Text accessibilityRole="alert" style={styles.problem}>{problem}</Text> : null}
    </View>
  );
}

/**
 * Covers the mini map while the phone's location is being found: a sweeping bar under
 * "Finding your current location", and a way out to type the address instead.
 */
function Locating({ onManual }: { onManual: () => void }) {
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    sweep.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(sweep);
  }, [reduce, sweep]);
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + sweep.value * 240 }] }));
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(180)} exiting={reduce ? undefined : FadeOut.duration(220)} style={styles.locating}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel="Finding your current location" style={styles.locatingCard}>
        <View style={styles.locatingIcon}>
          <Icon name="location.fill" size={18} color="#fff" />
        </View>
        <Text style={styles.locatingText}>Finding your current location…</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.trackBar, reduce ? { width: "100%", opacity: 0.5 } : bar]} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Enter your address manually instead" hitSlop={8} onPress={onManual} style={({ pressed }) => [styles.manual, pressed && { opacity: 0.7 }]}>
          <Icon name="keyboard" size={15} color={ds.accent} />
          <Text style={styles.manualText}>Enter it manually</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** The same city, whether it was suggested nearby or saved earlier under another id. */
const sameCity = (a: OperatorServiceArea, b: OperatorServiceArea) =>
  a.placeId === b.placeId || (!!a.city && a.city.toLowerCase() === (b.city || "").toLowerCase() && (a.provinceCode || a.province) === (b.provinceCode || b.province));

/** One city's pin on the map: a pill with its name, filled blue once it's picked. */
function CityPin({ name, on }: { name: string; on: boolean }) {
  return (
    <View style={{ padding: 4 }}>
      <View style={[styles.cityPin, on && styles.cityPinOn]}>
        {on ? <Icon name="checkmark" size={11} color="#fff" weight="bold" /> : <View style={styles.cityDot} />}
        <Text style={[styles.cityPinText, on && { color: "#fff" }]}>{name}</Text>
      </View>
    </View>
  );
}

/**
 * The cities around an operator's base, as pins to tap on a mini map and as chips under it. Picked
 * cities fill in blue and their borders are drawn. Anything not listed can be typed in.
 */
export function CityPicker({ base, value, onChange }: { base: { lat: number; lng: number } | null; value: OperatorServiceArea[]; onChange: (value: OperatorServiceArea[]) => void }) {
  const reduce = useReducedMotion();
  const map = useRef<MapView>(null);
  const near = base ? citiesNear(base) : [];
  // Typed-in cities join the nearby ones so they show on the map too.
  const all = [...near, ...value.filter((v) => !near.some((n) => sameCity(n, v)))];
  const [outlines, setOutlines] = useState<Record<string, CityBoundary | null>>({});
  const [typed, setTyped] = useState("");
  const [adding, setAdding] = useState(false);
  const [problem, setProblem] = useState("");
  const pickedCity = (city: OperatorServiceArea) => value.some((v) => sameCity(v, city));
  const picked = (id: string) => pickedCity(all.find((c) => c.placeId === id) || ({ placeId: id } as OperatorServiceArea));
  const redraw = useMarkerRedraw(value.map((v) => v.placeId).join(","));

  const toggle = (city: OperatorServiceArea) => {
    void Haptics.impactAsync(picked(city.placeId) ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    if (picked(city.placeId)) return onChange(value.filter((v) => !sameCity(v, city)));
    onChange([...value, city]);
    if (!(city.placeId in outlines)) void cityBoundary(city.city, city.province).then((b) => setOutlines((o) => ({ ...o, [city.placeId]: b })));
  };

  // Borders for cities picked earlier (Settings opens with them), looked up one at a time.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const c of value) {
        if (cancelled || c.placeId in outlines) continue;
        const b = await cityBoundary(c.city, c.province);
        if (!cancelled) setOutlines((o) => (c.placeId in o ? o : { ...o, [c.placeId]: b }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.length]);

  useEffect(() => {
    if (!all.length) return;
    const t = setTimeout(() => map.current?.fitToCoordinates(all.map((c) => ({ latitude: c.lat, longitude: c.lng })), { edgePadding: { top: 50, right: 60, bottom: 40, left: 60 }, animated: true }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length]);

  const add = async () => {
    const name = typed.trim();
    if (!name) return;
    setProblem("");
    setAdding(true);
    try {
      const [hit] = await Location.geocodeAsync(`${name}, Canada`).catch(() => []);
      if (!hit) throw new Error(`We couldn’t find ${name}. Check the spelling.`);
      const [place] = await Location.reverseGeocodeAsync({ latitude: hit.latitude, longitude: hit.longitude }).catch(() => []);
      const province = CANADIAN_PROVINCES.find((p) => p.name === place?.region || p.code === place?.region)?.code || "ON";
      const city = serviceAreaFor(place?.city || name, province, hit.latitude, hit.longitude);
      if (!picked(city.placeId)) toggle(city);
      setTyped("");
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn’t add that city.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.mapCard, { height: 270 }]}>
        <MapView
          ref={map}
          {...SNOWD_MAP}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...(base ? { latitude: base.lat, longitude: base.lng } : TORONTO), latitudeDelta: 0.7, longitudeDelta: 0.7 }}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {value.flatMap((c) => (outlines[c.placeId]?.rings || []).map((ring, i) => <Polygon key={`${c.placeId}-${i}`} coordinates={ring} strokeColor={ds.accent} strokeWidth={2} fillColor="rgba(35,80,255,0.14)" />))}
          {base ? (
            <Marker coordinate={{ latitude: base.lat, longitude: base.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={redraw}>
              <ShovelPin size={30} />
            </Marker>
          ) : null}
          {all.map((c) => (
            <Marker key={c.placeId} coordinate={{ latitude: c.lat, longitude: c.lng }} tracksViewChanges={redraw} onPress={() => toggle(c)}>
              <CityPin name={c.city} on={picked(c.placeId)} />
            </Marker>
          ))}
        </MapView>
      </View>

      <View style={styles.chips}>
        {all.map((c) => {
          const on = picked(c.placeId);
          return (
            <Animated.View key={c.placeId} entering={reduce ? undefined : FadeIn.duration(180)}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={c.city} onPress={() => toggle(c)} style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { transform: [{ scale: 0.96 }] }]}>
                {on ? <Icon name="checkmark" size={12} color="#fff" weight="bold" /> : null}
                <Text style={[styles.chipText, on && { color: "#fff" }]}>{c.city}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.search}>
        <Icon name="plus.circle.fill" size={18} color={ds.ink3} />
        <TextInput value={typed} onChangeText={setTyped} placeholder="Add another city" placeholderTextColor={ds.ink3} returnKeyType="done" onSubmitEditing={() => void add()} textContentType="addressCity" accessibilityLabel="Add another city" style={styles.searchInput} />
        {adding ? <ActivityIndicator color={ds.accent} /> : typed.trim() ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Add this city" hitSlop={8} onPress={() => void add()} style={styles.go}>
            <Icon name="plus" size={15} color="#fff" weight="bold" />
          </Pressable>
        ) : null}
      </View>
      {problem ? <Text accessibilityRole="alert" style={styles.problem}>{problem}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: { height: 290, borderRadius: 28, overflow: "hidden", backgroundColor: ds.bgAlt, borderWidth: 1, borderColor: ds.borderSoft, ...ds.cardShadow },
  pinWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", paddingBottom: 54 },
  pinShadow: { width: 22, height: 7, borderRadius: 4, backgroundColor: "#0b2233", marginTop: 2 },
  locate: { position: "absolute", right: 12, bottom: 12, width: tap, height: tap, borderRadius: tap / 2, backgroundColor: ds.card, alignItems: "center", justifyContent: "center", boxShadow: "0px 4px 14px rgba(17,43,59,0.18)" },
  dragHint: { position: "absolute", top: 12, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  locating: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(246,248,251,0.72)", padding: 20 },
  locatingCard: { width: "100%", maxWidth: 300, alignItems: "center", gap: 12, paddingVertical: 18, paddingHorizontal: 18, borderRadius: 22, backgroundColor: ds.card, boxShadow: "0px 8px 24px rgba(17,43,59,0.16)" },
  locatingIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center" },
  locatingText: { fontSize: 17, lineHeight: 22, color: ds.ink, fontFamily: family.bodySemi, textAlign: "center" },
  track: { width: 160, height: 4, borderRadius: 2, backgroundColor: ds.accentSoft, overflow: "hidden" },
  trackBar: { width: 80, height: 4, borderRadius: 2, backgroundColor: ds.accent },
  manual: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: ds.accentSoft },
  manualText: { fontSize: 15, color: ds.accent, fontFamily: family.bodyBold },
  dragHintText: { fontSize: 14, color: ds.ink2, fontFamily: family.bodySemi },
  search: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingHorizontal: 16, borderRadius: 18, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border },
  searchInput: { flex: 1, fontSize: 17, color: ds.ink, fontFamily: family.body, paddingVertical: 14 },
  go: { width: 32, height: 32, borderRadius: 16, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center" },
  suggestions: { marginTop: -4, backgroundColor: ds.card, borderRadius: 18, borderWidth: 1.5, borderColor: ds.border, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  suggestionSep: { borderTopWidth: 1, borderTopColor: ds.borderSoft },
  found: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: ds.accentSoft, borderWidth: 1, borderColor: ds.accentBorder },
  foundIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center" },
  foundTitle: { fontSize: 17, lineHeight: 22, color: ds.ink, fontFamily: family.bodySemi },
  foundSub: { fontSize: 14, lineHeight: 19, color: ds.ink3, fontFamily: family.body },
  problem: { fontSize: 15, lineHeight: 20, color: "#b42318", fontFamily: family.bodyMedium },
  cityPin: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1.5, borderColor: ds.accentBorder, boxShadow: "0px 3px 8px rgba(17,43,59,0.18)" },
  cityPinOn: { backgroundColor: ds.accent, borderColor: ds.accent },
  cityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ds.accent },
  cityPinText: { fontSize: 11.5, color: ds.ink, fontFamily: family.bodyBold },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: tap, paddingHorizontal: 16, borderRadius: 999, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border },
  chipOn: { backgroundColor: ds.accent, borderColor: ds.accent },
  chipText: { fontSize: 16, color: ds.ink, fontFamily: family.bodySemi },
});
