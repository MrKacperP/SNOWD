import * as Haptics from "expo-haptics";
import { isObjectionable } from "~/lib/moderation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OperatorServiceArea, PropertySize, ServiceType } from "@/lib/types";
import { addressProblem, geocodeAddress, type AddressValue } from "~/components/AddressFields";
import { PENGUIN } from "~/components/brand";
import { BigButton, ScalePress } from "~/components/kit";
import { ShovelIcon } from "~/components/MapStyle";
import { carsForSize, Driveway, fitLayout, sizeForCars, type CarCount, type DrivewayLayout } from "~/components/onboarding/Driveway";
import { CityPicker, HomeMap } from "~/components/onboarding/MapInputs";
import { clampPrice, OFFERS, PriceSheet, type OfferKey, type SheetPriceKey as PriceKey } from "~/components/onboarding/PriceSheet";
import { OnboardingProgress, StepBody, StepTitle } from "~/components/onboarding/Shell";
import { YardPicker } from "~/components/onboarding/YardPicker";
import { Icon } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { db } from "~/lib/firebase";
import { usePriceAdvice } from "~/lib/priceAdvice";
import { ds, family } from "~/lib/theme";

type Role = "client" | "operator";
type StepId = "role" | "you" | "home" | "driveway" | "clear" | "base" | "cities" | "prices";
/** Five screens each. The place and the work come first; name and phone are the last thing asked. */
const FLOW: Record<Role, StepId[]> = {
  client: ["role", "home", "driveway", "clear", "you"],
  operator: ["role", "base", "cities", "prices", "you"],
};
const LABELS: Record<StepId, string> = { role: "Getting started", you: "About you", home: "Your home", driveway: "Your driveway", clear: "What to clear", base: "Your base", cities: "Where you work", prices: "Your prices" };

