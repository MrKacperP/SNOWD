import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isClientWithinOperatorRadius } from "@/lib/operatorDiscovery";
import { SERVICE_LABELS, type ClientProfile, type OperatorProfile } from "@/lib/types";
import { Avatar, Badge, Button, Card, Icon, Loading, Notice } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { money } from "~/lib/format";
import { quoteFor } from "~/lib/operators";
import { colors, radius, space, type } from "~/lib/theme";

export default function OperatorScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [operator, setOperator] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid))
      .then((snap) => setOperator(snap.exists() ? ({ ...snap.data(), uid: snap.id } as OperatorProfile) : null))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <Loading />;
  if (!operator) return <View style={{ padding: space.xl, paddingTop: insets.top + 60 }}><Notice text="This profile isn’t available." /></View>;

  const name = operator.businessName || operator.displayName;
  const quote = quoteFor(operator, profile);
  const serves = profile ? isClientWithinOperatorRadius(profile as ClientProfile, operator) : false;
  const saved = (profile?.savedOperators || []).includes(operator.uid);
  const client = profile?.role === "client";
  const size = (profile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ height: 150 + insets.top, backgroundColor: colors.ink }}>
          {operator.portfolioPhotos?.[0] ? <Image source={{ uri: operator.portfolioPhotos[0] }} style={{ flex: 1, opacity: 0.55 }} contentFit="cover" /> : null}
        </View>
        <View style={{ paddingHorizontal: space.lg, marginTop: -44, gap: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View style={{ borderWidth: 4, borderColor: colors.bg, borderRadius: 50 }}>
              <Avatar uri={operator.logoUrl || operator.avatar} name={name} size={88} />
            </View>
            {client ? (
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={saved ? "Remove from saved shovelers" : "Save this shoveler"}
                accessibilityState={{ selected: saved }}
                onPress={() => user && void updateDoc(doc(db, "users", user.uid), { savedOperators: saved ? arrayRemove(operator.uid) : arrayUnion(operator.uid) }).catch(() => {})}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 6 }}
              >
                <Icon name={saved ? "heart.fill" : "heart"} size={20} color={saved ? colors.danger : colors.ink} />
              </Pressable>
            ) : null}
          </View>
          <View style={{ gap: 6 }}>
            <Text style={type.largeTitle}>{name}</Text>
            {operator.tagline ? <Text style={type.callout}>{operator.tagline}</Text> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              <Badge tone="green" label="ID verified" />
              {operator.isStudent ? <Badge tone="blue" label="Student" /> : null}
              {quote.card ? <Badge tone="gray" label="Takes cards" /> : <Badge tone="gray" label="Cash only" />}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: space.md }}>
            {[
              ["star.fill", operator.reviewCount ? operator.rating.toFixed(1) : "New", operator.reviewCount ? `${operator.reviewCount} reviews` : "No reviews yet"],
              ["checkmark.seal.fill", String(operator.completedJobs || operator.totalJobsCompleted || 0), "jobs done"],
              ["location.fill", `${operator.serviceRadius || 10} km`, "service area"],
            ].map(([icon, value, label]) => (
              <Card key={label} style={{ flex: 1, padding: space.md, gap: 4, alignItems: "center" }}>
                <Icon name={icon as "star.fill"} size={16} color={colors.accent} />
                <Text style={type.headline}>{value}</Text>
                <Text style={[type.caption, { fontSize: 13 }]}>{label}</Text>
              </Card>
            ))}
          </View>

          {operator.bio || operator.brandDescription ? (
            <Card>
              <Text style={type.headline}>About</Text>
              <Text style={type.body}>{operator.brandDescription || operator.bio}</Text>
            </Card>
          ) : null}

          <Card style={{ gap: 10 }}>
            <Text style={type.headline}>Prices</Text>
            {[
              ["Driveway (your size)", operator.pricing?.driveway?.[size]],
              ["Sidewalk / front porch", operator.pricing?.sidewalk],
              ["Backyard patio", operator.pricing?.backyardPatio],
            ]
              .filter(([, value]) => Number(value) > 0)
              .map(([label, value]) => (
                <View key={String(label)} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={type.body}>{label}</Text>
                  <Text style={[type.headline, { fontVariant: ["tabular-nums"] }]}>{money(Number(value))}</Text>
                </View>
              ))}
            <Text style={type.caption}>Services: {(operator.serviceTypes || []).map((s) => SERVICE_LABELS[s] || s).join(", ")}</Text>
          </Card>

          {operator.portfolioPhotos?.length ? (
            <View style={{ gap: space.sm }}>
              <Text style={type.headline}>Recent work</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {operator.portfolioPhotos.map((uri) => (
                  <Image key={uri} source={{ uri }} style={{ width: 160, height: 120, borderRadius: radius.md }} contentFit="cover" />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {client ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.sm, backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <View style={{ flex: 1 }}>
            <Text style={type.title}>{money(quote.cash)}</Text>
            <Text style={type.caption}>{serves ? "for your property, cash price" : "Doesn’t serve your address"}</Text>
          </View>
          <Button title="Request" icon="calendar.badge.plus" disabled={!serves} style={{ flex: 1 }} onPress={() => router.push(`/book/${operator.uid}`)} />
        </View>
      ) : null}
    </View>
  );
}
