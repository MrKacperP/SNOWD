import * as Haptics from "expo-haptics";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown, useReducedMotion, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OperatorServiceArea, PropertySize, ServiceType } from "@/lib/types";
import { addressProblem, geocodeAddress, type AddressValue } from "~/components/AddressFields";
import { Snowfall } from "~/components/brand";
import { BigButton, ScalePress } from "~/components/kit";
import { ShovelIcon } from "~/components/MapStyle";
import { CAR_COLOURS, carsForSize, Driveway, sizeForCars, type ParkedCar } from "~/components/onboarding/Driveway";
import { CityPicker, HomeMap } from "~/components/onboarding/MapInputs";
import { DIAL_MAX, DIAL_MIN, PriceDial } from "~/components/onboarding/PriceDial";
import { Mascot, OnboardingProgress, StepBody } from "~/components/onboarding/Shell";
import { YardPicker } from "~/components/onboarding/YardPicker";
import { Icon } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { db } from "~/lib/firebase";
import { usePriceAdvice } from "~/lib/priceAdvice";
import { ds, family, tap } from "~/lib/theme";

type Role = "client" | "operator";
type StepId = "role" | "you" | "home" | "driveway" | "clear" | "base" | "cities" | "prices";
/** Five screens each, one per colour of the work-order bar. */
const FLOW: Record<Role, StepId[]> = {
  client: ["role", "you", "home", "driveway", "clear"],
  operator: ["role", "you", "base", "cities", "prices"],
};
const LABELS: Record<StepId, string> = { role: "Getting started", you: "About you", home: "Your home", driveway: "Your driveway", clear: "What to clear", base: "Your base", cities: "Where you work", prices: "Your prices" };

