import Constants from "expo-constants";
import type { SymbolViewProps } from "expo-symbols";
import { Stack, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabHeader } from "~/components/TabHeader";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import type { OperatorProfile } from "@/lib/types";
import { Avatar, Button, Group, Icon, Row, Screen, SectionTitle, SwipeTabs } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useJobs } from "~/lib/data";
import { useLiveHeaderTone } from "~/lib/headerTone";
import { db } from "~/lib/firebase";
import { chooseUpload, uploadFile } from "~/lib/uploads";
import { brand, colors, radius, shadow, space, stepColor, type } from "~/lib/theme";
import { idState } from "~/lib/verification";

/** The year an account was made; Firestore hands back either a Date or a Timestamp. */
function joinedYear(value: unknown) {
  if (value instanceof Date) return value.getFullYear();
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate(): Date }).toDate().getFullYear();
  return null;
}

/** Account overview: who you are, one next step, your details, then grouped settings. */
export default function Profile() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const uid = user?.uid || "";
  const { jobs } = useJobs(uid, profile?.role);
  const tone = useLiveHeaderTone(jobs, uid);
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

  const id = idState(profile);
  const verification = id === "verified" ? "Verified" : id === "rejected" ? "Action needed" : id === "pending" ? "In review" : "Needed";
  const transcript = !!profile?.studentTranscriptUrl;
  const areaLabel = profile?.serviceAreaMode === "cities" && profile.serviceAreas?.length ? `${profile.serviceAreas.length} ${profile.serviceAreas.length === 1 ? "city" : "cities"}` : `${profile?.serviceRadius || 10} km`;
  const payouts = operator && canAcceptPlatformPayments(profile as OperatorProfile) ? "Connected" : profile?.stripeConnectAccountId ? "Setup needed" : "Cash only";

  const changePhoto = async () => {
    try {
      const picked = await chooseUpload("Profile photo", { maxEdge: 1600 });
      if (picked?.kind !== "photo") return;
      setPhotoBusy(true);
      const url = await uploadFile(`avatars/${uid}`, picked.uri, { name: `avatar-${Date.now()}.jpg` });
      await updateDoc(doc(db, "users", uid), { avatar: url });
    } catch (e) {
      Alert.alert("Couldn’t update photo", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const verified = id === "verified";
  const inReview = id === "pending";
  // Only one card shows: finish verification, then the profile, then (students) the transcript.
  const nudge: { title: string; caption: string; icon: SymbolViewProps["name"]; color: string; soft: string; path: string; progress?: number } | null = !verified
    ? {
        title: inReview ? "Verification in review" : id === "rejected" ? "Verification needs another look" : "Verify your ID",
        caption: inReview ? "We’ll let you know as soon as it’s checked." : "Only used to verify your address and identity.",
        icon: inReview ? "hourglass" : "person.badge.shield.checkmark.fill",
        color: inReview ? colors.accent : stepColor("pending").text,
        soft: inReview ? colors.accentSoft : stepColor("pending").soft,
        path: "/settings/verification",
      }
    : missing.length
      ? { title: `Profile ${percent}% complete`, caption: `Add your ${missing.map(([label]) => label.toLowerCase()).join(", ")}.`, icon: "person.crop.circle.badge.plus", color: colors.accent, soft: colors.accentSoft, path: missing[0][2], progress: percent }
      : !transcript
        ? { title: "Student? Upload your transcript", caption: "Confirm you’re a student and get better promotions.", icon: "graduationcap.fill", color: colors.accent, soft: colors.accentSoft, path: "/settings/verification" }
        : null;
  const name = (operator && profile?.businessName) || profile?.displayName || "Your profile";
  const place = [profile?.city, profile?.province].filter(Boolean).join(", ");
  const since = joinedYear(profile?.createdAt);
  const stats = operator
    ? [
        { value: profile?.reviewCount ? (profile.rating || 0).toFixed(1) : "New", label: "Rating", star: true },
        { value: String(profile?.reviewCount || 0), label: profile?.reviewCount === 1 ? "Review" : "Reviews" },
        { value: String(profile?.completedJobs || profile?.totalJobsCompleted || 0), label: "Jobs done" },
      ]
    : null;
  const addressPath = operator ? "/settings/service-area" : "/settings/property?id=home";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeTabs tab="/profile">
        <Screen contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 0, gap: space.lg, paddingBottom: insets.bottom + 90 }}>
          {/* Centred: photo, name, city, role and join year. Tap the photo to change it. Shovelers get a stats card. */}
          <TabHeader
            tone={tone}
            title="Profile"
            footer={
              stats ? (
                <View style={styles.stats} accessibilityRole="summary">
                  {stats.map((stat, i) => (
                    <View key={stat.label} style={[styles.stat, i > 0 && styles.statDivider]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        {stat.star ? <Icon name="star.fill" size={15} color="#f5b301" /> : null}
                        <Text style={styles.statValue}>{stat.value}</Text>
                      </View>
                      <Text style={type.caption}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              ) : undefined
            }
          >
            <View style={{ alignItems: "center", gap: 6, paddingBottom: space.sm }}>
              <Pressable accessibilityRole="button" onPress={operator ? () => go("/settings/branding") : changePhoto} disabled={photoBusy} accessibilityLabel={operator ? "Change business logo" : "Change profile photo"}>
                <View style={styles.photoRing}>
                  <Avatar uri={(operator && profile?.logoUrl) || profile?.avatar} name={name} size={104} />
                </View>
                <View style={styles.camera}>
                  <Icon name={photoBusy ? "arrow.up" : "camera.fill"} size={14} color="#fff" />
                </View>
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Text style={styles.name} numberOfLines={2}>{name}</Text>
                {verified ? <Icon name="checkmark.seal.fill" size={20} color="#7ee2a8" /> : null}
              </View>
              {place ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="mappin" size={13} color={brand.onBlueSoft} />
                  <Text style={styles.meta} numberOfLines={1}>{place}</Text>
                </View>
              ) : null}
              <Text style={styles.meta} numberOfLines={1}>{operator ? "Shoveler" : "Customer"}{since ? ` · Joined ${since}` : ""}</Text>
            </View>
          </TabHeader>

          <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
            {(profile?.role === "admin" || user?.email?.toLowerCase() === "kacperprymicz@gmail.com") ? <Button title="Open admin dashboard" icon="list.clipboard" onPress={() => go("/admin")} /> : null}
            {/* Shovelers: see your page the way customers do. */}
            {operator ? <Button title="View public profile" icon="eye" variant="secondary" onPress={() => go(`/operator/${uid}`)} /> : null}

            {/* One next step at a time, most important first. */}
            {nudge ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`${nudge.title}. Open`} onPress={() => go(nudge.path)} style={({ pressed }) => [styles.nudge, pressed && { opacity: 0.85 }]}>
                <View style={[styles.nudgeIcon, { backgroundColor: nudge.soft }]}>
                  <Icon name={nudge.icon} size={20} color={nudge.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.headline}>{nudge.title}</Text>
                  <Text style={type.caption}>{nudge.caption}</Text>
                  {nudge.progress !== undefined ? (
                    <View style={styles.progress}>
                      <View style={{ width: `${nudge.progress}%`, height: "100%", backgroundColor: colors.accent }} />
                    </View>
                  ) : null}
                </View>
                <Icon name="chevron.right" size={13} color={colors.faint} />
              </Pressable>
            ) : null}

            {/* Your details at a glance; Edit (or any row) opens the screen that changes them. */}
            <SectionTitle
              action={
                <Pressable accessibilityRole="button" accessibilityLabel="Edit personal details" hitSlop={10} onPress={() => go("/settings/account")}>
                  <Text style={styles.edit}>Edit</Text>
                </Pressable>
              }
            >
              Personal details
            </SectionTitle>
            <Group>
              <Row icon="person.fill" label="Name" value={profile?.displayName || "Add"} onPress={() => go("/settings/account")} />
              {operator ? <Row icon="storefront.fill" label="Business" value={profile?.businessName || "Add"} onPress={() => go("/settings/account")} /> : null}
              <Row icon="phone.fill" label="Phone" value={profile?.phone || "Add"} onPress={() => go("/settings/account")} />
              <Row icon="envelope.fill" label="Email" value={profile?.email || user?.email || ""} />
              <Row icon="mappin.and.ellipse" label="Address" value={profile?.address || profile?.city || "Add"} onPress={() => go(addressPath)} last />
            </Group>

            {/* What customers see of your business, or the homes you book for. */}
            <SectionTitle>{operator ? "Your business" : "Your home"}</SectionTitle>
            <Group>
              {operator ? (
                <>
                  <Row icon="paintpalette.fill" label="Logo, photos & tagline" value={`${profile?.portfolioPhotos?.length || 0} photo${profile?.portfolioPhotos?.length === 1 ? "" : "s"}`} onPress={() => go("/settings/branding")} />
                  <Row icon="tag.fill" label="Prices and services" onPress={() => go("/settings/prices")} />
                  <Row icon="map.fill" label="Service area" value={areaLabel} onPress={() => go("/settings/service-area")} last />
                </>
              ) : (
                <>
                  <Row icon="house.fill" label="Properties" value={profile?.address ? profile.city : "Add your home"} onPress={() => go("/settings/properties")} />
                  <Row icon="photo.fill" label="Home details & photos" onPress={() => go("/settings/property?id=home")} last />
                </>
              )}
            </Group>

            <SectionTitle>Account</SectionTitle>
            <Group>
              <Row icon="creditcard.fill" label={operator ? "Payouts" : "Payments"} value={operator ? payouts : undefined} onPress={() => go(operator ? "/settings/payments" : "/settings/transactions")} />
              <Row icon="checkmark.shield.fill" label="Verification" value={verified && !transcript ? "Add transcript" : verification} onPress={() => go("/settings/verification")} />
              <Row icon="bell.fill" label="Notifications" onPress={() => go("/settings/email")} />
              <Row icon="paintbrush.fill" label="Appearance" onPress={() => go("/settings/appearance")} last />
            </Group>

            <SectionTitle>More</SectionTitle>
            <Group>
              <Row icon="qrcode" label="Invite to SNOWD" onPress={() => go("/settings/clients")} />
              <Row icon="laptopcomputer" label="Sign in on the web" onPress={() => go("/settings/web-sign-in")} />
              <Row icon="bubble.left.and.bubble.right.fill" label="Contact support" onPress={() => go("/settings/support")} />
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
  photoRing: { borderWidth: 4, borderColor: "rgba(255,255,255,0.95)", borderRadius: 60 },
  camera: { position: "absolute", right: 2, bottom: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  name: { flexShrink: 1, textAlign: "center", fontSize: 24, lineHeight: 27, fontWeight: "800", color: "#fff" },
  meta: { fontSize: 15, lineHeight: 20, color: brand.onBlueSoft },
  nudge: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow, shadowOpacity: 0.05 },
  stats: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: space.md, ...shadow, shadowOpacity: 0.08 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  statValue: { fontSize: 20, lineHeight: 24, fontWeight: "800", color: colors.ink },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: "hidden", marginTop: 6 },
  edit: { fontSize: 15, fontWeight: "600", color: colors.accent },
  nudgeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