const RADIUS_KM = 15;
const LAYOUT_WORDS: Record<DrivewayLayout, string> = { "side-by-side": "side by side", "end-to-end": "in a line", mixed: "two + one" };
const AREA_WORDS: { key: ServiceType; label: string }[] = [
  { key: "driveway", label: "Driveway" },
  { key: "porch", label: "Walkway" },
  { key: "sidewalk", label: "Sidewalk" },
  { key: "backyard-patio", label: "Patio" },
];

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
  const [cars, setCars] = useState<CarCount>(carsForSize("medium"));
  const [layout, setLayout] = useState<DrivewayLayout>("side-by-side");
  const [services, setServices] = useState<ServiceType[]>(["driveway"]);
  const [cities, setCities] = useState<OperatorServiceArea[]>([]);
  const [prices, setPrices] = useState<Record<PriceKey, number>>({ small: 35, medium: 50, large: 70, sidewalk: 20, porch: 20, backyardPatio: 25 });
  const [offer, setOffer] = useState<Record<OfferKey, boolean>>({ driveway: true, porch: true, sidewalk: true, "backyard-patio": false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Which way the last move went, so the next screen slides in from that side.
  const [dir, setDir] = useState<1 | -1>(1);
  // Name and phone show their own complaints, under each box, once Continue has been tried.
  const [checkFields, setCheckFields] = useState(false);
  const phoneRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Any change to an answer clears the last complaint.
  useEffect(() => setError(""), [name, phone, home, services, cities, offer]);

  const flow = FLOW[role || "client"];
  const id = flow[step];
  const size: PropertySize = sizeForCars(cars);

  // Local price suggestions, once we know where the operator is based. Used as the starting prices
  // until the operator turns the dial themselves.
  const advice = usePriceAdvice({ uid: role === "operator" && Number.isFinite(home.lat) ? user?.uid : undefined, lat: home.lat, lng: home.lng });
  const touchedPrices = useRef(false);
  useEffect(() => {
    if (!advice || touchedPrices.current) return;
    setPrices({ ...advice.prices, porch: advice.prices.sidewalk });
  }, [advice]);
  const suggestedFor = (key: PriceKey) => (advice ? (key === "porch" ? advice.prices.sidewalk : advice.prices[key]) : undefined);

  const setPrice = (key: PriceKey, v: number) => {
    touchedPrices.current = true;
    setPrices((p) => (p[key] === v ? p : { ...p, [key]: clampPrice(v) }));
  };


  // Sign in with Apple already offers a name, so it's never asked for again as a requirement (App Review 4.8).
  const appleUser = !!user?.providerData.some((p) => p.providerId === "apple.com");
  const nameOptional = appleUser;
  // Customers can reach their shoveler in chat, so a phone number is only required from shovelers.
  const phoneOptional = role !== "operator";
  const digits = phone.replace(/\D/g, "").length;
  const nameProblem = isObjectionable(name) ? "Please use your real name." : name.trim() || nameOptional ? "" : "Tell us your name.";
  const phoneProblem = digits === 10 || (phoneOptional && digits === 0) ? "" : "Enter a 10-digit phone number.";

  const problemFor = (s: StepId): string => {
    if (s === "role" && !role) return "Pick one to get started.";
    if (s === "you") return nameProblem || phoneProblem;
    if (s === "home" || s === "base") return addressProblem(home);
    if (s === "clear" && !services.length) return "Tap at least one spot to clear.";
    if (s === "prices" && !Object.values(offer).some(Boolean)) return "Offer at least one service.";
    return "";
  };

  const next = () => {
    const problem = problemFor(id);
    if (problem) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // The contact boxes say what's wrong themselves; other screens get one line under the content.
      if (id === "you") return setCheckFields(true);
      return setError(problem);
    }
    setError("");
    if (step === flow.length - 1) return void finish();
    setDir(1);
    setStep(step + 1);
  };

  const back = () => {
    setError("");
    if (step === 0) return void signOut();
    setDir(-1);
    setStep(step - 1);
  };

  /** Jumps back to an earlier answer from the summary on the last screen. */
  const edit = (target: StepId) => {
    const i = flow.indexOf(target);
    if (i < 0) return;
    void Haptics.selectionAsync();
    setError("");
    setDir(-1);
    setStep(i);
  };

  /** Picks a role. Nothing moves on until Continue confirms it. */
  const pickRole = (value: Role) => {
    setRole(value);
    setError("");
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
          ? { ...base, accountApproved: true, idVerified: true, verificationStatus: "approved", simplifiedMode: false, propertyDetails: { propertySize: size, drivewayLayout: fitLayout(cars, layout), serviceTypes: services, specialInstructions: "" }, savedOperators: [], jobHistory: [] }
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
    role: ["How will you use SNOWD?", "Pick one. Setup takes about a minute."],
    you: ["Almost done", role === "operator" ? "So customers know who’s coming." : "So your shoveler can reach you."],
    home: ["Where should we clear snow?"],
    base: ["Where do you head out from?", "Customers never see your exact address."],
    driveway: ["How big is your driveway?"],
    clear: ["What should we clear?", "You can change this for any booking."],
    cities: ["Where will you work?", cities.length ? undefined : `Or skip to take jobs within ${RADIUS_KM} km.`],
    prices: ["Your prices", "Per visit. You can change these later."],
  };
  // The last screen recaps every earlier answer, each one a tap away from being changed.
  const offeredNow = OFFERS.filter((o) => offer[o.key]);
  const summary: SummaryRow[] =
    role === "operator"
      ? [
          { step: "base", icon: "mappin.and.ellipse", label: "Base", value: [home.address, home.city].filter(Boolean).join(", ") || "Not set" },
          { step: "cities", icon: "map.fill", label: "Area", value: cities.length ? `${cities.slice(0, 2).map((c) => c.city).join(", ")}${cities.length > 2 ? ` +${cities.length - 2}` : ""}` : `Within ${RADIUS_KM} km` },
          { step: "prices", icon: "dollarsign.circle.fill", label: "Services", value: `${offeredNow.map((o) => o.label).join(", ") || "None"}${offer.driveway ? ` · from $${prices.small}` : ""}` },
        ]
      : [
          { step: "home", icon: "house.fill", label: "Home", value: [home.address, home.city].filter(Boolean).join(", ") || "Not set" },
          { step: "driveway", icon: "car.fill", label: "Driveway", value: `${cars === 3 ? "3+" : cars} ${cars === 1 ? "car" : "cars"}${cars > 1 ? ` · ${LAYOUT_WORDS[fitLayout(cars, layout)]}` : ""}` },
          { step: "clear", icon: "snowflake", label: "Clearing", value: AREA_WORDS.filter((a) => services.includes(a.key)).map((a) => a.label).join(", ") || "Nothing yet" },
        ];
  const last = step === flow.length - 1;
  const cta = last
    ? "Finish setup"
    : id === "role" && role
      ? `Continue as ${role === "operator" ? "a shoveler" : "a homeowner"}`
      : id === "cities" && !cities.length
        ? "Skip for now"
        : "Continue";

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: 6 }}>
        <OnboardingProgress segment={step} total={flow.length} label={LABELS[id]} onBack={back} backLabel={step > 0 ? "Back to the previous question" : "Sign out"} />
      </View>
      <KeyboardAwareScrollView
        bottomOffset={110}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 22, paddingHorizontal: 24, paddingBottom: 28 }}
      >
        <StepBody id={`${role}-${id}`} dir={dir}>
          {/* The first question comes from the penguin, in a speech bubble; the rest are plain titles. */}
          {id === "role" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Image source={PENGUIN} style={{ width: 84, height: 90 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              <View style={styles.bubble}>
                <View style={styles.bubbleTail} />
                <Text accessibilityRole="header" style={styles.bubbleTitle} maxFontSizeMultiplier={1.4}>{say.role[0]}</Text>
                <Text style={styles.bubbleSub} maxFontSizeMultiplier={1.5}>{say.role[1]}</Text>
              </View>
            </View>
          ) : (
            <StepTitle title={say[id][0]} sub={say[id][1]} />
          )}

          {id === "role" ? (
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12 }}>
              <RoleCard
                selected={role === "client"}
                title="I need snow cleared"
                art={<Icon name="house.fill" size={46} color={ds.accent} />}
                tint={ds.accentSoft}
                points={["Local shovelers", "Live updates", "Rate every job"]}
                onPress={() => pickRole("client")}
              />
              <RoleCard
                selected={role === "operator"}
                title="I clear snow"
                art={<ShovelIcon size={48} color={ds.sunText} />}
                tint={ds.sunSoft}
                points={["Jobs near you", "Your own prices", "Paid per job"]}
                onPress={() => pickRole("operator")}
              />
            </View>
          ) : null}

          {id === "you" ? (
            <View style={{ gap: 14 }}>
              <BigInput
                label={nameOptional ? "Your name (optional)" : "Your name"}
                value={name}
                onChangeText={setName}
                placeholder="First and last name"
                textContentType="name"
                autoComplete="name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                autoFocus={!name && !nameOptional}
                valid={!nameProblem}
                problem={checkFields ? nameProblem : ""}
              />
              <BigInput
                ref={phoneRef}
                label={phoneOptional ? "Phone (optional)" : "Phone"}
                value={phone}
                onChangeText={(t) => setPhone(formatPhone(t))}
                placeholder="416 555 0100"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                prefix="🇨🇦 +1"
                returnKeyType="done"
                onSubmitEditing={next}
                valid={!phoneProblem}
                problem={checkFields ? phoneProblem : ""}
              />
              <Summary rows={summary} onEdit={edit} />
            </View>
          ) : null}

          {id === "home" || id === "base" ? <HomeMap value={home} onChange={setHome} /> : null}

          {id === "driveway" ? <Driveway
              cars={cars}
              layout={layout}
              onChange={(n, l) => {
                setCars(n);
                setLayout(l);
              }}
            /> : null}

          {id === "clear" ? <YardPicker value={services} onChange={setServices} cars={cars} layout={fitLayout(cars, layout)} /> : null}

          {id === "cities" ? <CityPicker base={Number.isFinite(home.lat) ? { lat: home.lat!, lng: home.lng! } : null} value={cities} onChange={setCities} /> : null}

          {id === "prices" ? (
            <PriceSheet
              compact
              prices={prices}
              offer={offer}
              suggested={advice?.local ? suggestedFor : undefined}
              nearby={advice?.local ? advice.count : 0}
              onPrice={setPrice}
              onOffer={(key) => setOffer((o) => ({ ...o, [key]: !o[key] }))}
              onUseSuggested={() => {
                if (!advice) return;
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                touchedPrices.current = true;
                setPrices({ ...advice.prices, porch: advice.prices.sidewalk });
              }}
            />
          ) : null}

          {error ? (
            <Animated.Text key={error} entering={reduce ? undefined : FadeIn.duration(180)} accessibilityRole="alert" style={styles.error}>
              {error}
            </Animated.Text>
          ) : null}
        </StepBody>
      </KeyboardAwareScrollView>

      {/* Every step, the first one included, moves on only when Continue is pressed. */}
      <KeyboardStickyView offset={{ opened: insets.bottom - 12 }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <BigButton title={cta} icon={last ? "checkmark" : undefined} variant={last ? "primary" : "dark"} loading={saving} onPress={next} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

/**
 * One of the two choices on the first question: a tinted panel with big art, the choice in a few
 * words, and three short reasons. Tapping selects it (blue ring and tick); Continue confirms.
 */
function RoleCard({ selected, title, art, tint, points, onPress }: { selected: boolean; title: string; art: React.ReactNode; tint: string; points: string[]; onPress: () => void }) {
  return (
    <ScalePress haptic="selection" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${title}. ${points.join(", ")}`} onPress={onPress} style={[styles.roleCard, selected && styles.roleCardOn]}>
      <View style={[styles.roleArt, { backgroundColor: tint }]}>
        {art}
        <View style={[styles.roleCheck, !selected && styles.roleCheckOff]}>{selected ? <Icon name="checkmark" size={13} color="#fff" weight="bold" /> : null}</View>
      </View>
      <View style={{ gap: 10, padding: 14, paddingTop: 12 }}>
        <Text style={styles.roleTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>{title}</Text>
        <View style={{ gap: 6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {points.map((point) => (
            <View key={point} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="checkmark.circle.fill" size={14} color={selected ? ds.accent : ds.mint} />
              <Text style={styles.rolePoint} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={1.3}>{point}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScalePress>
  );
}

type BigInputProps = React.ComponentProps<typeof TextInput> & {
  label: string;
  prefix?: string;
  /** The answer is good: a green tick shows at the end of the box. */
  valid?: boolean;
  /** What's wrong, shown under the box in red. Empty when there's nothing to say yet. */
  problem?: string;
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
};

/**
 * A large text box: the label sits small above, the words you type are big. The border turns blue
 * while you type, red with a reason underneath when the answer won't do, and a green tick appears
 * at the end once it's good.
 */
function BigInput({ label, prefix, valid, problem, ref, ...props }: BigInputProps) {
  const reduce = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const border = problem ? "#d92d20" : focused ? ds.accent : ds.borderSoft;
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.bigInput, { borderColor: border }, focused && !problem && { backgroundColor: "#fbfcff" }]}>
        <Text style={[styles.bigLabel, problem ? { color: "#b42318" } : focused && { color: ds.accent }]}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {prefix ? <Text style={[styles.bigText, { color: ds.ink3 }]}>{prefix}</Text> : null}
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            accessibilityHint={problem || undefined}
            placeholderTextColor="#a3b1ba"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.bigText, { flex: 1, paddingVertical: 2 }]}
            {...props}
          />
          {valid ? (
            <Animated.View entering={reduce ? undefined : FadeIn.duration(160)} style={styles.tick}>
              <Icon name="checkmark" size={12} color="#fff" weight="bold" />
            </Animated.View>
          ) : null}
        </View>
      </View>
      {problem ? (
        <Animated.Text entering={reduce ? undefined : FadeIn.duration(160)} accessibilityRole="alert" style={styles.fieldProblem}>
          {problem}
        </Animated.Text>
      ) : null}
    </View>
  );
}

type SummaryRow = { step: StepId; icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string };

/** Everything answered so far, one row each. Tap a row to go back and change it. */
function Summary({ rows, onEdit }: { rows: SummaryRow[]; onEdit: (step: StepId) => void }) {
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <Text style={styles.summaryLabel}>YOUR SETUP</Text>
      <View style={styles.summary}>
        {rows.map((r, i) => (
          <Pressable
            key={r.step}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}: ${r.value}`}
            accessibilityHint="Go back and change this"
            onPress={() => onEdit(r.step)}
            style={({ pressed }) => [styles.summaryRow, i > 0 && styles.summarySep, pressed && { backgroundColor: ds.bgAlt }]}
          >
            <View style={styles.summaryIcon}>
              <Icon name={r.icon} size={16} color={ds.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryKey}>{r.label}</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{r.value}</Text>
            </View>
            <Text style={styles.summaryEdit}>Edit</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: ds.bg },
  error: { fontSize: 16, lineHeight: 21, color: "#b42318", fontFamily: family.bodySemi, textAlign: "center" },
  bubble: { flex: 1, gap: 4, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: ds.card, borderWidth: 2, borderColor: ds.borderSoft },
  bubbleTail: { position: "absolute", left: -8, top: "50%", marginTop: -7, width: 14, height: 14, backgroundColor: ds.card, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: ds.borderSoft, transform: [{ rotate: "45deg" }] },
  bubbleTitle: { fontSize: 21, lineHeight: 26, color: ds.ink, fontFamily: family.heading, letterSpacing: -0.4 },
  bubbleSub: { fontSize: 15, lineHeight: 20, color: ds.ink3, fontFamily: family.body },
  roleCard: { flex: 1, overflow: "hidden", borderRadius: 24, backgroundColor: ds.card, borderWidth: 2, borderColor: ds.borderSoft, ...ds.cardShadow },
  roleCardOn: { borderColor: ds.accent, ...ds.accentShadow },
  roleArt: { height: 150, alignItems: "center", justifyContent: "center" },
  roleTitle: { fontSize: 18, lineHeight: 22, minHeight: 44, color: ds.ink, fontFamily: family.heading, letterSpacing: -0.3 },
  rolePoint: { flexShrink: 1, fontSize: 14, lineHeight: 18, color: ds.ink2, fontFamily: family.bodyMedium },
  roleCheck: { position: "absolute", top: 10, right: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: ds.accent, alignItems: "center", justifyContent: "center" },
  roleCheckOff: { backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 2, borderColor: ds.border },
  bigInput: { borderRadius: 22, borderWidth: 2, borderColor: ds.borderSoft, backgroundColor: ds.card, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 2 },
  bigLabel: { fontSize: 14, lineHeight: 18, color: ds.ink3, fontFamily: family.bodySemi },
  tick: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#23955a", alignItems: "center", justifyContent: "center" },
  fieldProblem: { fontSize: 15, lineHeight: 20, color: "#b42318", fontFamily: family.bodySemi, paddingHorizontal: 6 },
  summaryLabel: { fontSize: 12, letterSpacing: 0.8, color: ds.ink3, fontFamily: family.bodyBold, paddingHorizontal: 4 },
  summary: { backgroundColor: ds.card, borderRadius: 20, borderWidth: 1, borderColor: ds.borderSoft, overflow: "hidden" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  summarySep: { borderTopWidth: 1, borderTopColor: ds.borderSoft },
  summaryIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: ds.accentSoft, alignItems: "center", justifyContent: "center" },
  summaryKey: { fontSize: 13, lineHeight: 17, color: ds.ink3, fontFamily: family.bodySemi },
  summaryValue: { fontSize: 16, lineHeight: 21, color: ds.ink, fontFamily: family.bodySemi },
  summaryEdit: { fontSize: 15, color: ds.accent, fontFamily: family.bodyBold },
  bigText: { fontSize: 26, lineHeight: 34, color: ds.ink, fontFamily: family.headingSemi, letterSpacing: -0.3 },
});
