import * as Location from "expo-location";
import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import MapView, { Circle, Marker, Polygon } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CANADIAN_PROVINCES, type OperatorServiceArea } from "@/lib/types";
import { AddressFields, addressProblem, currentAddress, geocodeAddress, type AddressValue } from "~/components/AddressFields";
import { Button, Chip, Icon, Notice, AutosaveStatus, useAutosave } from "~/components/ui";
import { ShovelPin, SNOWD_MAP, useMarkerRedraw } from "~/components/MapStyle";
import { cityBoundary, type CityBoundary } from "~/lib/boundaries";
import { useAuth } from "~/context/auth";
import { notifyAdmin } from "~/lib/admin";
import { db } from "~/lib/firebase";
import { colors, radius, shadow, space, type } from "~/lib/theme";

const RADII = [5, 10, 15, 20, 30, 50];

/** Base location plus the travel radius or cities served — the website's Settings → Service areas. */
export default function ServiceAreaSettings() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const initial = () => ({
    home: { address: profile?.address || "", city: profile?.city || "", province: profile?.province || "ON", postalCode: profile?.postalCode || "", lat: profile?.lat ?? null, lng: profile?.lng ?? null } as AddressValue,
    mode: (profile?.serviceAreaMode || (profile?.serviceAreas?.length ? "cities" : "radius")) as "radius" | "cities",
    radiusKm: profile?.serviceRadius || 10,
    cities: (profile?.serviceAreas || []) as OperatorServiceArea[],
  });
  const [home, setHome] = useState(initial().home);
  const [mode, setMode] = useState(initial().mode);
  const [radiusKm, setRadiusKm] = useState(initial().radiusKm);
  const [cities, setCities] = useState(initial().cities);
  const [cityName, setCityName] = useState("");
  const [cityProvince, setCityProvince] = useState(profile?.province || "ON");
  const [adding, setAdding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [locating, setLocating] = useState(false);
  const [radiusText, setRadiusText] = useState(String(initial().radiusKm));
  const [outlines, setOutlines] = useState<Record<string, CityBoundary | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const owner = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || owner.current === profile.uid) return;
    owner.current = profile.uid;
    const s = initial();
    setHome(s.home);
    setMode(s.mode);
    setRadiusKm(s.radiusKm);
    setRadiusText(String(s.radiusKm));
    setCities(s.cities);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const o = initial();
  const dirty =
    home.address !== o.home.address || home.city !== o.home.city || home.province !== o.home.province || home.postalCode !== o.home.postalCode ||
    mode !== o.mode || radiusKm !== o.radiusKm || JSON.stringify(cities) !== JSON.stringify(o.cities);

  // Cities are found by name; their outline is drawn on the map.
  const addCity = async () => {
    setError("");
    const city = cityName.trim();
    if (!city) return setError("Type a city name to add it.");
    if (cities.some((c) => c.city.toLowerCase() === city.toLowerCase() && c.provinceCode === cityProvince)) return setError(`${city} is already in your list.`);
    setAdding(true);
    try {
      const province = CANADIAN_PROVINCES.find((p) => p.code === cityProvince)!;
      const boundary = await cityBoundary(city, province.name);
      const point = boundary ? { latitude: boundary.lat, longitude: boundary.lng } : (await Location.geocodeAsync(`${city}, ${province.name}, Canada`).catch(() => []))[0];
      if (!point) throw new Error(`We couldn’t find ${city}, ${province.code}. Check the spelling.`);
      const placeId = `app-${city.toLowerCase().replace(/\s+/g, "-")}-${province.code.toLowerCase()}`;
      setOutlines((o) => ({ ...o, [placeId]: boundary }));
      setCities((list) => [...list, { placeId, city, province: province.name, provinceCode: province.code, country: "Canada", lat: point.latitude, lng: point.longitude }]);
      setCityName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add that city.");
    } finally {
      setAdding(false);
    }
  };

  // Outlines for cities saved earlier, looked up one at a time (the map service asks for that).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const c of cities) {
        if (cancelled || c.placeId in outlines) continue;
        const b = await cityBoundary(c.city, c.province);
        if (!cancelled) setOutlines((o) => ({ ...o, [c.placeId]: b }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cities]); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = async () => {
    setError("");
    setLocating(true);
    try {
      setHome(await currentAddress());
      setTyping(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t find your location.");
    } finally {
      setLocating(false);
    }
  };

  const setRadius = (km: number) => {
    const clamped = Math.max(1, Math.min(100, Math.round(km)));
    setRadiusKm(clamped);
    setRadiusText(String(clamped));
  };

  const save = async () => {
    setError("");
    setDone("");
    const problem = addressProblem(home);
    if (problem) return setError(problem);
    if (mode === "cities" && !cities.length) return setError("Add at least one service city, or choose a travel radius.");
    setSaving(true);
    try {
      const point = await geocodeAddress(home);
      await updateDoc(doc(db, "users", user!.uid), {
        address: home.address.trim(),
        city: home.city.trim(),
        province: home.province,
        postalCode: home.postalCode.trim().toUpperCase(),
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
        serviceAreaMode: mode,
        serviceRadius: radiusKm,
        serviceAreas: mode === "cities" ? cities : [],
      });
      if (point) setHome((h) => ({ ...h, ...point }));
      notifyAdmin({ type: "profile_saved", message: `Service area updated by ${profile?.displayName || profile?.email} (${home.city}, ${home.province})`, uid: user!.uid, meta: { city: home.city, province: home.province } });
      setDone("Service area saved.");
    } catch {
      setError("Couldn’t save your service area. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const center = Number.isFinite(home.lat) && Number.isFinite(home.lng) ? { latitude: home.lat!, longitude: home.lng! } : null;
  // The map follows what you pick: the radius circle, or all your cities.
  const region = useMemo(() => {
    if (mode === "cities" && cities.length) {
      const lats = cities.map((c) => c.lat);
      const lngs = cities.map((c) => c.lng);
      const span = Math.max(0.25, Math.max(...lats) - Math.min(...lats) + 0.25, Math.max(...lngs) - Math.min(...lngs) + 0.25);
      return { latitude: (Math.max(...lats) + Math.min(...lats)) / 2, longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2, latitudeDelta: span, longitudeDelta: span };
    }
    if (!center) return null;
    const d = mode === "radius" ? (radiusKm / 111) * 2.6 : 0.6;
    return { ...center, latitudeDelta: d, longitudeDelta: d };
  }, [mode, cities, center?.latitude, center?.longitude, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps
  const homeLine = [home.address, home.city, home.province].filter(Boolean).join(", ");

  // Saves on its own a moment after each change; no save button.
  useAutosave({ home, mode, radiusKm, cities }, { dirty, save });
  const pinTracks = useMarkerRedraw(center?.latitude, center?.longitude);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Service area" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 120 }}>
        {/* The map first: your base, and the circle or city outlines customers are matched to. */}
        <View style={styles.mapWrap}>
          {region ? (
            <MapView {...SNOWD_MAP} style={StyleSheet.absoluteFill} pointerEvents="none" region={region}>
              {center ? (
                <Marker coordinate={center} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={pinTracks}>
                  <ShovelPin size={34} />
                </Marker>
              ) : null}
              {mode === "radius" && center ? <Circle center={center} radius={radiusKm * 1000} strokeColor={colors.accent} strokeWidth={2} fillColor="rgba(35,80,255,0.12)" /> : null}
              {mode === "cities"
                ? cities.map((c) =>
                    outlines[c.placeId]?.rings.length ? (
                      outlines[c.placeId]!.rings.map((ring, i) => <Polygon key={`${c.placeId}-${i}`} coordinates={ring} strokeColor={colors.accent} strokeWidth={2} fillColor="rgba(35,80,255,0.14)" />)
                    ) : (
                      <Marker key={c.placeId} coordinate={{ latitude: c.lat, longitude: c.lng }} pinColor={colors.sun} />
                    ),
                  )
                : null}
            </MapView>
          ) : (
            <View style={styles.mapEmpty}>
              <Icon name="map" size={28} color={colors.faint} />
              <Text style={[type.caption, { textAlign: "center" }]}>Set your base location to see your area.</Text>
            </View>
          )}
          <View style={styles.mapBadge}>
            <Text style={{ fontWeight: "800", color: colors.ink, fontSize: 13 }}>{mode === "radius" ? `${radiusKm} km around you` : `${cities.length} ${cities.length === 1 ? "city" : "cities"}`}</Text>
          </View>
        </View>

        {/* Base location: one tap for where you are now, or type it in. */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="house.fill" size={16} color={colors.accent} />
            <Text style={[type.headline, { flex: 1 }]} numberOfLines={1}>{homeLine || "Your base location"}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="My location" icon="location.fill" small loading={locating} style={{ flex: 1 }} onPress={() => void locate()} />
            <Button title={typing ? "Done" : "Type it in"} icon={typing ? "checkmark" : "keyboard"} variant="secondary" small style={{ flex: 1 }} onPress={() => setTyping((t) => !t)} />
          </View>
          {typing ? <AddressFields value={home} onChange={setHome} showLocate={false} /> : null}
        </View>

        {/* Radius or cities. */}
        <View accessibilityRole="tablist" style={styles.segment}>
          {(
            [
              ["radius", "Distance"],
              ["cities", "Cities"],
            ] as const
          ).map(([value, label]) => (
            <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.segmentItem, mode === value && styles.segmentOn]}>
              <Text style={{ fontWeight: "800", fontSize: 15, color: mode === value ? colors.ink : colors.muted }}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "radius" ? (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Smaller radius" onPress={() => setRadius(radiusKm - 1)} style={styles.stepper}>
                <Icon name="minus" size={16} color={colors.ink} weight="bold" />
              </Pressable>
              <View style={styles.radiusBox}>
                <TextInput
                  accessibilityLabel="Travel radius in kilometres"
                  value={radiusText}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  onChangeText={(t) => {
                    const v = t.replace(/[^\d]/g, "").slice(0, 3);
                    setRadiusText(v);
                    if (Number(v) >= 1) setRadiusKm(Math.min(100, Number(v)));
                  }}
                  onBlur={() => setRadius(Number(radiusText) || radiusKm)}
                  style={{ fontSize: 26, fontWeight: "900", color: colors.ink, minWidth: 44, textAlign: "center", fontVariant: ["tabular-nums"], paddingVertical: 0 }}
                />
                <Text style={{ fontSize: 17, fontWeight: "700", color: colors.muted }}>km</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Bigger radius" onPress={() => setRadius(radiusKm + 1)} style={[styles.stepper, { backgroundColor: colors.accent }]}>
                <Icon name="plus" size={16} color="#fff" weight="bold" />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {RADII.map((r) => (
                <Chip key={r} label={`${r} km`} selected={radiusKm === r} onPress={() => setRadius(r)} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={styles.cityInput}>
                <Icon name="magnifyingglass" size={15} color={colors.muted} />
                <TextInput value={cityName} onChangeText={setCityName} placeholder="Type a city, e.g. Brampton" placeholderTextColor={colors.faint} returnKeyType="done" onSubmitEditing={() => void addCity()} accessibilityLabel="City name" style={{ flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 10 }} />
              </View>
              <Button title="Add" icon="plus" small loading={adding} onPress={() => void addCity()} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE"].map((code) => (
                <Chip key={code} label={code} selected={cityProvince === code} onPress={() => setCityProvince(code)} />
              ))}
            </ScrollView>
            {cities.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {cities.map((c) => (
                  <Pressable key={c.placeId} accessibilityRole="button" accessibilityLabel={`Remove ${c.city}`} onPress={() => setCities((list) => list.filter((x) => x.placeId !== c.placeId))} style={styles.cityChip}>
                    <Text style={{ fontWeight: "700", color: colors.accentDark }}>{c.city}, {c.provinceCode}</Text>
                    <Icon name="xmark.circle.fill" size={16} color={colors.accent} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={type.caption}>Add the cities you serve. Their borders show on the map.</Text>
            )}
          </View>
        )}
        <Notice text={error} />
      </KeyboardAwareScrollView>
      <AutosaveStatus saving={saving} dirty={dirty} error={error} bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 240, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceAlt },
  mapEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: space.lg },
  mapBadge: { position: "absolute", left: 10, top: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "#fff", ...shadow },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  segment: { flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segmentOn: { backgroundColor: colors.surface, ...shadow, shadowOpacity: 0.08 },
  stepper: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  radiusBox: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 4, minHeight: 56, paddingTop: 10, borderRadius: radius.md, backgroundColor: colors.bg },
  cityInput: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  cityChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
});
