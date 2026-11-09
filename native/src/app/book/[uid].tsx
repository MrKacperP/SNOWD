import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatServiceAddress, profileLocation, type ServiceLocation } from "@/lib/serviceLocations";
import { SHOVELING_SERVICES, type ClientProfile, type OperatorProfile, type ServiceType } from "@/lib/types";
import { Avatar, Button, Card, Chip, Icon, Loading, Notice } from "~/components/ui";
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
    if (method === "cash" && !cashOk) return setError("Confirm you’ll pay the shoveler in cash.");
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
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 140 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar uri={operator.logoUrl || operator.avatar} name={operator.businessName || operator.displayName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={type.headline}>{operator.businessName || operator.displayName}</Text>
            <Text style={type.caption} numberOfLines={1}>{formatServiceAddress(location) || "No address on file"}</Text>
          </View>
        </View>

        {properties.length ? (
          <Card>
            <Text style={type.headline}>Where?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Main house" icon="house.fill" selected={placeId === "home"} onPress={() => setPlaceId("home")} />
              {properties.map((p) => (
                <Chip key={p.id} label={p.label} selected={placeId === p.id} onPress={() => { setPlaceId(p.id); if (p.serviceTypes?.length) setServices(p.serviceTypes); }} />
              ))}
            </View>
            <Text style={type.caption}>{formatServiceAddress(location)}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={type.headline}>What should be cleared?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {offered.map(([value, label]) => (
              <Chip key={value} label={label} selected={services.includes(value)} onPress={() => setServices((list) => (list.includes(value) ? list.filter((s) => s !== value) : [...list, value]))} />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={type.headline}>When?</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="As soon as possible" icon="bolt.fill" selected={asap} onPress={() => setAsap(true)} />
            <Chip label="Pick a time" icon="calendar" selected={!asap} onPress={() => setAsap(false)} />
          </View>
          {!asap ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {DAYS.map((d, i) => (
                  <Pressable key={i} onPress={() => { setDay(i); setHour(null); }} style={{ width: 58, paddingVertical: 10, borderRadius: radius.md, alignItems: "center", backgroundColor: day === i ? colors.ink : colors.surfaceAlt }}>
                    <Text style={{ fontSize: 12, color: day === i ? "#fff" : colors.muted, fontWeight: "600" }}>{i === 0 ? "Today" : d.toLocaleDateString("en-CA", { weekday: "short" })}</Text>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: day === i ? "#fff" : colors.ink }}>{d.getDate()}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {hoursForDay.map((h) => (
                  <Chip key={h} label={new Date(2000, 0, 1, h).toLocaleTimeString("en-CA", { hour: "numeric" })} selected={hour === h} onPress={() => setHour(h)} />
                ))}
                {!hoursForDay.length ? <Text style={type.caption}>No times left today. Choose another day.</Text> : null}
              </View>
            </>
          ) : null}
        </Card>

        <Card>
          <Text style={type.headline}>Payment</Text>
          {(
            [
              ["credit", "Card or Apple Pay", quote.credit, "Held now, charged when the work is done.", "creditcard.fill"],
              ["cash", "Cash", quote.cash, "Pay the shoveler directly when they finish.", "banknote.fill"],
            ] as const
          ).map(([value, label, price, note, icon]) => {
            const unavailable = value === "credit" && price == null;
            return (
              <Pressable key={value} disabled={unavailable} onPress={() => setMethod(value)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: method === value ? colors.accent : colors.border, opacity: unavailable ? 0.45 : 1 }}>
                <Icon name={icon} size={20} color={method === value ? colors.accent : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={type.headline}>{label}</Text>
                  <Text style={type.caption}>{unavailable ? "This shoveler takes cash only." : note}</Text>
                </View>
                {price != null ? <Text style={type.headline}>{money(price)}</Text> : null}
              </Pressable>
            );
          })}
          {method === "cash" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[type.callout, { flex: 1 }]}>I’ll pay {money(quote.cash)} in cash when the work is done.</Text>
              <Switch value={cashOk} onValueChange={setCashOk} trackColor={{ true: colors.accent }} />
            </View>
          ) : null}
        </Card>
        <Notice text={error} />
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: space.lg, paddingBottom: insets.bottom + space.sm, backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", gap: space.lg }}>
        <View style={{ flex: 1 }}>
          <Text style={type.caption}>Total</Text>
          <Text style={type.title}>{money(total)}</Text>
        </View>
        <Button title="Send request" icon="paperplane.fill" loading={busy} style={{ flex: 1.4 }} onPress={submit} />
      </View>
    </View>
  );
}