type PriceKey = "small" | "medium" | "large" | "sidewalk" | "porch" | "backyardPatio";
type OfferKey = "driveway" | "porch" | "sidewalk" | "backyard-patio";
const OFFERS: { key: OfferKey; label: string }[] = [
  { key: "driveway", label: "Driveway" },
  { key: "porch", label: "Porch" },
  { key: "sidewalk", label: "Sidewalk" },
  { key: "backyard-patio", label: "Patio" },
];
const CAR_SIZES: { key: "small" | "medium" | "large"; cars: number; label: string }[] = [
  { key: "small", cars: 1, label: "1 car" },
  { key: "medium", cars: 2, label: "2 cars" },
  { key: "large", cars: 3, label: "3+ cars" },
];
const RADIUS_KM = 15;

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { user, signOut } = useAuth();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");
  const [home, setHome] = useState<AddressValue>({ address: "", city: "", province: "ON", postalCode: "", lat: null, lng: null });
  const [cars, setCars] = useState<ParkedCar[]>(() => Array.from({ length: carsForSize("medium") }, (_, i) => ({ id: i, colour: CAR_COLOURS[i] })));
  const [services, setServices] = useState<ServiceType[]>(["driveway"]);
  const [cities, setCities] = useState<OperatorServiceArea[]>([]);
  const [prices, setPrices] = useState<Record<PriceKey, number>>({ small: 35, medium: 50, large: 70, sidewalk: 20, porch: 20, backyardPatio: 25 });
  const [offer, setOffer] = useState<Record<OfferKey, boolean>>({ driveway: true, porch: true, sidewalk: true, "backyard-patio": false });
  const [priceTab, setPriceTab] = useState<OfferKey>("driveway");
  const [carSize, setCarSize] = useState<"small" | "medium" | "large">("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const phoneRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Any change to an answer clears the last complaint.
  useEffect(() => setError(""), [name, phone, home, services, cities, offer]);

  const flow = FLOW[role || "client"];
  const id = flow[step];
  const size: PropertySize = sizeForCars(cars.length);

  // Local price suggestions, once we know where the operator is based. Used as the starting prices
  // until the operator turns the dial themselves.
  const advice = usePriceAdvice({ uid: role === "operator" && Number.isFinite(home.lat) ? user?.uid : undefined, lat: home.lat, lng: home.lng });
  const touchedPrices = useRef(false);
  useEffect(() => {
    if (!advice || touchedPrices.current) return;
    setPrices({ ...advice.prices, porch: advice.prices.sidewalk });
  }, [advice]);
  const suggestedFor = (key: PriceKey) => (advice ? (key === "porch" ? advice.prices.sidewalk : advice.prices[key]) : undefined);

  const priceKey: PriceKey = priceTab === "driveway" ? carSize : priceTab === "porch" ? "porch" : priceTab === "sidewalk" ? "sidewalk" : "backyardPatio";
  const setPrice = (key: PriceKey, v: number) => {
    touchedPrices.current = true;
    setPrices((p) => (p[key] === v ? p : { ...p, [key]: Math.min(DIAL_MAX, Math.max(DIAL_MIN, v)) }));
  };

  const first = name.trim().split(/\s+/)[0];

  const problemFor = (s: StepId): string => {
    if (s === "role" && !role) return "Pick one to get started.";
    if (s === "you") {
      if (!name.trim()) return "Tell us your name.";
      if (phone.replace(/\D/g, "").length < 10) return "Enter a 10-digit phone number.";
    }
    if (s === "home" || s === "base") return addressProblem(home);
    if (s === "clear" && !services.length) return "Tap at least one spot to clear.";
    if (s === "prices" && !Object.values(offer).some(Boolean)) return "Offer at least one service.";
    return "";
  };

  const next = () => {
    const problem = problemFor(id);
    if (problem) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return setError(problem);
    }
    setError("");
    if (step === flow.length - 1) return void finish();
    setStep(step + 1);
  };

  const back = () => {
    setError("");
    if (step > 0) setStep(step - 1);
    else void signOut();
  };

  const pickRole = (value: Role) => {
    setRole(value);
    setError("");
    // A friendly beat, then on to the next question.
    setTimeout(() => setStep(1), reduce ? 0 : 420);
  };

  const finish = async () => {
    if (!user || !role) return;
    setSaving(true);
    try {
      const location = await geocodeAddress(home);
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
        province: home.province,
        city: home.city.trim(),
        postalCode: home.postalCode.trim().toUpperCase(),
        address: home.address.trim(),
        isOnline: true,
        themePreference: "light" as const,
        emailNotifications: { account: true, workOrders: true },
        age: null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      };
      const offered = OFFERS.filter((o) => offer[o.key]).map((o) => o.key) as ServiceType[];
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
              serviceRadius: RADIUS_KM,
              serviceAreaMode: cities.length ? "cities" : "radius",
              serviceAreas: cities,
              serviceTypes: offered,
              pricing: {
                driveway: { small: prices.small, medium: prices.medium, large: prices.large },
                walkway: prices.sidewalk,
                sidewalk: prices.sidewalk,
                backyardPatio: prices.backyardPatio,
                porch: prices.porch,
              },
              rating: 0,
              reviewCount: 0,
              verified: false,
              availability: {},
              activeJobs: [],
              completedJobs: 0,
            },
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void api("/api/email/welcome", {}).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save your profile. Try again.");
      setSaving(false);
    }
  };

  const say: Record<StepId, [string, string?]> = {
    role: ["Welcome to SNOWD! How will you use it?", "Pick one. Setup takes about a minute."],
    you: first ? [`Nice to meet you, ${first}!`, "What’s the best number to reach you?"] : ["Hi there! What’s your name?", "This is how people will know you."],
    home: ["Where should we clear snow?", "Move the map to your door, or type your address."],
    base: ["Where do you head out from?", "Customers never see your exact address."],
    driveway: ["How many cars fit in your driveway?", "Park them to match. This sets your price."],
    clear: ["What should we clear?", "Tap each snowy spot you want cleared."],
    cities: ["Which cities will you work in?", cities.length ? `${cities.length} picked. Tap more, or tap one again to remove it.` : `Tap the cities near you. Skip to take jobs within ${RADIUS_KM} km of home.`],
    prices: ["What do you charge?", advice?.local ? `Shovelers near you charge about $${suggestedFor(priceKey)} for this.` : "Turn the dial to set a price. You can change it any time."],
  };
  const last = step === flow.length - 1;
  const cta = last ? "Finish setup" : id === "cities" && !cities.length ? "Skip for now" : "Continue";

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: 360 }]}>
        <Snowfall count={12} height={360} color="#d6e3ff" />
      </View>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: 6 }}>
        <OnboardingProgress segment={step} label={LABELS[id]} onBack={back} backLabel={step > 0 ? "Back to the previous question" : "Sign out"} />
      </View>
      <KeyboardAwareScrollView
        bottomOffset={110}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={id !== "prices"}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 18, paddingHorizontal: 24, paddingBottom: id === "prices" ? 0 : 28 }}
      >
        <StepBody id={`${role}-${id}`}>
          <Mascot say={say[id][0]} sub={say[id][1]} />

          {id === "role" ? (
            <View accessibilityRole="radiogroup" style={{ gap: 14 }}>
              <RoleTile selected={role === "client"} title="I need snow cleared" body="Book a trusted local shoveler for your home." art={<Icon name="house.fill" size={34} color={ds.accent} />} onPress={() => pickRole("client")} />
              <RoleTile selected={role === "operator"} title="I clear snow" body="Get jobs nearby and get paid for every one." art={<ShovelIcon size={36} color={ds.accent} />} onPress={() => pickRole("operator")} />
            </View>
          ) : null}

          {id === "you" ? (
            <View style={{ gap: 16 }}>
              <BigInput label="Your name" value={name} onChangeText={setName} placeholder="First and last name" textContentType="name" autoComplete="name" returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} autoFocus={!name} />
              {first ? (
                <Animated.View entering={reduce ? FadeIn : FadeInDown.springify().damping(16)}>
                  <BigInput ref={phoneRef} label="Phone" value={phone} onChangeText={(t) => setPhone(formatPhone(t))} placeholder="416 555 0100" keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" prefix="+1" />
                </Animated.View>
              ) : null}
            </View>
          ) : null}

          {id === "home" || id === "base" ? <HomeMap value={home} onChange={setHome} /> : null}

          {id === "driveway" ? <Driveway cars={cars} onChange={setCars} /> : null}

          {id === "clear" ? <YardPicker value={services} onChange={setServices} /> : null}

          {id === "cities" ? <CityPicker base={Number.isFinite(home.lat) ? { lat: home.lat!, lng: home.lng! } : null} value={cities} onChange={setCities} /> : null}

          {id === "prices" ? (
            <View style={{ flex: 1, gap: 16 }}>
              <View style={styles.tabs}>
                {OFFERS.map((o) => {
                  const on = priceTab === o.key;
                  const amount = o.key === "driveway" ? prices[carSize] : o.key === "porch" ? prices.porch : o.key === "sidewalk" ? prices.sidewalk : prices.backyardPatio;
                  return (
                    <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${o.label}, ${offer[o.key] ? `$${amount}` : "not offered"}`} onPress={() => { void Haptics.selectionAsync(); setPriceTab(o.key); }} style={[styles.tab, on && styles.tabOn]}>
                      <Text style={[styles.tabLabel, on && { color: "#fff" }]} numberOfLines={1}>{o.label}</Text>
                      <Text style={[styles.tabPrice, on && { color: "rgba(255,255,255,0.85)" }, !offer[o.key] && { textDecorationLine: "line-through" }]}>{offer[o.key] ? `$${amount}` : "Off"}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {priceTab === "driveway" ? (
                <View style={styles.sizes}>
                  {CAR_SIZES.map((s) => (
                    <ScalePress key={s.key} accessibilityLabel={`${s.label}, $${prices[s.key]}`} accessibilityState={{ selected: carSize === s.key }} onPress={() => setCarSize(s.key)} style={[styles.size, carSize === s.key && styles.sizeOn]}>
                      <View style={{ flexDirection: "row", gap: 2, height: 20, alignItems: "center" }}>
                        {Array.from({ length: s.cars }, (_, i) => (
                          <Icon key={i} name="car.fill" size={15} color={carSize === s.key ? ds.accent : "#9fb0bb"} />
                        ))}
                      </View>
                      <Text style={[styles.sizeText, carSize === s.key && { color: ds.accent }]}>{s.label}</Text>
                    </ScalePress>
                  ))}
                </View>
              ) : null}

              <View style={styles.priceRow}>
                <RoundButton icon="minus" label="Lower the price by $1" disabled={!offer[priceTab]} onPress={() => setPrice(priceKey, prices[priceKey] - 1)} />
                <View style={{ flex: 1, alignItems: "center" }}>
                  {offer[priceTab] ? (
                    <Animated.Text key={priceTab + carSize} entering={reduce ? undefined : ZoomIn.springify().damping(14)} style={styles.bigPrice} maxFontSizeMultiplier={1.2}>
                      ${prices[priceKey]}
                    </Animated.Text>
                  ) : (
                    <Text style={[styles.bigPrice, { color: ds.ink3, fontSize: 30, lineHeight: 72 }]}>Not offered</Text>
                  )}
                  {offer[priceTab] ? <Text style={styles.perVisit}>per visit</Text> : null}
                </View>
                <RoundButton icon="plus" label="Raise the price by $1" disabled={!offer[priceTab]} onPress={() => setPrice(priceKey, prices[priceKey] + 1)} />
              </View>

              <View style={styles.offerRow}>
                {offer[priceTab] && suggestedFor(priceKey) && suggestedFor(priceKey) !== prices[priceKey] ? (
                  <Pill icon="sparkles" label={`Use $${suggestedFor(priceKey)}`} onPress={() => setPrice(priceKey, suggestedFor(priceKey)!)} />
                ) : null}
                <Pill
                  icon={offer[priceTab] ? "xmark" : "plus"}
                  label={offer[priceTab] ? "I don’t offer this" : "Offer this"}
                  tone={offer[priceTab] ? "plain" : "accent"}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setOffer((o) => ({ ...o, [priceTab]: !o[priceTab] }));
                  }}
                />
              </View>

              <View style={{ marginTop: "auto" }}>
                <PriceDial value={prices[priceKey]} onChange={(v) => setPrice(priceKey, v)} suggested={suggestedFor(priceKey)} disabled={!offer[priceTab]} />
              </View>
            </View>
          ) : null}

          {error ? (
            <Animated.Text key={error} entering={reduce ? FadeIn : FadeInDown.springify()} accessibilityRole="alert" style={styles.error}>
              {error}
            </Animated.Text>
          ) : null}
        </StepBody>
      </KeyboardAwareScrollView>

      {id !== "role" ? (
        <KeyboardStickyView offset={{ opened: insets.bottom - 12 }}>
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <BigButton title={cta} icon={last ? "checkmark" : undefined} variant={last ? "primary" : "dark"} loading={saving} onPress={next} />
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

/** A big choice card for the first question. */
function RoleTile({ selected, title, body, art, onPress }: { selected: boolean; title: string; body: string; art: React.ReactNode; onPress: () => void }) {
  return (
    <ScalePress haptic="medium" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${title}. ${body}`} onPress={onPress} style={[styles.roleTile, selected && styles.roleTileOn]}>
      <View style={[styles.roleArt, selected && { backgroundColor: "#fff" }]}>{art}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleBody}>{body}</Text>
      </View>
      {selected ? (
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.roleCheck}>
          <Icon name="checkmark" size={14} color="#fff" weight="bold" />
        </Animated.View>
      ) : (
        <Icon name="chevron.right" size={16} color={ds.ink3} weight="bold" />
      )}
    </ScalePress>
  );
}

type BigInputProps = React.ComponentProps<typeof TextInput> & { label: string; prefix?: string; ref?: React.Ref<React.ComponentRef<typeof TextInput>> };

/** A large, calm text box: the label sits small above, the words you type are big. */
function BigInput({ label, prefix, ref, ...props }: BigInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.bigInput, focused && { borderColor: ds.accent, backgroundColor: "#fbfcff" }]}>
      <Text style={styles.bigLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {prefix ? <Text style={[styles.bigText, { color: ds.ink3 }]}>{prefix}</Text> : null}
        <TextInput ref={ref} accessibilityLabel={label} placeholderTextColor="#a3b1ba" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[styles.bigText, { flex: 1, paddingVertical: 2 }]} {...props} />
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress, disabled }: { icon: "plus" | "minus"; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <ScalePress accessibilityLabel={label} disabled={disabled} depthScale={0.9} onPress={onPress} style={styles.round}>
      <Icon name={icon} size={18} color={ds.ink} weight="bold" />
    </ScalePress>
  );
}

