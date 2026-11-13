import * as Location from "expo-location";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { CANADIAN_PROVINCES } from "@/lib/types";
import { colors, type } from "~/lib/theme";
import { Button, Chip, Field, Notice } from "./ui";

export type AddressValue = { address: string; city: string; province: string; postalCode: string; lat?: number | null; lng?: number | null };

export const POSTAL_CODE = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;

export function addressProblem(value: AddressValue) {
  if (!value.address.trim() || !value.city.trim()) return "Enter the street address and city.";
  if (!value.province) return "Choose a province.";
  if (!POSTAL_CODE.test(value.postalCode.trim())) return "Enter a valid Canadian postal code, like M5V 2T6.";
  return "";
}

/** Finds map coordinates for a typed address so distance and service-area rules work, like the website's address picker. */
export async function geocodeAddress(value: AddressValue): Promise<{ lat: number; lng: number } | null> {
  if (Number.isFinite(value.lat) && Number.isFinite(value.lng)) return { lat: value.lat!, lng: value.lng! };
  const [hit] = await Location.geocodeAsync(`${value.address}, ${value.city}, ${value.province} ${value.postalCode}, Canada`).catch(() => []);
  return hit ? { lat: hit.latitude, lng: hit.longitude } : null;
}

/** Street, city, province and postal code, with a "use my location" shortcut. */
/** Finds the phone's current address (asks for location permission first). */
export async function currentAddress(): Promise<AddressValue> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("Allow location access in Settings, or type your address instead.");
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const [place] = await Location.reverseGeocodeAsync(position.coords);
  const match = CANADIAN_PROVINCES.find((p) => p.name === place?.region || p.code === place?.region);
  return {
    address: place ? [place.streetNumber, place.street].filter(Boolean).join(" ") : "",
    city: place?.city || place?.subregion || "",
    province: match?.code || "ON",
    postalCode: (place?.postalCode || "").toUpperCase(),
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

export function AddressFields({ value, onChange, showLocate = true }: { value: AddressValue; onChange: (next: AddressValue) => void; /** Hide the "Use my current location" button when the screen offers its own. */ showLocate?: boolean }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  // Typing a new address invalidates the coordinates found for the old one.
  const set = (patch: Partial<AddressValue>) => onChange({ ...value, lat: null, lng: null, ...patch });

  const useMyLocation = async () => {
    setError("");
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Allow location access, or type the address below.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      const match = CANADIAN_PROVINCES.find((p) => p.name === place?.region || p.code === place?.region);
      onChange({
        address: place ? [place.streetNumber, place.street].filter(Boolean).join(" ") : value.address,
        city: place?.city || place?.subregion || value.city,
        province: match?.code || value.province,
        postalCode: (place?.postalCode || value.postalCode).toUpperCase(),
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t find your location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {showLocate ? <Button title="Use my current location" icon="location.fill" variant="secondary" small loading={locating} onPress={useMyLocation} /> : null}
      <Notice text={error} />
      <Field label="Street address" value={value.address} onChangeText={(address) => set({ address })} textContentType="streetAddressLine1" autoComplete="street-address" placeholder="123 Maple Ave" />
      <Field label="City" value={value.city} onChangeText={(city) => set({ city })} textContentType="addressCity" placeholder="Mississauga" />
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>Province</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CANADIAN_PROVINCES.map((p) => (
            <Chip key={p.code} label={p.code} selected={value.province === p.code} onPress={() => set({ province: p.code })} />
          ))}
        </ScrollView>
        <Text style={type.caption}>{CANADIAN_PROVINCES.find((p) => p.code === value.province)?.name || "Choose your province"}</Text>
      </View>
      <Field label="Postal code" value={value.postalCode} onChangeText={(postalCode) => set({ postalCode: postalCode.toUpperCase() })} autoCapitalize="characters" maxLength={7} textContentType="postalCode" placeholder="L5B 1M2" />
    </View>
  );
}
