import * as Location from "expo-location";
import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import MapView, { Circle, Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CANADIAN_PROVINCES, type OperatorServiceArea } from "@/lib/types";
import { AddressFields, addressProblem, geocodeAddress, type AddressValue } from "~/components/AddressFields";
import { Button, Card, Chip, Field, Icon, Notice, SaveBar } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { notifyAdmin } from "~/lib/admin";
import { db } from "~/lib/firebase";
import { colors, radius, space, type } from "~/lib/theme";

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
    setCities(s.cities);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const o = initial();
  const dirty =
    home.address !== o.home.address || home.city !== o.home.city || home.province !== o.home.province || home.postalCode !== o.home.postalCode ||
    mode !== o.mode || radiusKm !== o.radiusKm || JSON.stringify(cities) !== JSON.stringify(o.cities);

  const addCity = async () => {
    setError("");
    const city = cityName.trim();
    if (!city) return setError("Type a city name to add it.");
    if (cities.some((c) => c.city.toLowerCase() === city.toLowerCase() && c.provinceCode === cityProvince)) return setError(`${city} is already in your list.`);
    setAdding(true);
    try {
      const province = CANADIAN_PROVINCES.find((p) => p.code === cityProvince)!;
      const [hit] = await Location.geocodeAsync(`${city}, ${province.name}, Canada`).catch(() => []);
      if (!hit) throw new Error(`We couldn’t find ${city}, ${province.code}. Check the spelling.`);
      setCities((list) => [
        ...list,
        { placeId: `app-${city.toLowerCase().replace(/\s+/g, "-")}-${province.code.toLowerCase()}`, city, province: province.name, provinceCode: province.code, country: "Canada", lat: hit.latitude, lng: hit.longitude },
      ]);
      setCityName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add that city.");
    } finally {
      setAdding(false);
    }
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Service area" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}>
        <Card>
          <Text style={type.headline}>Your base location</Text>
          <Text style={type.caption}>Where you start from. Customers only see your city.</Text>
          <AddressFields value={home} onChange={setHome} />
        </Card>

        <Card>
          <Text style={type.headline}>Where will you shovel?</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(
              [
                ["radius", "Around my address"],
                ["cities", "Selected cities"],
              ] as const
            ).map(([value, label]) => (
              <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={{ flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, alignItems: "center", justifyContent: "center", borderColor: mode === value ? colors.accent : colors.border, backgroundColor: mode === value ? colors.accentSoft : colors.surface }}>
                <Text style={{ fontWeight: "700", color: mode === value ? colors.accentDark : colors.ink }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {mode === "radius" ? (
            <>
              <Text style={type.body}>Travel radius: <Text style={{ fontWeight: "800" }}>{radiusKm} km</Text></Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Button title="−" variant="secondary" small disabled={radiusKm <= 1} onPress={() => setRadiusKm((r) => Math.max(1, r - 1))} style={{ width: 44 }} />
                <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {RADII.map((r) => (
                    <Chip key={r} label={`${r} km`} selected={radiusKm === r} onPress={() => setRadiusKm(r)} />
                  ))}
                </View>
                <Button title="+" variant="secondary" small disabled={radiusKm >= 50} onPress={() => setRadiusKm((r) => Math.min(50, r + 1))} style={{ width: 44 }} />
              </View>
            </>
          ) : (
            <>
              <Text style={type.caption}>Customers in your selected cities can find you. Your home radius is turned off.</Text>
              {cities.map((c) => (
                <View key={c.placeId} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}>
                  <Icon name="mappin.circle.fill" size={18} color={colors.accent} />
                  <Text style={[type.body, { flex: 1 }]}>{c.city}, {c.provinceCode}</Text>
                  <Pressable hitSlop={10} accessibilityLabel={`Remove ${c.city}`} onPress={() => setCities((list) => list.filter((x) => x.placeId !== c.placeId))}>
                    <Icon name="minus.circle.fill" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
              {!cities.length ? <Notice tone="orange" text="Add at least one city to continue." /> : null}
              <Field label="Add a city" value={cityName} onChangeText={setCityName} placeholder="Brampton" returnKeyType="done" onSubmitEditing={addCity} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE"].map((code) => (
                  <Chip key={code} label={code} selected={cityProvince === code} onPress={() => setCityProvince(code)} />
                ))}
              </View>
              <Button title="Add city" icon="plus" variant="secondary" small loading={adding} onPress={addCity} />
            </>
          )}

          {center ? (
            <MapView
              style={{ height: 200, borderRadius: radius.md }}
              pointerEvents="none"
              region={{ ...center, latitudeDelta: mode === "radius" ? (radiusKm / 111) * 2.6 : 0.6, longitudeDelta: mode === "radius" ? (radiusKm / 111) * 2.6 : 0.6 }}
            >
              <Marker coordinate={center} />
              {mode === "radius" ? <Circle center={center} radius={radiusKm * 1000} strokeColor={colors.accent} fillColor="rgba(35,80,255,0.12)" /> : cities.map((c) => <Marker key={c.placeId} coordinate={{ latitude: c.lat, longitude: c.lng }} pinColor={colors.sun} />)}
            </MapView>
          ) : (
            <Text style={type.caption}>Save your base address to preview your area on the map.</Text>
          )}
        </Card>
        <Notice text={error} />
        <Notice tone="green" text={done} />
      </KeyboardAwareScrollView>
      <SaveBar dirty={dirty} saving={saving} onSave={save} bottomInset={insets.bottom} />
    </View>
  );
}