function Pill({ icon, label, onPress, tone = "plain" }: { icon: "sparkles" | "xmark" | "plus"; label: string; onPress: () => void; tone?: "plain" | "accent" }) {
  return (
    <ScalePress accessibilityLabel={label} onPress={onPress} style={[styles.pill, tone === "accent" && { backgroundColor: ds.accent, borderColor: ds.accent }]}>
      <Icon name={icon} size={13} color={tone === "accent" ? "#fff" : ds.ink2} weight="bold" />
      <Text style={[styles.pillText, tone === "accent" && { color: "#fff" }]}>{label}</Text>
    </ScalePress>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: ds.bg },
  error: { fontSize: 16, lineHeight: 21, color: "#b42318", fontFamily: family.bodySemi, textAlign: "center" },
  roleTile: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderRadius: 24, backgroundColor: ds.card, borderWidth: 2, borderColor: ds.borderSoft, ...ds.cardShadow },
  roleTileOn: { borderColor: ds.accent, backgroundColor: ds.accentSoft },
  roleArt: { width: 68, height: 68, borderRadius: 22, backgroundColor: ds.accentSoft, alignItems: "center", justifyContent: "center" },
  roleTitle: { fontSize: 20, lineHeight: 25, color: ds.ink, fontFamily: family.heading, letterSpacing: -0.3 },
  roleBody: { fontSize: 15, lineHeight: 20, color: ds.ink3, fontFamily: family.body },
  roleCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center" },
  bigInput: { borderRadius: 22, borderWidth: 2, borderColor: ds.borderSoft, backgroundColor: ds.card, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 2 },
  bigLabel: { fontSize: 14, lineHeight: 18, color: ds.ink3, fontFamily: family.bodySemi },
  bigText: { fontSize: 26, lineHeight: 34, color: ds.ink, fontFamily: family.headingSemi, letterSpacing: -0.3 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, minHeight: 58, borderRadius: 18, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabOn: { backgroundColor: ds.ink, borderColor: ds.ink },
  tabLabel: { fontSize: 14, lineHeight: 18, color: ds.ink, fontFamily: family.bodySemi },
  tabPrice: { fontSize: 13, lineHeight: 17, color: ds.ink3, fontFamily: family.bodyMedium, fontVariant: ["tabular-nums"] },
  sizes: { flexDirection: "row", gap: 8, alignSelf: "center" },
  size: { alignItems: "center", gap: 2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: "transparent", minWidth: 84, minHeight: tap },
  sizeOn: { borderColor: ds.accentBorder, backgroundColor: ds.accentSoft },
  sizeText: { fontSize: 14, color: ds.ink3, fontFamily: family.bodySemi },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bigPrice: { fontSize: 68, lineHeight: 72, color: ds.ink, fontFamily: family.heading, letterSpacing: -2, fontVariant: ["tabular-nums"] },
  perVisit: { fontSize: 15, color: ds.ink3, fontFamily: family.bodyMedium },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border, alignItems: "center", justifyContent: "center" },
  offerRow: { flexDirection: "row", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: ds.card, borderWidth: 1.5, borderColor: ds.border },
  pillText: { fontSize: 15, color: ds.ink2, fontFamily: family.bodySemi },
});
