import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OperatorServiceArea } from "@/lib/types";
import { addressProblem, geocodeAddress, type AddressValue } from "~/components/AddressFields";
import { CityPicker, HomeMap } from "~/components/onboarding/MapInputs";
import { AutosaveStatus, Icon, Notice, useAutosave } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { notifyAdmin } from "~/lib/admin";
import { db } from "~/lib/firebase";
import { cityCentre, distanceKm } from "~/lib/canadianCities";
import { ds, family, tap } from "~/lib/theme";

const RADII = [5, 10, 15, 20, 30, 50];

/**
 * Settings → Area: the same pieces as onboarding. Cities near your base are suggested as pins on a
 * mini map and as chips under it; tap to pick them and their borders are drawn. With no city
 * picked, you get jobs within a travel distance of your base instead. Saves on its own.
 */
export default function ServiceAreaSettings() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const initial = () => ({
    home: { address: profile?.address || "", city: profile?.city || "", province: profile?.province || "ON", postalCode: profile?.postalCode || "", lat: profile?.lat ?? null, lng: profile?.lng ?? null } as AddressValue,
    radiusKm: profile?.serviceRadius || 15,
    cities: (profile?.serviceAreaMode === "radius" ? [] : profile?.serviceAreas || []) as OperatorServiceArea[],
  });
  const [home, setHome] = useState(initial().home);
  const [radiusKm, setRadiusKm] = useState(initial().radiusKm);
  const [cities, setCities] = useState(initial().cities);
  const [editingBase, setEditingBase] = useState(!initial().home.address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const owner = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || owner.current === profile.uid) return;
    owner.current = profile.uid;
    const s = initial();
    setHome(s.home);
    setRadiusKm(s.radiusKm);
    setCities(s.cities);
    setEditingBase(!s.home.address);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const o = initial();
  const mode = cities.length ? "cities" : "radius";
  const dirty =
    home.address !== o.home.address || home.city !== o.home.city || home.province !== o.home.province || home.postalCode !== o.home.postalCode || home.lat !== o.home.lat ||
    radiusKm !== o.radiusKm || JSON.stringify(cities.map((c) => c.placeId)) !== JSON.stringify(o.cities.map((c) => c.placeId));

  const save = async () => {
    setError("");
    const problem = addressProblem(home);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      const point = Number.isFinite(home.lat) && Number.isFinite(home.lng) ? { lat: home.lat!, lng: home.lng! } : await geocodeAddress(home);
      await updateDoc(doc(db, "users", user!.uid), {
        address: home.address.trim(),
        city: home.city.trim(),
        province: home.province,
        postalCode: home.postalCode.trim().toUpperCase(),
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
        serviceAreaMode: mode,
        serviceRadius: radiusKm,
        // Stored without the distance the suggestions carry, in the same shape onboarding writes.
        serviceAreas: cities.map(({ placeId, city, province, provinceCode, country, lat, lng }) => ({ placeId, city, province, provinceCode, country, lat, lng })),
      });
      notifyAdmin({ type: "profile_saved", message: `Service area updated by ${profile?.displayName || profile?.email} (${home.city}, ${home.province})`, uid: user!.uid, meta: { city: home.city, province: home.province } });
    } catch {
      setError("Couldn’t save your service area. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  useAutosave({ home, radiusKm, cities }, { dirty, save });

  // Older profiles can have an address without map coordinates: look them up so nearby cities are
  // still suggested. Only used for the map; nothing is saved until something actually changes.
  const [lookedUp, setLookedUp] = useState<{ key: string; lat: number; lng: number } | null>(null);
  const homeKey = [home.address, home.city, home.province, home.postalCode].join("|");
  const missingPoint = !(Number.isFinite(home.lat) && Number.isFinite(home.lng)) && !!home.address.trim() && !!home.city.trim();
  useEffect(() => {
    if (!missingPoint || lookedUp?.key === homeKey) return;
    let cancelled = false;
    void geocodeAddress(home)
      .then((found) => {
        if (cancelled) return;
        // A street the map doesn't know can land in the wrong city; then use the city's centre.
        const centre = cityCentre(home.city, home.province);
        const p = found && (!centre || distanceKm(found, centre) < 60) ? found : centre;
        if (p) setLookedUp({ key: homeKey, lat: p.lat, lng: p.lng });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [missingPoint, homeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = Number.isFinite(home.lat) && Number.isFinite(home.lng) ? { lat: home.lat!, lng: home.lng! } : lookedUp?.key === homeKey ? { lat: lookedUp.lat, lng: lookedUp.lng } : null;
  const homeLine = [home.address, home.city].filter(Boolean).join(", ");

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <Stack.Screen options={{ title: "Service area" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 16, paddingBottom: insets.bottom + 90 }}>
        {/* Where you head out from. */}
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>YOUR BASE</Text>
          {editingBase ? (
            <>
              <HomeMap value={home} onChange={setHome} radiusKm={mode === "radius" ? radiusKm : undefined} />
              {home.address ? (
                <Pressable accessibilityRole="button" onPress={() => setEditingBase(false)} style={({ pressed }) => [styles.done, pressed && { opacity: 0.8 }]}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <View style={styles.baseRow}>
              <View style={styles.baseIcon}>
                <Icon name="house.fill" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.baseTitle} numberOfLines={1}>{homeLine || "Set your base"}</Text>
                <Text style={styles.baseSub}>Customers never see your exact address.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change your base location" hitSlop={8} onPress={() => setEditingBase(true)}>
                <Text style={styles.link}>Change</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Which cities: suggested around the base, picked on the mini map or the chips. */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.label}>WHERE YOU WORK</Text>
            <AutosaveStatus inline saving={saving} dirty={dirty} error={error} />
          </View>
          <Text style={styles.sub}>{cities.length ? `${cities.length} picked. Tap more, or tap one again to remove it.` : "Tap the cities near you."}</Text>
          <CityPicker base={base} value={cities} onChange={setCities} />
        </View>

        {/* No city picked: a travel distance around the base instead. */}
        {!cities.length ? (
          <View style={styles.radius}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="scope" size={18} color={ds.accent} />
              <Text style={[styles.baseTitle, { flex: 1 }]}>{`Jobs within ${radiusKm} km of your base`}</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {RADII.map((r) => {
                const on = r === radiusKm;
                return (
                  <Pressable
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setRadiusKm(r);
                    }}
                    style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { transform: [{ scale: 0.96 }] }]}
                  >
                    <Text style={[styles.chipText, on && { color: "#fff" }]}>{`${r} km`}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <Notice text={error} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, letterSpacing: 0.8, color: ds.ink3, fontFamily: family.bodyBold, paddingHorizontal: 4 },
  sub: { fontSize: 15, lineHeight: 20, color: ds.ink3, fontFamily: family.body, paddingHorizontal: 4 },
  baseRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.borderSoft },
  baseIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center" },
  baseTitle: { fontSize: 16, lineHeight: 21, color: ds.ink, fontFamily: family.bodySemi },
  baseSub: { fontSize: 13, lineHeight: 18, color: ds.ink3, fontFamily: family.body },
  link: { fontSize: 15, color: ds.accent, fontFamily: family.bodyBold },
  done: { alignSelf: "flex-end", minHeight: 40, paddingHorizontal: 18, borderRadius: 12, backgroundColor: ds.ink, alignItems: "center", justifyContent: "center" },
  doneText: { fontSize: 15, color: "#fff", fontFamily: family.bodySemi },
  radius: { gap: 12, padding: 14, borderRadius: 18, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.borderSoft },
  chip: { minHeight: tap, paddingHorizontal: 16, borderRadius: 999, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: ds.accent, borderColor: ds.accent },
  chipText: { fontSize: 16, color: ds.ink, fontFamily: family.bodySemi },
});
