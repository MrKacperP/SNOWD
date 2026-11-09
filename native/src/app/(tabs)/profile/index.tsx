import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import type { OperatorProfile } from "@/lib/types";
import { Avatar, Button, Group, Icon, Row, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { choosePhoto, uploadDataUrl } from "~/lib/uploads";
import { colors, radius, space, type } from "~/lib/theme";

/** Account overview with every setting the website has, each opening a native screen. */
export default function Profile() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const [photoBusy, setPhotoBusy] = useState(false);
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

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <Screen>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <Pressable onPress={operator ? () => go("/settings/branding") : changePhoto} disabled={photoBusy} accessibilityLabel="Change profile photo">
            <Avatar uri={(operator && profile?.logoUrl) || profile?.avatar} name={profile?.businessName || profile?.displayName} size={96} />
            <View style={{ position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.bg }}>
              <Icon name={photoBusy ? "arrow.up" : "camera.fill"} size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={type.title}>{(operator && profile?.businessName) || profile?.displayName || "Your profile"}</Text>
          <Text style={type.callout}>{profile?.email || user?.email}</Text>
          {profile?.city ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="mappin" size={12} color={colors.muted} />
              <Text style={type.caption}>{[profile.city, profile.province].filter(Boolean).join(", ")} · {operator ? "Shoveler" : "Customer"}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <Button title="Edit profile" icon="pencil" small onPress={() => go("/settings/account")} />
            {operator ? <Button title="View public profile" variant="secondary" small onPress={() => go(`/operator/${uid}`)} /> : null}
          </View>
        </View>

        {missing.length ? (
          <Pressable onPress={() => go(missing[0][2])} style={({ pressed }) => [{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: 10, borderWidth: 0.5, borderColor: colors.border }, pressed && { opacity: 0.85 }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[type.headline, { flex: 1 }]}>Profile {percent}% complete</Text>
              <Icon name="chevron.right" size={13} color={colors.faint} />
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: "hidden" }}>
              <View style={{ width: `${percent}%`, height: "100%", backgroundColor: colors.accent }} />
            </View>
            <Text style={type.caption}>Add your {missing.map(([label]) => label.toLowerCase()).join(", ")}.</Text>
          </Pressable>
        ) : null}

        <SectionTitle>Account settings</SectionTitle>
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
          <Row icon="bell.fill" label="Notifications" value="Email" onPress={() => go("/settings/email")} />
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
          <Row icon="rectangle.portrait.and.arrow.right" label="Sign out" tint={colors.accent} onPress={() => Alert.alert("Sign out?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", onPress: () => void signOut() }])} />
          <Row icon="trash.fill" label="Delete account" tint={colors.danger} onPress={() => go("/settings/delete")} last />
        </Group>
        <Text style={[type.caption, { textAlign: "center" }]}>SNOWD {Constants.expoConfig?.version}</Text>
      </Screen>
    </>
  );
}
