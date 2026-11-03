import Constants from "expo-constants";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { useState } from "react";
import { ActionSheetIOS, Alert, Pressable, Text, View } from "react-native";
import { Avatar, Button, Card, Field, Icon, Notice, Row, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { API_URL } from "~/lib/api";
import { db, storage } from "~/lib/firebase";
import { pickPhoto } from "~/lib/photos";
import { colors, space, type } from "~/lib/theme";

// Rarely used account pages open in an in-app sheet, so people never leave the app.
const openSheet = (path: string) => void WebBrowser.openBrowserAsync(`${API_URL}${path}`, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, controlsColor: colors.accent });

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    if (!name.trim()) return setError("Enter your name.");
    setBusy(true);
    try {
      await updateDoc(doc(db, "users", uid), { displayName: name.trim(), phone: phone.trim() });
      setEditing(false);
    } catch {
      setError("Couldn’t save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const changePhoto = () =>
    ActionSheetIOS.showActionSheetWithOptions({ options: ["Take photo", "Choose from library", "Cancel"], cancelButtonIndex: 2 }, async (i) => {
      if (i === 2) return;
      try {
        const data = await pickPhoto(i === 0 ? "camera" : "library", 600_000);
        if (!data) return;
        const file = ref(storage, `avatars/${uid}/avatar-${Date.now()}.jpg`);
        await uploadString(file, data, "data_url");
        await updateDoc(doc(db, "users", uid), { avatar: await getDownloadURL(file) });
      } catch (e) {
        Alert.alert("Couldn’t update photo", e instanceof Error ? e.message : "Please try again.");
      }
    });

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <Screen>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <Pressable onPress={changePhoto}>
            <Avatar uri={profile?.logoUrl || profile?.avatar} name={profile?.displayName} size={92} />
            <View style={{ position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.bg }}>
              <Icon name="camera.fill" size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={type.title}>{profile?.businessName || profile?.displayName}</Text>
          <Text style={type.callout}>{operator ? "Shoveler" : "Customer"} · {profile?.city}</Text>
        </View>

        {editing ? (
          <Card>
            <Field label="Name" value={name} onChangeText={setName} textContentType="name" />
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" />
            <Notice text={error} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(false)} />
              <Button title="Save" style={{ flex: 1 }} loading={busy} onPress={save} />
            </View>
          </Card>
        ) : null}

        <SectionTitle>Account</SectionTitle>
        <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
          <Row icon="person.fill" label="Name and phone" value={profile?.phone} onPress={() => { setName(profile?.displayName || ""); setPhone(profile?.phone || ""); setEditing(true); }} />
          <Row icon="envelope.fill" label="Email" value={profile?.email} />
          <Row icon="house.fill" label="Address" value={profile?.address} onPress={() => openSheet("/dashboard/settings/properties")} last />
        </Card>

        <SectionTitle>{operator ? "Business" : "Payments"}</SectionTitle>
        <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
          {operator ? <Row icon="person.badge.shield.checkmark.fill" label="ID verification" value={profile?.idVerified ? "Verified" : profile?.verificationStatus === "pending" ? "In review" : "Needed"} onPress={() => openSheet("/dashboard/settings")} /> : null}
          {operator ? <Row icon="tag.fill" label="Prices and services" onPress={() => openSheet("/dashboard/settings")} /> : null}
          <Row icon="creditcard.fill" label={operator ? "Payouts" : "Payment methods"} onPress={() => openSheet("/dashboard/settings/payment")} />
          <Row icon="list.bullet.rectangle.fill" label="Transactions" onPress={() => openSheet("/dashboard/transactions")} last />
        </Card>

        <SectionTitle>Support</SectionTitle>
        <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
          <Row icon="questionmark.circle.fill" label="Help and safety" onPress={() => openSheet("/mobile/settings")} />
          <Row icon="doc.text.fill" label="Terms and privacy" onPress={() => openSheet("/policies/terms")} last />
        </Card>

        <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
          <Row icon="rectangle.portrait.and.arrow.right" label="Sign out" tint={colors.accent} onPress={() => Alert.alert("Sign out?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", onPress: () => void signOut() }])} />
          <Row icon="trash.fill" label="Delete account" tint={colors.danger} onPress={() => openSheet("/account/delete")} last />
        </Card>
        <Text style={[type.caption, { textAlign: "center" }]}>SNOWD {Constants.expoConfig?.version}</Text>
      </Screen>
    </>
  );
}
