import * as Location from "expo-location";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CANADIAN_PROVINCES, SHOVELING_SERVICES, type PropertySize, type ServiceType } from "@/lib/types";
import { Button, Chip, Field, Icon, Notice, OptionCard, StepHeader } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { db } from "~/lib/firebase";
import { colors, space, type } from "~/lib/theme";

type Role = "client" | "operator";
const SIZES: [PropertySize, string, string][] = [
  ["small", "1-car", "Single driveway"],
  ["medium", "2-car", "Double driveway"],
  ["large", "3+ car", "Large driveway"],
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [postalCode, setPostalCode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [size, setSize] = useState<PropertySize>("medium");
  const [services, setServices] = useState<ServiceType[]>(["driveway"]);
  const [radiusKm, setRadiusKm] = useState(10);
  const [prices, setPrices] = useState({ small: "35", medium: "45", large: "60", sidewalk: "15", backyardPatio: "25" });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleService = (value: ServiceType) =>
    setServices((list) => (list.includes(value) ? list.filter((s) => s !== value) : [...list, value]));

  const useMyLocation = async () => {
    setError("");
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Allow location access, or type your address below.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      if (place) {
        setAddress([place.streetNumber, place.street].filter(Boolean).join(" "));
        setCity(place.city || place.subregion || "");
        const match = CANADIAN_PROVINCES.find((p) => p.name === place.region || p.code === place.region);
        if (match) setProvince(match.code);
        setPostalCode(place.postalCode || "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t find your location.");
    } finally {
      setLocating(false);
    }
  };

  const validateDetails = () => {
    if (!name.trim()) return "Enter your name.";
    if (phone.replace(/\D/g, "").length < 10) return "Enter a 10-digit phone number.";
    if (!address.trim() || !city.trim()) return "Enter your street address and city.";
    if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(postalCode.trim())) return "Enter a valid Canadian postal code, like M5V 2T6.";
    return "";
  };

  const next = () => {
    setError("");
    if (step === 0 && !role) return setError("Choose how you’ll use SNOWD.");
    if (step === 1) {
      const problem = validateDetails();
      if (problem) return setError(problem);
    }
    if (step === 2) return void finish();
    setStep(step + 1);
  };

  const finish = async () => {
    if (!user || !role) return;
    if (!services.length) return setError("Choose at least one service.");
    setSaving(true);
    try {
      let location = coords;
      if (!location) {
        const [hit] = await Location.geocodeAsync(`${address}, ${city}, ${province} ${postalCode}, Canada`).catch(() => []);
        if (hit) location = { lat: hit.latitude, lng: hit.longitude };
      }
      let accountNumber = 1;
      try {
        const history = await getDoc(doc(db, "accountHistory", encodeURIComponent((user.email || "").trim().toLowerCase())));
        if (history.exists()) accountNumber = ((history.data().deletedAccountIds as string[] | undefined)?.length || 0) + 1;
      } catch {
        /* History is optional and must never block signup. */
      }
      const base = {
        uid: user.uid,
        email: user.email || "",
        accountNumber,
        displayName: name.trim(),
        phone: phone.trim(),
        role,
        createdAt: new Date(),
        onboardingComplete: true,
        province,
        city: city.trim(),
        postalCode: postalCode.trim().toUpperCase(),
        address: address.trim(),
        isOnline: true,
        themePreference: "light" as const,
        emailNotifications: { account: true, workOrders: true },
        age: null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      };
      const n = (value: string) => Math.max(0, Number(value) || 0);
      // Same document shape the website's onboarding writes, so both apps read it identically.
      await setDoc(
        doc(db, "users", user.uid),
        role === "client"
          ? { ...base, accountApproved: true, idVerified: true, verificationStatus: "approved", simplifiedMode: false, propertyDetails: { propertySize: size, serviceTypes: services, specialInstructions: "" }, savedOperators: [], jobHistory: [] }
          : {
              ...base,
              accountApproved: false,
              idVerified: false,
              verificationStatus: "not-submitted",
              businessName: "",
              isStudent: false,
              bio: "",
              equipment: ["Snow Shovel"],
              serviceRadius: radiusKm,
              serviceAreaMode: "radius",
              serviceAreas: [],
              serviceTypes: services,
              pricing: {
                driveway: { small: n(prices.small), medium: n(prices.medium), large: n(prices.large) },
                walkway: n(prices.sidewalk),
                sidewalk: n(prices.sidewalk),
                backyardPatio: n(prices.backyardPatio),
                porch: n(prices.sidewalk),
              },
              rating: 0,
              reviewCount: 0,
              verified: false,
              availability: {},
              activeJobs: [],
              completedJobs: 0,
            },
      );
      void api("/api/email/welcome", {}).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save your profile. Try again.");
      setSaving(false);
    }
  };

  const titles = ["How will you use SNOWD?", "About you", role === "operator" ? "Your services" : "Your property"];
  const intros = [
    "Pick one to get started. Setup takes about two minutes.",
    role === "operator" ? "Customers see your name. Your address sets where you work from." : "Your shoveler needs to know where to go and how to reach you.",
    role === "operator" ? "Choose what you offer and what you charge. You can change all of this later." : "This gives you accurate prices. You can change it later.",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAwareScrollView
        bottomOffset={100}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.xl, paddingBottom: 140, gap: space.lg }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step > 0 ? "Back to the previous step" : "Sign out"}
          hitSlop={8}
          onPress={() => {
            setError("");
            if (step > 0) setStep(step - 1);
            else void signOut();
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start" }}
        >
          {step > 0 ? <Icon name="chevron.left" size={17} color={colors.accent} /> : null}
          <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 17 }}>{step > 0 ? "Back" : "Sign out"}</Text>
        </Pressable>
        <StepHeader step={step} labels={["Your role", "About you", role === "operator" ? "Your services" : "Your property"]} />
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={type.largeTitle}>{titles[step]}</Text>
          <Text style={type.callout}>{intros[step]}</Text>
        </View>

        {step === 0 ? (
          <View accessibilityRole="radiogroup" style={{ gap: space.md }}>
            {(
              [
                ["client", "I need snow cleared", "Book a trusted local shoveler for your driveway and walkways.", "house.fill"],
                ["operator", "I clear snow", "Get jobs nearby, chat with customers and get paid.", "snowflake"],
              ] as const
            ).map(([value, title, body, icon]) => (
              <OptionCard key={value} icon={icon} title={title} body={body} selected={role === value} onPress={() => { setRole(value); setError(""); }} />
            ))}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: space.md }}>
            <Field label="Full name" value={name} onChangeText={setName} textContentType="name" autoComplete="name" />
            <Field label="Phone" placeholder="416 555 0100" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" hint="Shared only with people you book or work with." />
            <View style={{ gap: 6, marginTop: space.sm }}>
              <Text accessibilityRole="header" style={type.headline}>{role === "operator" ? "Where you work from" : "Where should we clear snow?"}</Text>
              <Text style={type.caption}>Tap the button to fill this in for you, or type it below.</Text>
            </View>
            <Button title="Use my current location" icon="location.fill" variant="secondary" loading={locating} onPress={useMyLocation} />
            <Field label="Street address" value={address} onChangeText={(v) => { setAddress(v); setCoords(null); }} textContentType="streetAddressLine1" autoComplete="street-address" />
            <Field label="City" value={city} onChangeText={(v) => { setCity(v); setCoords(null); }} textContentType="addressCity" />
            <Field label="Postal code" placeholder="M5V 2T6" value={postalCode} onChangeText={setPostalCode} autoCapitalize="characters" textContentType="postalCode" autoComplete="postal-code" maxLength={7} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>Province</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CANADIAN_PROVINCES.map((p) => (
                <Chip key={p.code} label={p.code} selected={province === p.code} onPress={() => setProvince(p.code)} />
              ))}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: space.md }}>
            {role === "client" ? (
              <>
                <Text accessibilityRole="header" style={type.headline}>How big is your driveway?</Text>
                <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
                  {SIZES.map(([value, label, body]) => (
                    <OptionCard key={value} icon="car.fill" title={label} body={body} selected={size === value} onPress={() => setSize(value)} />
                  ))}
                </View>
              </>
            ) : null}
            <Text accessibilityRole="header" style={[type.headline, { marginTop: space.sm }]}>{role === "operator" ? "Services you offer" : "What should be cleared?"}</Text>
            <Text style={type.caption}>Choose all that apply.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SHOVELING_SERVICES.map(([value, label]) => (
                <Chip key={value} label={label} selected={services.includes(value)} onPress={() => toggleService(value)} />
              ))}
            </View>
            {role === "operator" ? (
              <>
                <Text accessibilityRole="header" style={[type.headline, { marginTop: space.sm }]}>How far will you travel?</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[5, 10, 15, 25, 40].map((km) => (
                    <Chip key={km} label={`${km} km`} selected={radiusKm === km} onPress={() => setRadiusKm(km)} />
                  ))}
                </View>
                <Text accessibilityRole="header" style={[type.headline, { marginTop: space.sm }]}>Your prices per visit</Text>
                <Text style={type.caption}>In Canadian dollars. These are common starting prices; change them to suit you.</Text>
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  {(["small", "medium", "large"] as const).map((k, i) => (
                    <View key={k} style={{ flex: 1 }}>
                      <Field label={["1-car", "2-car", "3+ car"][i]} value={prices[k]} keyboardType="number-pad" onChangeText={(v) => setPrices({ ...prices, [k]: v.replace(/\D/g, "") })} />
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Sidewalk / porch" value={prices.sidewalk} keyboardType="number-pad" onChangeText={(v) => setPrices({ ...prices, sidewalk: v.replace(/\D/g, "") })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Backyard patio" value={prices.backyardPatio} keyboardType="number-pad" onChangeText={(v) => setPrices({ ...prices, backyardPatio: v.replace(/\D/g, "") })} />
                  </View>
                </View>
                <Notice tone="blue" text="One more step after this: verify your ID from the Home tab so customers can find you. You can also connect card payouts there." />
              </>
            ) : null}
          </View>
        ) : null}
        <Notice text={error} />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom - space.md }}>
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: insets.bottom + space.md, backgroundColor: colors.bg, borderTopWidth: 0.5, borderTopColor: colors.border }}>
          <Button title={step === 2 ? "Finish setup" : "Continue"} icon={step === 2 ? "checkmark" : undefined} variant="dark" loading={saving} disabled={step === 0 && !role} onPress={next} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
