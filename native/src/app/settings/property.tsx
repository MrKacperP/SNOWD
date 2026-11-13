import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { propertyUse, type ServiceLocation } from "@/lib/serviceLocations";
import { PROPERTY_USES, SHOVELING_SERVICES, type PropertySize, type PropertyUse, type ServiceType } from "@/lib/types";
import { propertySizeLabel } from "@/lib/workOrders";
import { AddressFields, addressProblem, geocodeAddress, type AddressValue } from "~/components/AddressFields";
import { AutosaveStatus, Button, Card, Chip, Field, Loading, Notice, SaveBar, useAutosave } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { notifyAdmin } from "~/lib/admin";
import { db } from "~/lib/firebase";
import { useProperties } from "~/lib/properties";
import { colors, space, type } from "~/lib/theme";

const SIZES: PropertySize[] = ["small", "medium", "large", "commercial"];

/** Adds or edits the main house (id=home) or one saved property (id=new or its id). */
export default function PropertyEditor() {
  const { id = "new" } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();
  const isHome = id === "home";
  const { properties, loading, update } = useProperties(!isHome);
  const existing = properties.find((p) => p.id === id);

  const [address, setAddress] = useState<AddressValue>({ address: "", city: "", province: profile?.province || "ON", postalCode: "" });
  const told = useRef(false);
  const [size, setSize] = useState<PropertySize>("medium");
  const [label, setLabel] = useState("");
  const [use, setUse] = useState<PropertyUse>("rental");
  const [areaSqft, setAreaSqft] = useState("");
  const [services, setServices] = useState<ServiceType[]>(["driveway"]);
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState("");

  const snapshot = () => JSON.stringify([address.address, address.city, address.province, address.postalCode, size, label, use, areaSqft, services, instructions]);

  // Fill the form once the record it edits is known.
  const filled = useRef(false);
  useEffect(() => {
    if (filled.current) return;
    if (isHome && profile) {
      setAddress({ address: profile.address || "", city: profile.city || "", province: profile.province || "ON", postalCode: profile.postalCode || "", lat: profile.lat ?? null, lng: profile.lng ?? null });
      setSize((profile.propertyDetails?.propertySize as PropertySize) || "medium");
      filled.current = true;
    } else if (!isHome && !loading) {
      if (existing) {
        setAddress({ address: existing.address, city: existing.city, province: existing.province, postalCode: existing.postalCode, lat: existing.lat ?? null, lng: existing.lng ?? null });
        setSize(existing.propertySize || "medium");
        setLabel(existing.label);
        setUse(propertyUse(existing));
        setAreaSqft(existing.areaSqft ? String(existing.areaSqft) : "");
        setServices(existing.serviceTypes?.length ? existing.serviceTypes : ["driveway"]);
        setInstructions(existing.instructions || "");
      }
      filled.current = true;
    }
  }, [isHome, profile, loading, existing]);
  useEffect(() => {
    if (filled.current && !baseline) setBaseline(snapshot());
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = id === "new" || (!!baseline && baseline !== snapshot());

  const location = async (): Promise<ServiceLocation> => {
    const point = await geocodeAddress(address);
    return {
      address: address.address.trim(),
      city: address.city.trim(),
      province: address.province,
      postalCode: address.postalCode.trim().toUpperCase(),
      ...(point ? { lat: point.lat, lng: point.lng } : {}),
      propertySize: size,
    };
  };

  const save = async (auto = false) => {
    setError("");
    const problem = addressProblem(address);
    if (problem) return setError(problem);
    if (!isHome && (!label.trim() || label.trim().length > 60)) return setError("Name this property using up to 60 characters.");
    const area = areaSqft.trim() ? Number(areaSqft) : undefined;
    if (area !== undefined && (!Number.isInteger(area) || area < 1)) return setError("Enter the area as a whole number of square feet.");
    if (instructions.length > 1000) return setError("Keep instructions under 1000 characters.");
    setSaving(true);
    try {
      const loc = await location();
      if (isHome) {
        // Same fields the website's Settings → Properties → Main house saves.
        await updateDoc(doc(db, "users", user!.uid), {
          address: loc.address,
          city: loc.city,
          province: loc.province,
          postalCode: loc.postalCode,
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
          "propertyDetails.propertySize": size,
        });
        // Autosave can save several times; tell the admins once per visit.
        if (!told.current) {
          told.current = true;
          notifyAdmin({ type: "profile_saved", message: `Main house updated by ${profile?.displayName || profile?.email} (${loc.city}, ${loc.province})`, uid: user!.uid, meta: { city: loc.city, province: loc.province } });
        }
      } else {
        await update({
          location: loc,
          label: label.trim(),
          saveFavorite: true,
          select: false,
          ...(existing ? { propertyId: existing.id } : {}),
          details: { use, ...(area ? { areaSqft: area } : {}), serviceTypes: services, instructions: instructions.trim(), ...(existing?.photos ? { photos: existing.photos } : {}) },
        });
      }
      // Autosaved edits stay on the page; adding a new property goes back to the list.
      if (auto) {
        setBaseline(snapshot());
        setSaving(false);
      } else router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save this property. Try again.");
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert(`Remove ${existing?.label}?`, "Past orders at this address aren’t affected.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await update({ removePropertyId: existing!.id });
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn’t remove this property.");
          }
        },
      },
    ]);

  const makeHome = () =>
    Alert.alert("Make this your main house?", "Shovelers will see this address on new bookings. Your current main house isn’t saved automatically.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Make main house",
        onPress: async () => {
          try {
            await update({ location: await location(), makeHome: true, confirmDifferent: true });
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn’t change your main house.");
          }
        },
      },
    ]);

  // Editing an existing property (or your home) saves by itself; a new one is added with its button.
  const autosaves = id !== "new";
  useAutosave(snapshot(), { dirty: autosaves && dirty, save: () => save(true), enabled: autosaves });

  if (!isHome && loading) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: isHome ? "Main house" : existing ? existing.label : "New property" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}>
        {!isHome ? (
          <Card>
            <Field label="Property name" value={label} onChangeText={setLabel} maxLength={60} placeholder="Rental on Elm St" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>What is it?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {PROPERTY_USES.map(([value, text]) => (
                <Chip key={value} label={text} selected={use === value} onPress={() => setUse(value)} />
              ))}
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={type.headline}>Address</Text>
          <AddressFields value={address} onChange={setAddress} />
        </Card>

        <Card>
          <Text style={type.headline}>Driveway size</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SIZES.map((s) => (
              <Chip key={s} label={propertySizeLabel(s)} selected={size === s} onPress={() => setSize(s)} />
            ))}
          </View>
          {!isHome ? (
            <>
              <Field label="Area to clear (sq ft, optional)" value={areaSqft} onChangeText={(v) => setAreaSqft(v.replace(/\D/g, ""))} keyboardType="number-pad" />
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>Usually cleared</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SHOVELING_SERVICES.map(([value, text]) => (
                  <Chip key={value} label={text} selected={services.includes(value)} onPress={() => setServices((list) => (list.includes(value) ? list.filter((s) => s !== value) : [...list, value]))} />
                ))}
              </View>
              <Field label="Instructions for the shoveler (optional)" value={instructions} onChangeText={setInstructions} multiline maxLength={1000} placeholder="Gate code, where to pile snow, pets…" />
            </>
          ) : null}
        </Card>

        <Notice text={error} />
        {existing ? (
          <View style={{ gap: 10 }}>
            <Button title="Make this my main house" icon="house" variant="secondary" onPress={makeHome} />
            <Button title="Remove property" icon="trash" variant="danger" onPress={remove} />
          </View>
        ) : null}
      </KeyboardAwareScrollView>
      {autosaves ? (
        <AutosaveStatus saving={saving} dirty={dirty} error={error} bottomInset={insets.bottom} />
      ) : (
        <SaveBar dirty={dirty} saving={saving} onSave={() => void save()} title="Add property" bottomInset={insets.bottom} />
      )}
    </View>
  );
}
