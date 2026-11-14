import { useMarketplacePolicy } from "@/lib/useMarketplacePolicy";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatServiceAddress, profileLocation, type ServiceLocation } from "@/lib/serviceLocations";
import { SHOVELING_SERVICES, type ClientProfile, type OperatorProfile, type ServiceType } from "@/lib/types";
import { Avatar, Button, Chip, Icon, Loading, Notice } from "~/components/ui";
import type { SymbolViewProps } from "expo-symbols";
import { useAuth } from "~/context/auth";
import { api, requestId, API_URL } from "~/lib/api";
import { db } from "~/lib/firebase";
import { money } from "~/lib/format";
import { quoteFor } from "~/lib/operators";
import { useProperties } from "~/lib/properties";
import { colors, radius, space, type } from "~/lib/theme";

type SymbolName = SymbolViewProps["name"];

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  d.setHours(0, 0, 0, 0);
  return d;
});
/** Keep only areas the company clears; if none are left, start with the driveway (or their first area). */
function offeredBy(op: OperatorProfile | null) {
  return SHOVELING_SERVICES.map(([value]) => value as ServiceType).filter((value) => !op?.serviceTypes?.length || op.serviceTypes.includes(value));
}
function fitServices(list: ServiceType[], op: OperatorProfile | null) {
  const allowed = offeredBy(op);
  const kept = list.filter((s) => allowed.includes(s));
  return kept.length ? kept : allowed.includes("driveway") ? ["driveway" as ServiceType] : allowed.slice(0, 1);
}
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);

