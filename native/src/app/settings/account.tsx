import { Stack } from "expo-router";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Card, Field, Icon, Notice, SaveBar } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { notifyAdmin } from "~/lib/admin";
import { choosePhoto, uploadDataUrl } from "~/lib/uploads";
import { colors, space, type } from "~/lib/theme";

/** Name, phone and contact details — the website's Settings → Account. */
export default function AccountSettings() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const [name, setName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [businessName, setBusinessName] = useState(profile?.businessName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  // Fill the form once per account so live profile updates never overwrite typing.
  const owner = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || owner.current === profile.uid) return;
    owner.current = profile.uid;
    setName(profile.displayName || "");
    setPhone(profile.phone || "");
    setAge(profile.age ? String(profile.age) : "");
    setBusinessName(profile.businessName || "");
    setBio(profile.bio || "");
  }, [profile]);

  const ageNumber = age.trim() ? parseInt(age, 10) : null;
  const dirty =
    name !== (profile?.displayName || "") ||
    phone !== (profile?.phone || "") ||
    (operator ? businessName !== (profile?.businessName || "") || bio !== (profile?.bio || "") : (ageNumber ?? null) !== (profile?.age ?? null));

  const save = async () => {
    setError("");
    setSaved("");
    if (!name.trim()) return setError("Enter your full name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter a 10-digit phone number.");
    if (!operator && ageNumber !== null && (Number.isNaN(ageNumber) || ageNumber < 13 || ageNumber > 120)) return setError("Enter an age from 13 to 120, or leave it blank.");
    if (operator && !businessName.trim()) return setError("Enter your business name. Customers see it on your profile.");
    if (operator && !bio.trim()) return setError("Add a short bio so customers know who you are.");
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { displayName: name.trim(), phone: phone.trim() };
      if (operator) Object.assign(updates, { businessName: businessName.trim(), bio: bio.trim() });
      else Object.assign(updates, { age: ageNumber, simplifiedMode: !!(ageNumber && ageNumber >= 55) });
      await updateDoc(doc(db, "users", uid), updates);
      notifyAdmin({ type: "profile_saved", message: `Profile updated by ${name.trim() || profile?.email}`, uid, meta: { name: name.trim(), email: profile?.email || "" } });
      setSaved("Your details are saved.");
    } catch {
      setError("Couldn’t save your changes. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

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

  const removePhoto = () =>
    Alert.alert("Remove profile photo?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void updateDoc(doc(db, "users", uid), { avatar: deleteField() }).catch(() => {}) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Account" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}>
        {!operator ? (
          <Card style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={changePhoto} disabled={photoBusy}>
              <Avatar uri={profile?.avatar} name={profile?.displayName} size={64} />
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={type.headline}>Profile photo</Text>
              <Text style={type.caption}>Shown on your contact card and in Messages. Saves as soon as you choose it.</Text>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                <Pressable accessibilityRole="button" hitSlop={12} onPress={changePhoto} disabled={photoBusy}><Text style={{ color: colors.accent, fontWeight: "700" }}>{photoBusy ? "Uploading…" : profile?.avatar ? "Change" : "Add photo"}</Text></Pressable>
                {profile?.avatar ? <Pressable accessibilityRole="button" hitSlop={12} onPress={removePhoto}><Text style={{ color: colors.danger, fontWeight: "700" }}>Remove</Text></Pressable> : null}
              </View>
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={type.headline}>Your details</Text>
          <Field label="Full name" value={name} onChangeText={setName} textContentType="name" autoComplete="name" />
          <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" />
          <Field label="Email" value={user?.email || profile?.email || ""} editable={false} style={{ color: colors.muted, backgroundColor: colors.surfaceAlt }} hint="Your sign-in email can’t be changed here." />
          {operator ? (
            <>
              <Field label="Business name" value={businessName} onChangeText={setBusinessName} textContentType="organizationName" />
              <Field label="Short bio for clients" value={bio} onChangeText={setBio} multiline maxLength={500} hint={`${bio.length}/500`} />
            </>
          ) : (
            <Field label="Age (optional)" value={age} onChangeText={(v) => setAge(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={3} hint="Ages 55+ get the simplified dashboard on the website." />
          )}
        </Card>

        {operator ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 4 }}>
            <Icon name="info.circle" size={14} color={colors.muted} />
            <Text style={[type.caption, { flex: 1 }]}>Change your photo, logo and portfolio in Business profile.</Text>
          </View>
        ) : null}
        <Notice text={error} />
        <Notice tone="green" text={saved} />
      </KeyboardAwareScrollView>
      <SaveBar dirty={dirty} saving={saving} onSave={save} bottomInset={insets.bottom} />
    </View>
  );
}
