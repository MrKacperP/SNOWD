import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatServiceAddress, profileLocation, type ServiceLocation } from "@/lib/serviceLocations";
import { SHOVELING_SERVICES, type ClientProfile, type OperatorProfile, type ServiceType } from "@/lib/types";
import { Avatar, Button, Chip, FormSection, Loading, Notice, OptionCard } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api, requestId } from "~/lib/api";
import { db } from "~/lib/firebase";
import { money } from "~/lib/format";
import { quoteFor } from "~/lib/operators";
import { useProperties } from "~/lib/properties";
import { colors, radius, space, type } from "~/lib/theme";

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  d.setHours(0, 0, 0, 0);
  return d;
});
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);

export default function Book() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [operator, setOperator] = useState<OperatorProfile | null>(null);
  const [services, setServices] = useState<ServiceType[]>((profile?.propertyDetails?.serviceTypes as ServiceType[]) || ["driveway"]);
  const [asap, setAsap] = useState(true);
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState<number | null>(null);
  const [method, setMethod] = useState<"credit" | "cash">("cash");
  const [cashOk, setCashOk] = useState(false);
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
      if (quoteFor(op, profile).card) setMethod("credit");
    });
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const offered = useMemo(() => SHOVELING_SERVICES.filter(([value]) => !operator?.serviceTypes?.length || operator.serviceTypes.includes(value)), [operator]);
  if (!operator) return <Loading />;

  const quote = quoteFor(operator, place ? { ...profile!, propertyDetails: { ...profile?.propertyDetails, propertySize: location?.propertySize || "medium" } } as typeof profile : profile, services);
  const total = method === "credit" && quote.credit != null ? quote.credit : quote.cash;
  const now = new Date();
  const hoursForDay = HOURS.filter((h) => day > 0 || h > now.getHours());

  const submit = async () => {
    setError("");
    if (!location) return setError("Add your home address in Profile → Properties before booking.");
    if (!services.length) return setError("Choose at least one area to clear.");
    if (!asap && hour == null) return setError("Choose a time for the visit.");
    if (method === "cash" && !cashOk) return setError("Turn on the switch under Cash to confirm you’ll pay in cash.");
    const when = new Date(DAYS[day]);
    if (!asap) when.setHours(hour!, 0, 0, 0);
    const payload = {
      operatorId: operator.uid,
      scheduleMode: asap ? "asap" : "scheduled",
      scheduledDate: asap ? null : when.toISOString(),
      scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      paymentMethod: method,
      cashPaymentAcknowledged: method === "cash" && cashOk,
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
      setError(e instanceof Error ? e.message : "Couldn’t send your request. Try again.");
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 160 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar uri={operator.logoUrl || operator.avatar} name={operator.businessName || operator.displayName} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.caption}>You’re requesting</Text>
            <Text style={type.title} numberOfLines={2}>{operator.businessName || operator.displayName}</Text>
          </View>
        </View>

        <FormSection number={1} title="Where?">
          {properties.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Main house" icon="house.fill" selected={placeId === "home"} onPress={() => setPlaceId("home")} />
              {properties.map((p) => (
                <Chip key={p.id} label={p.label} selected={placeId === p.id} onPress={() => { setPlaceId(p.id); if (p.serviceTypes?.length) setServices(p.serviceTypes); }} />
              ))}
            </View>
          ) : null}
          <Text style={type.body}>{formatServiceAddress(location) || "No address saved yet. Add one in Profile → Properties."}</Text>
        </FormSection>

        <FormSection number={2} title="What should be cleared?">
          <Text style={type.caption}>Choose all that apply.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {offered.map(([value, label]) => (
              <Chip key={value} label={label} selected={services.includes(value)} onPress={() => setServices((list) => (list.includes(value) ? list.filter((s) => s !== value) : [...list, value]))} />
            ))}
          </View>
        </FormSection>

        <FormSection number={3} title="When?">
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            <OptionCard icon="bolt.fill" title="As soon as possible" body="Your shoveler comes at their next opening." selected={asap} onPress={() => setAsap(true)} />
            <OptionCard icon="calendar" title="Pick a day and time" body="Choose from the next 7 days." selected={!asap} onPress={() => setAsap(false)} />
          </View>
          {!asap ? (
            <>
              <Text style={[type.caption, { fontWeight: "600", color: colors.ink }]}>Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {DAYS.map((d, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityState={{ selected: day === i }}
                    accessibilityLabel={i === 0 ? "Today" : d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
                    onPress={() => { setDay(i); setHour(null); }}
                    style={{ minWidth: 64, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.md, alignItems: "center", backgroundColor: day === i ? colors.ink : colors.surfaceAlt }}
                  >
                    <Text style={{ fontSize: 14, color: day === i ? "#fff" : colors.muted, fontWeight: "600" }}>{i === 0 ? "Today" : d.toLocaleDateString("en-CA", { weekday: "short" })}</Text>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: day === i ? "#fff" : colors.ink }}>{d.getDate()}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={[type.caption, { fontWeight: "600", color: colors.ink }]}>Time</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {hoursForDay.map((h) => (
                  <Chip key={h} label={new Date(2000, 0, 1, h).toLocaleTimeString("en-CA", { hour: "numeric" })} selected={hour === h} onPress={() => setHour(h)} />
                ))}
                {!hoursForDay.length ? <Text style={type.caption}>No times left today. Choose another day.</Text> : null}
              </View>
            </>
          ) : null}
        </FormSection>

        <FormSection number={4} title="How will you pay?">
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            <OptionCard
              icon="creditcard.fill"
              title="Card or Apple Pay"
              trailing={quote.credit != null ? money(quote.credit) : undefined}
              body={quote.credit == null ? "This shoveler takes cash only." : "Nothing is charged until the work is done."}
              disabled={quote.credit == null}
              selected={method === "credit"}
              onPress={() => setMethod("credit")}
            />
            <OptionCard icon="banknote.fill" title="Cash" trailing={money(quote.cash)} body="Pay your shoveler in person when they finish." selected={method === "cash"} onPress={() => setMethod("cash")} />
          </View>
          {method === "cash" ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: cashOk }}
              onPress={() => setCashOk(!cashOk)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, padding: space.md, borderRadius: radius.md, backgroundColor: cashOk ? colors.mintSoft : colors.sunSoft }}
            >
              <Text style={{ flex: 1, fontSize: 16, lineHeight: 22, fontWeight: "600", color: cashOk ? colors.mint : colors.sunText }}>I’ll have {money(quote.cash)} in cash ready when the work is done.</Text>
              <Switch accessibilityElementsHidden importantForAccessibility="no" value={cashOk} onValueChange={setCashOk} trackColor={{ true: colors.mint }} />
            </Pressable>
          ) : null}
        </FormSection>

        <Text style={[type.caption, { textAlign: "center" }]}>Sending a request is free. {operator.businessName || operator.displayName} confirms before anything is booked, and you can cancel any time before they leave.</Text>
      </ScrollView>

      {/* Problems show right above the button that caused them, never off-screen. */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: space.lg, paddingBottom: insets.bottom + space.sm, backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.border, gap: space.md }}>
        <Notice text={error} />
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
