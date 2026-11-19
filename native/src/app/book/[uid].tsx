import { useMarketplacePolicy } from "@/lib/useMarketplacePolicy";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { calculateServicePrice } from "@/lib/marketplacePricing";
import { formatServiceAddress, profileLocation, type ServiceLocation } from "@/lib/serviceLocations";
import { SERVICE_LABELS, SHOVELING_SERVICES, type ClientProfile, type OperatorProfile, type ServiceType } from "@/lib/types";
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
  const cashOnly = cardPrice == null;
  const toggle = (value: ServiceType) => setServices((list) => (list.includes(value) ? list.filter((s) => s !== value) : [...list, value]));

  // What the company charges for each area, so the total is never a mystery. If their prices
  // don't add up to the quote (an area with no price falls back to a default), show one line.
  const size = ((place ? location?.propertySize : profile?.propertyDetails?.propertySize) || "medium") as "small" | "medium" | "large";
  const lines = services.map((s) => ({ label: SERVICE_LABELS[s], price: calculateServicePrice(operator.pricing, [s], size) }));
  const itemised = lines.length > 1 && Math.abs(lines.reduce((sum, l) => sum + l.price, 0) - quote.base) < 0.005;
  const fee = method === "credit" ? Math.round((total - quote.base) * 100) / 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* The sheet's title row, with a plain way out. */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 52, paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={{ position: "absolute", left: space.lg, top: space.sm, bottom: 0, justifyContent: "center" }}>
          <Text style={{ color: colors.accent, fontSize: 17 }}>Cancel</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[type.headline, { fontSize: 17 }]}>Request service</Text>
      </View>
      <ScrollView contentInsetAdjustmentBehavior="never" alwaysBounceVertical={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md + 2, paddingBottom: 120 }}>
        {/* Who you're asking, in a card so it never blends into the nav bar. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Avatar uri={operator.logoUrl || operator.avatar} name={name} size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.caption}>You’re requesting</Text>
            <Text style={[type.headline, { fontSize: 18, fontWeight: "700" }]} numberOfLines={1}>{name}</Text>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Bubble icon="mappin.and.ellipse" />
            <Text style={[type.body, { flex: 1, color: location ? colors.ink : colors.muted }]} numberOfLines={2}>
              {formatServiceAddress(location) || "No address yet. Add one in Profile → Properties."}
            </Text>
          </View>
        </Part>

        <Part title="What to clear" hint={offered.length > 1 ? "Pick one or more" : undefined}>
          <Strip>
            {offered.map(([value, label]) => (
              <Chip key={value} label={label} icon={services.includes(value) ? "checkmark" : undefined} selected={services.includes(value)} onPress={() => toggle(value)} />
            ))}
          </Strip>
        </Part>

        <Part title="When">
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: space.sm }}>
            <Tile icon="bolt.fill" title="ASAP" body="Next available" selected={asap} onPress={() => setAsap(true)} />
            <Tile icon="calendar" title="Schedule" body={!asap && hour != null ? `${dayName(day)}, ${hourName(hour)}` : "Pick a day"} selected={!asap} onPress={() => setAsap(false)} />
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
                    <Chip key={h} label={hourName(h)} selected={hour === h} onPress={() => setHour(h)} />
                  ))}
                </Strip>
              ) : (
                <Text style={type.caption}>No times left today. Choose another day.</Text>
              )}
            </>
          ) : null}
        </Part>

        <Part title="Payment">
          {cashOnly ? (
            // Only one way to pay: say so plainly instead of showing a dead "Card" option.
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Bubble icon="banknote.fill" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.headline}>Cash when the work is done</Text>
                <Text style={type.caption}>{name} only takes cash.</Text>
              </View>
            </View>
          ) : (
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: space.sm }}>
              <Tile icon="creditcard.fill" title="Card" body={money(cardPrice)} selected={method === "credit"} onPress={() => setMethod("credit")} />
              <Tile icon="banknote.fill" title="Cash" body={money(quote.cash)} selected={method === "cash"} onPress={() => setMethod("cash")} />
            </View>
          )}
        </Part>

        {/* One place that adds it all up, so the price only appears where it's explained. */}
        <View accessible accessibilityLabel={`Price. ${(itemised ? lines : [{ label: services.map((s) => SERVICE_LABELS[s]).join(" and "), price: quote.base }]).map((l) => `${l.label} ${money(l.price)}`).join(", ")}${fee > 0 ? `, card and booking fee ${money(fee)}` : ""}. Total ${money(total)}, ${method === "cash" ? "cash" : "card"}.`} style={{ borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, paddingVertical: space.md, gap: 6 }}>
          <Text style={type.overline}>Price</Text>
          {itemised ? lines.map((l) => <Line key={l.label} label={l.label} value={money(l.price)} />) : (
            <Line label={services.map((s) => SERVICE_LABELS[s]).join(" + ") || "Nothing chosen"} value={money(quote.base)} />
          )}
          {fee > 0 ? <Line label="Card & booking fee" value={money(fee)} /> : null}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={[type.headline, { flex: 1 }]}>Total{method === "cash" ? " · cash" : " · card"}</Text>
            <Text style={[type.title, { fontVariant: ["tabular-nums"] }]}>{money(total)}</Text>
          </View>
          <Text style={type.caption}>
            {method === "cash" ? "" : "Charged only after the work is done. "}Free to cancel before they head out.
          </Text>
        </View>
      </ScrollView>

      {/* Problems show right above the button that caused them, never off-screen. */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.sm, backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.border, gap: space.sm }}>
        <Notice text={error} />
        <Button title={`Send request · ${money(total)}`} icon="paperplane.fill" loading={busy} onPress={submit} />
      </View>
    </View>
  );
}

const dayName = (i: number) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAYS[i].toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }));
const hourName = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-CA", { hour: "numeric" });

/** A round icon that leads a line of plain information (not a choice). */
function Bubble({ icon }: { icon: SymbolName }) {
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={17} color={colors.accent} />
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: space.md }}>
      <Text style={[type.callout, { flex: 1 }]} numberOfLines={1}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.ink, fontVariant: ["tabular-nums"] }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Part({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.sm }}>
        <Text accessibilityRole="header" style={type.overline}>{title}</Text>
        {hint ? <Text style={[type.caption, { fontSize: 13 }]}>{hint}</Text> : null}
      </View>
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

/** A half-width radio choice, so two options sit side by side. The second line says what picking it means. */
function Tile({ icon, title, body, selected, onPress }: { icon: SymbolName; title: string; body?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={[title, body].filter(Boolean).join(", ")}
      accessibilityState={{ selected }}
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.md, borderWidth: 2, borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accentSoft : colors.surface, opacity: pressed ? 0.8 : 1 })}
    >
      <Icon name={icon} size={18} color={selected ? colors.accent : colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={type.headline} numberOfLines={1}>{title}</Text>
        {body ? <Text style={[type.caption, { fontVariant: ["tabular-nums"], color: selected ? colors.accentDark : colors.muted }]} numberOfLines={1}>{body}</Text> : null}
      </View>
    </Pressable>
  );
}
