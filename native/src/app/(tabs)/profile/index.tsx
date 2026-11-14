import Constants from "expo-constants";
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

/** Account overview with every setting the website has, each opening a native screen. */
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

  const verification = profile?.idVerified ? "Verified" : profile?.verificationStatus === "rejected" ? "Action needed" : profile?.idPhotoUrl ? "In review" : operator ? "Needed" : "Optional";
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

  const verified = !!profile?.idVerified;
  const inReview = !verified && profile?.verificationStatus !== "rejected" && !!profile?.idPhotoUrl;
  const name = (operator && profile?.businessName) || profile?.displayName || "Your profile";
  const place = operator ? [profile?.city, profile?.province].filter(Boolean).join(", ") : [profile?.address, profile?.city].filter(Boolean).join(", ");
  const stats = operator ? [profile?.reviewCount ? `★ ${(profile.rating || 0).toFixed(1)}` : "New", `${profile?.completedJobs || profile?.totalJobsCompleted || 0} jobs done`].join(" · ") : profile?.city || "";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeTabs tab="/profile">
        <Screen contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 0, gap: space.lg, paddingBottom: insets.bottom + 90 }}>
          {/* Centred: photo, then name, address and who you are. Tap the photo to change it. */}
          <TabHeader tone={tone} title="Profile">
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
              <Text style={styles.meta} numberOfLines={1}>{operator ? "Shoveler" : "Customer"}{stats ? ` · ${stats}` : ""}</Text>
            </View>
          </TabHeader>

          <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
            {(profile?.role === "admin" || user?.email?.toLowerCase() === "kacperprymicz@gmail.com") ? <Button title="Open admin dashboard" icon="list.clipboard" onPress={() => go("/admin")} /> : null}
            {/* Change your profile, and (for shovelers) see it the way customers do. */}
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button title="Edit profile" icon="pencil" style={{ flex: 1 }} onPress={() => go(operator ? "/settings/branding" : "/settings/account")} />
              {operator ? <Button title="Customer view" icon="eye" variant="secondary" style={{ flex: 1 }} onPress={() => go(`/operator/${uid}`)} /> : null}
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Invite people to SNOWD with your link or QR code" onPress={() => go("/settings/clients")} style={({ pressed }) => [styles.verify, pressed && { opacity: 0.85 }]}>
              <View style={[styles.verifyIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name="qrcode" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.headline}>Invite to SNOWD</Text>
                <Text style={type.caption}>{operator ? "Your QR code and link: customers get the app with you saved." : "Your QR code and link: share SNOWD with you as a contact."}</Text>
              </View>
              <Icon name="chevron.right" size={13} color={colors.faint} />
            </Pressable>

            <Button title="Contact support" icon="bubble.left.and.bubble.right" variant="secondary" onPress={() => go("/settings/support")} />

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

            {/* Verification in one card: a clear next step until it's done. */}
            {!verified ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Verification: ${verification}. Open`} onPress={() => go("/settings/verification")} style={({ pressed }) => [styles.verify, pressed && { opacity: 0.85 }]}>
                <View style={[styles.verifyIcon, { backgroundColor: inReview ? colors.accentSoft : stepColor("pending").soft }]}>
                  <Icon name={inReview ? "hourglass" : "person.badge.shield.checkmark.fill"} size={20} color={inReview ? colors.accent : stepColor("pending").text} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.headline}>{inReview ? "Verification in review" : profile?.verificationStatus === "rejected" ? "Verification needs another look" : "Verify your profile"}</Text>
                  <Text style={type.caption}>{inReview ? "We’ll let you know as soon as it’s checked." : operator ? "Upload a photo ID so customers can book you with confidence." : "Optional: add a photo ID for a verified badge."}</Text>
                </View>
                <Icon name="chevron.right" size={13} color={colors.faint} />
              </Pressable>
            ) : null}

            {missing.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Profile ${percent}% complete. Finish your profile`} onPress={() => go(missing[0][2])} style={({ pressed }) => [styles.verify, { flexDirection: "column", alignItems: "stretch", gap: 10 }, pressed && { opacity: 0.85 }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[type.headline, { flex: 1 }]}>Profile {percent}% complete</Text>
                  <Icon name="chevron.right" size={13} color={colors.faint} />
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden" }}>
                  <View style={{ width: `${percent}%`, height: "100%", backgroundColor: colors.accent }} />
                </View>
                <Text style={type.caption}>Add your {missing.map(([label]) => label.toLowerCase()).join(", ")}.</Text>
              </Pressable>
            ) : null}

            <SectionTitle>Settings</SectionTitle>
            <Group>
              <Row icon="person.fill" label="Account" value={profile?.phone ? "Name, phone" : "Add phone"} onPress={() => go("/settings/account")} />
              <Row icon="creditcard.fill" label={operator ? "Payouts" : "Payments"} value={operator ? payouts : undefined} onPress={() => go(operator ? "/settings/payments" : "/settings/transactions")} />
              <Row icon="checkmark.shield.fill" label="Verification" value={verification} onPress={() => go("/settings/verification")} />
              <Row icon="bell.fill" label="Notifications" onPress={() => go("/settings/email")} />
              <Row icon="paintbrush.fill" label="Appearance" value="Colours & theme" onPress={() => go("/settings/appearance")} />
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
  verify: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow, shadowOpacity: 0.05 },
  verifyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
