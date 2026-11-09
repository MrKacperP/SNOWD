import { Stack, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Button, Card, Field, Notice, PhotoGrid, SaveBar } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { choosePhoto, uploadDataUrl } from "~/lib/uploads";
import { colors, space, type } from "~/lib/theme";

/** Photo, logo, tagline and portfolio shown on the public profile — the website's Settings → Branding. */
export default function BrandingSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const [avatar, setAvatar] = useState(profile?.avatar || "");
  const [logo, setLogo] = useState(profile?.logoUrl || "");
  const [tagline, setTagline] = useState(profile?.tagline || "");
  const [about, setAbout] = useState(profile?.brandDescription || "");
  const [portfolio, setPortfolio] = useState<string[]>(profile?.portfolioPhotos || []);
  const [uploading, setUploading] = useState<"" | "avatar" | "logo" | "portfolio">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const owner = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || owner.current === profile.uid) return;
    owner.current = profile.uid;
    setAvatar(profile.avatar || "");
    setLogo(profile.logoUrl || "");
    setTagline(profile.tagline || "");
    setAbout(profile.brandDescription || "");
    setPortfolio(profile.portfolioPhotos || []);
  }, [profile]);

  const dirty =
    avatar !== (profile?.avatar || "") || logo !== (profile?.logoUrl || "") || tagline !== (profile?.tagline || "") ||
    about !== (profile?.brandDescription || "") || JSON.stringify(portfolio) !== JSON.stringify(profile?.portfolioPhotos || []);

  const upload = async (kind: "avatar" | "logo" | "portfolio") => {
    setError("");
    try {
      const data = await choosePhoto(kind === "logo" ? "Business logo" : kind === "avatar" ? "Profile photo" : "Portfolio photo");
      if (!data) return;
      setUploading(kind);
      const url = await uploadDataUrl(`branding/${uid}/${kind}`, data);
      if (kind === "avatar") setAvatar(url);
      else if (kind === "logo") setLogo(url);
      else setPortfolio((list) => [...list, url].slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading("");
    }
  };

  const save = async () => {
    setError("");
    setDone("");
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), { avatar, logoUrl: logo, tagline: tagline.trim(), brandDescription: about.trim(), portfolioPhotos: portfolio });
      setDone("Business profile saved. Customers can see your changes now.");
    } catch {
      setError("Couldn’t save your business profile. Your changes are still here; please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: "Business profile",
          headerRight: () => <Button title="Preview" variant="ghost" small onPress={() => router.push(`/operator/${uid}`)} />,
        }}
      />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" bottomOffset={90} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}>
        <Card>
          <Text style={type.headline}>Photos</Text>
          {(
            [
              ["avatar", "Profile photo", avatar, "Your face helps customers recognize you on arrival."],
              ["logo", "Business logo", logo, "Shown on your public profile and job cards."],
            ] as const
          ).map(([kind, label, uri, note]) => (
            <View key={kind} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Pressable onPress={() => void upload(kind)} disabled={!!uploading}>
                <Avatar uri={uri} name={kind === "logo" ? profile?.businessName : profile?.displayName} size={64} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.headline}>{label}</Text>
                <Text style={type.caption}>{note}</Text>
                <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                  <Pressable onPress={() => void upload(kind)} disabled={!!uploading}>
                    <Text style={{ color: colors.accent, fontWeight: "700" }}>{uploading === kind ? "Uploading…" : uri ? "Change" : "Upload"}</Text>
                  </Pressable>
                  {uri ? (
                    <Pressable onPress={() => (kind === "logo" ? setLogo("") : setAvatar(""))}>
                      <Text style={{ color: colors.danger, fontWeight: "700" }}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={type.headline}>Business identity</Text>
          <Field label="Business tagline" value={tagline} onChangeText={setTagline} maxLength={80} hint={`${tagline.length}/80 characters`} placeholder="Reliable driveway clearing in Mississauga" />
          <Field label="About your business" value={about} onChangeText={setAbout} multiline maxLength={500} hint={`${about.length}/500 characters`} />
        </Card>

        <Card>
          <Text style={type.headline}>Work portfolio</Text>
          <Text style={type.caption}>Show your best work: before and after photos, finished jobs and your equipment. Up to 12 photos.</Text>
          <PhotoGrid
            photos={portfolio}
            max={12}
            busy={uploading === "portfolio"}
            onAdd={() => void upload("portfolio")}
            onRemove={(i) => Alert.alert("Remove this photo?", "", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => setPortfolio((list) => list.filter((_, idx) => idx !== i)) }])}
          />
        </Card>
        <Notice text={error} />
        <Notice tone="green" text={done} />
      </KeyboardAwareScrollView>
      <SaveBar dirty={dirty && !uploading} saving={saving} onSave={save} title="Save profile" bottomInset={insets.bottom} />
    </View>
  );
}