export default function Book() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { quote: currentQuote, pricingReady, pricingError, refreshPricing } = useMarketplacePolicy(API_URL);
  const [operator, setOperator] = useState<OperatorProfile | null>(null);
  const [services, setServices] = useState<ServiceType[]>((profile?.propertyDetails?.serviceTypes as ServiceType[]) || ["driveway"]);
  const [asap, setAsap] = useState(true);
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState<number | null>(null);
  const [method, setMethod] = useState<"credit" | "cash">("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ key: string; id: string } | null>(null);
  const home = profileLocation(profile as Partial<ClientProfile> | null);
  // Book at the main house or any saved property, as on the website.
  const { properties } = useProperties(profile?.role === "client");
  const [placeId, setPlaceId] = useState("home");
  const place = properties.find((p) => p.id === placeId);
  const location: ServiceLocation | null = place
    ? { address: place.address, city: place.city, province: place.province, postalCode: place.postalCode, ...(place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : {}), propertySize: place.propertySize || "medium" }
    : home;

  useEffect(() => {
    if (!uid) return;
    void getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) return;
      const op = { ...snap.data(), uid: snap.id } as OperatorProfile;
      setOperator(op);
      setServices((list) => fitServices(list, op));
      if (quoteFor(op, profile).card) setMethod("credit");
    });
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const offered = useMemo(() => SHOVELING_SERVICES.filter(([value]) => !operator?.serviceTypes?.length || operator.serviceTypes.includes(value)), [operator]);
  if (!operator) return <Loading />;


  const quote = quoteFor(operator, place ? { ...profile!, propertyDetails: { ...profile?.propertyDetails, propertySize: location?.propertySize || "medium" } } as typeof profile : profile, services);
  const total = currentQuote(quote.base, method).price;
  const now = new Date();
  const hoursForDay = HOURS.filter((h) => day > 0 || h > now.getHours());

  const submit = async () => {
    setError("");
    if (!pricingReady) { void refreshPricing(); return setError(pricingError || "Loading current fees. Try again in a moment."); }
    if (!location) return setError("Add your home address in Profile → Properties before booking.");
    if (!services.length) return setError("Choose at least one area to clear.");
    if (!asap && hour == null) return setError("Choose a time for the visit.");
    const when = new Date(DAYS[day]);
    if (!asap) when.setHours(hour!, 0, 0, 0);
    const payload = {
      operatorId: operator.uid,
      scheduleMode: asap ? "asap" : "scheduled",
      scheduledDate: asap ? null : when.toISOString(),
      scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      paymentMethod: method,
      cashPaymentAcknowledged: method === "cash",
      expectedPrice: total,
      serviceTypes: services,
      serviceLocation: location,
      serviceAddressConfirmed: true,
    };
    // Retries of the same request reuse its id so a slow network never double-books.
    const key = JSON.stringify(payload);
    if (attempt.current?.key !== key) attempt.current = { key, id: requestId() };
    setBusy(true);
    try {
      const result = await api<{ jobId: string }>("/api/jobs/create", { ...payload, requestId: attempt.current.id });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      router.push(`/job/${result.jobId}`);
    } catch (e) {
      void refreshPricing();
      setError(e instanceof Error ? e.message : "Couldn’t send your request. Try again.");
      setBusy(false);
    }
  };

  const name = operator.businessName || operator.displayName;
  const cardPrice = quote.credit != null ? currentQuote(quote.base, "credit").price : null;
  const toggle = (value: ServiceType) => setServices((list) => (list.includes(value) ? list.filter((s) => s !== value) : [...list, value]));

  // Everything fits on one screen: short labels, single-row pickers that scroll sideways,
  // and payment side by side, so a customer can book without scrolling down.
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" alwaysBounceVertical={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md, paddingBottom: 150 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar uri={operator.logoUrl || operator.avatar} name={name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={type.caption}>Requesting</Text>
            <Text style={type.headline} numberOfLines={1}>{name}</Text>
          </View>
        </View>

        <Part title="Where">
          {properties.length ? (
            <Strip>
              <Chip label="Main house" icon="house.fill" selected={placeId === "home"} onPress={() => setPlaceId("home")} />
              {properties.map((p) => (
                <Chip key={p.id} label={p.label} selected={placeId === p.id} onPress={() => { setPlaceId(p.id); if (p.serviceTypes?.length) setServices(fitServices(p.serviceTypes, operator)); }} />
              ))}
            </Strip>
          ) : null}
          <Text style={type.callout} numberOfLines={1}>{formatServiceAddress(location) || "No address yet. Add one in Profile → Properties."}</Text>
        </Part>

        <Part title="Clear">
          <Strip>
            {offered.map(([value, label]) => (
              <Chip key={value} label={label} selected={services.includes(value)} onPress={() => toggle(value)} />
            ))}
          </Strip>
        </Part>

        <Part title="When">
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: space.sm }}>
            <Tile icon="bolt.fill" title="ASAP" selected={asap} onPress={() => setAsap(true)} />
            <Tile icon="calendar" title="Schedule" selected={!asap} onPress={() => setAsap(false)} />
          </View>
          {!asap ? (
            <>
              <Strip>
                {DAYS.map((d, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityState={{ selected: day === i }}
                    accessibilityLabel={i === 0 ? "Today" : d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
                    onPress={() => { setDay(i); setHour(null); }}
                    style={{ minWidth: 54, paddingVertical: 6, borderRadius: radius.md, alignItems: "center", backgroundColor: day === i ? colors.ink : colors.surfaceAlt }}
                  >
                    <Text style={{ fontSize: 13, color: day === i ? "#fff" : colors.muted, fontWeight: "600" }}>{i === 0 ? "Today" : d.toLocaleDateString("en-CA", { weekday: "short" })}</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: day === i ? "#fff" : colors.ink }}>{d.getDate()}</Text>
                  </Pressable>
                ))}
              </Strip>
              {hoursForDay.length ? (
                <Strip>
                  {hoursForDay.map((h) => (
                    <Chip key={h} label={new Date(2000, 0, 1, h).toLocaleTimeString("en-CA", { hour: "numeric" })} selected={hour === h} onPress={() => setHour(h)} />
                  ))}
                </Strip>
              ) : (
                <Text style={type.caption}>No times left today. Choose another day.</Text>
              )}
            </>
          ) : null}
        </Part>

        <Part title="Pay">
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: space.sm }}>
            <Tile icon="creditcard.fill" title="Card" trailing={cardPrice != null ? money(cardPrice) : "Not offered"} disabled={cardPrice == null} selected={method === "credit"} onPress={() => setMethod("credit")} />
            <Tile icon="banknote.fill" title="Cash" trailing={money(quote.cash)} selected={method === "cash"} onPress={() => setMethod("cash")} />
          </View>
        </Part>
      </ScrollView>

      {/* Problems show right above the button that caused them, never off-screen. */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.sm, backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.border, gap: space.sm }}>
        <Notice text={error} />
        <Text style={[type.caption, { textAlign: "center" }]} numberOfLines={2}>
          {method === "cash" ? `You’ll pay ${money(quote.cash)} cash when the work is done. ` : "Nothing is charged until the work is done. "}
          Free to cancel before they leave.
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <View accessible accessibilityLabel={`Total ${money(total)}, ${method === "cash" ? "cash" : "card"}`} style={{ flex: 1 }}>
            <Text style={type.caption}>Total · {method === "cash" ? "cash" : "card"}</Text>
            <Text style={[type.title, { fontSize: 24, fontVariant: ["tabular-nums"] }]}>{money(total)}</Text>
          </View>
          <Button title="Send request" icon="paperplane.fill" loading={busy} style={{ flex: 1.4 }} onPress={submit} />
        </View>
      </View>
    </View>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={type.overline}>{title}</Text>
      {children}
    </View>
  );
}

/** One row of choices that scrolls sideways instead of wrapping onto more lines. */
function Strip({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
      {children}
    </ScrollView>
  );
}

/** A half-width radio choice, so two options sit side by side. */
function Tile({ icon, title, trailing, selected, disabled, onPress }: { icon: SymbolName; title: string; trailing?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={[title, trailing].filter(Boolean).join(", ")}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: selected ? colors.accent : colors.border, backgroundColor: colors.surface, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
    >
      <Icon name={icon} size={18} color={selected ? colors.accent : colors.muted} />
      <Text style={[type.headline, { flex: 1 }]} numberOfLines={1}>{title}</Text>
      {trailing ? <Text style={{ fontSize: 15, fontWeight: "700", color: disabled ? colors.muted : colors.ink, fontVariant: ["tabular-nums"] }} numberOfLines={1}>{trailing}</Text> : null}
    </Pressable>
  );
}
