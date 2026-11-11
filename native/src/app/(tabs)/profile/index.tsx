import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Snowfall } from "~/components/brand";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import type { OperatorProfile } from "@/lib/types";
import { Avatar, Button, Group, Icon, Row, Screen, SectionTitle, SwipeTabs } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { choosePhoto, uploadDataUrl } from "~/lib/uploads";
import { money } from "~/lib/format";
import { colors, hero, radius, shadow, space, stepColor, type } from "~/lib/theme";

/** Account overview with every setting the website has, each opening a native screen. */
export default function Profile() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const [photoBusy, setPhotoBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const go = (path: string) => router.push(path);

  // Same required fields as the website's profile completion bar.
  const required: [string, unknown, string][] = [
    ["Name", profile?.displayName, "/settings/account"],
    ["Phone", profile?.phone, "/settings/account"],
    ["Address", profile?.address, operator ? "/settings/service-area" : "/settings/property?id=home"],
    ["City", profile?.city, operator ? "/settings/service-area" : "/settings/property?id=home"],
    ["Postal code", profile?.postalCode, operator ? "/settings/service-area" : "/settings/property?id=home"],
    ...(operator
      ? ([
          ["Business name", profile?.businessName, "/settings/account"],
          ["Bio", profile?.bio, "/settings/account"],
        ] as [string, unknown, string][])
      : []),
  ];
  const missing = required.filter(([, value]) => !String(value || "").trim());
  const percent = Math.round(((required.length - missing.length) / required.length) * 100);

  const verification = profile?.idVerified ? "Verified" : profile?.verificationStatus === "rejected" ? "Action needed" : profile?.idPhotoUrl ? "In review" : operator ? "Needed" : "Optional";
  const areaLabel = profile?.serviceAreaMode === "cities" && profile.serviceAreas?.length ? `${profile.serviceAreas.length} ${profile.serviceAreas.length === 1 ? "city" : "cities"}` : `${profile?.serviceRadius || 10} km`;
  const payouts = operator && canAcceptPlatformPayments(profile as OperatorProfile) ? "Connected" : profile?.stripeConnectAccountId ? "Setup needed" : "Cash only";

  const changePhoto = async () => {
    try {
      const data = await choosePhoto("Profile photo", 600_000);
      if (!data) return;
      setPhotoBusy(true);
      const url = await uploadDataUrl(`avatars/${uid}`, data, `avatar-${Date.now()}.jpg`);
      await updateDoc(doc(db, "users", uid), { avatar: url });
    } catch (e) {
      Alert.alert("Couldn’t update photo", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const prices = profile?.pricing;
  const priceLine = prices?.driveway
    ? [`1-car ${money(prices.driveway.small || 0)}`, `2-car ${money(prices.driveway.medium || 0)}`, `3+ ${money(prices.driveway.large || 0)}`].join(" · ")
    : "Set your driveway prices";
  const tiles = operator
    ? [
        { icon: "car.2.fill", title: "Sizes & prices", body: priceLine, color: stepColor("accepted"), path: "/settings/prices" },
        { icon: "paintpalette.fill", title: "Brand & photos", body: `${profile?.portfolioPhotos?.length || 0} portfolio photo${profile?.portfolioPhotos?.length === 1 ? "" : "s"}${profile?.tagline ? " · tagline set" : ""}`, color: stepColor("in-progress"), path: "/settings/branding" },
        { icon: "map.fill", title: "Service area", body: areaLabel, color: stepColor("en-route"), path: "/settings/service-area" },
        { icon: "eye.fill", title: "Public profile", body: "See what customers see", color: stepColor("pending"), path: `/operator/${uid}` },
      ]
    : [
        { icon: "house.fill", title: "Your homes", body: profile?.address ? `${profile.address}` : "Add your home", color: stepColor("accepted"), path: "/settings/properties" },
        { icon: "creditcard.fill", title: "Payments", body: "Receipts and history", color: stepColor("en-route"), path: "/settings/transactions" },
      ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeTabs tab="/profile">
        <Screen contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 0, gap: space.lg, paddingBottom: insets.bottom + 90 }}>
          {/* Cover: a snowy gradient, or the latest portfolio photo, with the avatar sitting on its edge. */}
          <View style={{ height: 150 + insets.top, backgroundColor: hero.mid, backgroundImage: `linear-gradient(160deg, ${hero.top} 0%, ${hero.mid} 55%, ${hero.bottom} 100%)`, overflow: "hidden" }}>
            {operator && profile?.portfolioPhotos?.[0] ? <Image source={{ uri: profile.portfolioPhotos[0] }} style={{ flex: 1, opacity: 0.5 }} contentFit="cover" /> : <Snowfall count={16} height={150 + insets.top} />}
            <Text style={{ position: "absolute", top: insets.top + 10, left: space.lg, color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 }}>Profile</Text>
          </View>
          <View style={{ paddingHorizontal: space.lg, marginTop: -60, gap: space.lg }}>
            <View style={styles.idCard}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.md, marginTop: -52 }}>
                <Pressable accessibilityRole="button" onPress={operator ? () => go("/settings/branding") : changePhoto} disabled={photoBusy} accessibilityLabel="Change profile photo">
                  <View style={{ borderWidth: 4, borderColor: colors.surface, borderRadius: 54 }}>
                    <Avatar uri={(operator && profile?.logoUrl) || profile?.avatar} name={profile?.businessName || profile?.displayName} size={96} />
                  </View>
                  <View style={styles.camera}>
                    <Icon name={photoBusy ? "arrow.up" : "camera.fill"} size={14} color="#fff" />
                  </View>
                </Pressable>
                <View style={{ flex: 1, paddingBottom: 8 }}>
                  <View style={[styles.rolePill, { backgroundColor: operator ? stepColor("in-progress").soft : stepColor("accepted").soft }]}>
                    <Icon name={operator ? "snowflake" : "house.fill"} size={11} color={operator ? stepColor("in-progress").text : stepColor("accepted").text} />
                    <Text style={{ fontSize: 12, fontWeight: "800", color: operator ? stepColor("in-progress").text : stepColor("accepted").text }}>{operator ? "SHOVELER" : "CUSTOMER"}</Text>
                  </View>
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={type.title}>{(operator && profile?.businessName) || profile?.displayName || "Your profile"}</Text>
                {operator && profile?.tagline ? <Text style={[type.callout, { color: colors.ink }]}>{profile.tagline}</Text> : null}
                <Text style={type.caption}>{[profile?.email || user?.email, profile?.city].filter(Boolean).join(" · ")}</Text>
              </View>
              {operator ? (
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  {[
                    ["star.fill", profile?.reviewCount ? (profile.rating || 0).toFixed(1) : "New", "rating"],
                    ["checkmark.seal.fill", String(profile?.completedJobs || profile?.totalJobsCompleted || 0), "jobs"],
                    ["checkmark.shield.fill", verification, "ID"],
                  ].map(([icon, value, label]) => (
                    <View key={label} style={styles.miniStat}>
                      <Icon name={icon as never} size={13} color={colors.accent} />
                      <Text style={[type.headline, { fontSize: 15 }]} numberOfLines={1}>{value}</Text>
                      <Text style={[type.caption, { fontSize: 12 }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title="Edit details" icon="pencil" small style={{ flex: 1 }} onPress={() => go("/settings/account")} />
                {operator ? <Button title="Preview" icon="eye" variant="secondary" small style={{ flex: 1 }} onPress={() => go(`/operator/${uid}`)} /> : null}
              </View>
            </View>

            <SectionTitle>{operator ? "Your storefront" : "Your stuff"}</SectionTitle>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {tiles.map((t) => (
                <Pressable
                  key={t.title}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.title}. ${t.body}`}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    go(t.path);
                  }}
                  style={({ pressed }) => [styles.tile, { backgroundColor: t.color.soft }, pressed && { transform: [{ scale: 0.97 }] }]}
                >
                  <View style={[styles.tileIcon, { backgroundColor: t.color.bar }]}>
                    <Icon name={t.icon as never} size={18} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: t.color.text }}>{t.title}</Text>
                  <Text style={[type.caption, { color: colors.ink }]} numberOfLines={2}>{t.body}</Text>
                </Pressable>
              ))}
            </View>

        {missing.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Profile ${percent}% complete. Finish your profile`} onPress={() => go(missing[0][2])} style={({ pressed }) => [{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: 10, borderWidth: 0.5, borderColor: colors.border }, pressed && { opacity: 0.85 }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[type.headline, { flex: 1 }]}>Profile {percent}% complete</Text>
              <Icon name="chevron.right" size={13} color={colors.faint} />
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden" }}>
              <View style={{ width: `${percent}%`, height: "100%", backgroundColor: colors.accent }} />
            </View>
            <Text style={type.caption}>Still needed: {missing.map(([label]) => label.toLowerCase()).join(", ")}. Tap to add.</Text>
          </Pressable>
        ) : null}

        <SectionTitle>Your account</SectionTitle>
        <Group>
          <Row icon="person.fill" label="Account" value={profile?.phone || "Add phone"} onPress={() => go("/settings/account")} />
          {operator ? (
            <Row icon="map.fill" label="Service area" value={areaLabel} onPress={() => go("/settings/service-area")} />
          ) : (
            <Row icon="house.fill" label="Properties" value={profile?.address ? profile.city : "Add your home"} onPress={() => go("/settings/properties")} />
          )}
          {operator ? <Row icon="tag.fill" label="Prices and services" onPress={() => go("/settings/prices")} /> : null}
          <Row icon="creditcard.fill" label={operator ? "Payouts" : "Payment methods"} value={operator ? payouts : "At checkout"} onPress={() => go("/settings/payments")} />
          <Row icon="checkmark.shield.fill" label="Verification" value={verification} onPress={() => go("/settings/verification")} />
          <Row icon="bell.fill" label="Notifications" value="Phone & email" onPress={() => go("/settings/email")} />
          {operator ? <Row icon="paintpalette.fill" label="Business profile" value="Photos & portfolio" onPress={() => go("/settings/branding")} last /> : <Row icon="list.bullet.rectangle.fill" label="Payment history" onPress={() => go("/settings/transactions")} last />}
        </Group>

        {operator ? (
          <>
            <SectionTitle>Business</SectionTitle>
            <Group>
              <Row icon="chart.bar.fill" label="Your money & activity" onPress={() => go("/settings/transactions")} />
              <Row icon="person.2.fill" label="Nearby clients" onPress={() => go("/settings/clients")} last />
            </Group>
          </>
        ) : null}

        <SectionTitle>Support</SectionTitle>
        <Group>
          <Row icon="bell.badge.fill" label="Updates" onPress={() => go("/notifications")} />
          <Row icon="questionmark.circle.fill" label="Help & privacy" onPress={() => go("/settings/privacy")} last />
        </Group>

        <Group>
          <Row icon="rectangle.portrait.and.arrow.right" label="Sign out" tint={colors.accent} onPress={() => Alert.alert("Sign out?", "You can sign back in any time. Your orders and messages are kept.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", onPress: () => void signOut() }])} />
          <Row icon="trash.fill" label="Delete account" tint={colors.danger} onPress={() => go("/settings/delete")} last />
        </Group>
        <Text style={[type.caption, { textAlign: "center" }]}>SNOWD {Constants.expoConfig?.version}</Text>
          </View>
        </Screen>
      </SwipeTabs>
    </>
  );
}

const styles = StyleSheet.create({
  idCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, paddingTop: space.md, gap: space.md, ...shadow, shadowOpacity: 0.1, shadowRadius: 16 },
  camera: { position: "absolute", right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.surface },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  miniStat: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.bg },
  tile: { width: "48.5%", minHeight: 128, gap: 6, padding: space.md, borderRadius: radius.lg },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
