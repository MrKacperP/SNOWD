import { Stack, useFocusEffect, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, Text, View } from "react-native";
import { profileLocation, propertyUse } from "@/lib/serviceLocations";
import { PROPERTY_USES, type ClientProfile } from "@/lib/types";
import { Button, Card, Empty, Group, Notice, PhotoGrid, Row, Screen, SectionTitle } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { useProperties } from "~/lib/properties";
import { chooseUpload, uploadFile } from "~/lib/uploads";
import { type } from "~/lib/theme";

const USE_ICONS = { home: "house.fill", rental: "key.fill", business: "building.2.fill", cottage: "tree.fill", other: "mappin.circle.fill" } as const;

/** Main house, other saved properties and clearing-area photos — the website's Settings → Properties. */
export default function PropertiesSettings() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const home = profileLocation(profile as Partial<ClientProfile> | null);
  const { properties, loading, error, reload } = useProperties(profile?.role === "client");
  const photos = profile?.propertyDetails?.photos || [];
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Coming back from the editor shows its saved changes.
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const savePhotos = async (next: string[]) => {
    await updateDoc(doc(db, "users", uid), { "propertyDetails.photos": next });
  };

  const addPhoto = async () => {
    setPhotoError("");
    try {
      const picked = await chooseUpload("Property photo");
      if (picked?.kind !== "photo") return;
      setBusy(true);
      // Full size, so shovelers can zoom in on the driveway and walkways.
      const url = await uploadFile(`property-photos/${uid}`, picked.uri);
      await savePhotos([...photos, url].slice(0, 6));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Property photos could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (index: number) =>
    Alert.alert("Remove this photo?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void savePhotos(photos.filter((_, i) => i !== index)).catch(() => setPhotoError("The photo could not be removed. Please try again.")) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: "Properties", headerRight: () => <Button title="Add" icon="plus" variant="ghost" small onPress={() => router.push("/settings/property?id=new")} /> }} />
      <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={() => void reload()} />}>
        <SectionTitle>Main house</SectionTitle>
        <Group>
          <Row icon="house.fill" label={home ? home.address : "Add your main house"} value={home ? home.city : undefined} onPress={() => router.push("/settings/property?id=home")} last />
        </Group>
        <Text style={type.caption}>Your profile home. Shovelers see it when you book.</Text>

        <SectionTitle>Other properties</SectionTitle>
        <Notice text={error} />
        {!loading && !properties.length ? (
          <Card>
            <Empty icon="building.2" title="No other properties yet" body="Save rentals, a cottage or your business so you can book clearing there in a tap." action={<Button title="Add a property" icon="plus" small onPress={() => router.push("/settings/property?id=new")} />} />
          </Card>
        ) : null}
        {properties.length ? (
          <Group>
            {properties.map((p, i) => {
              const use = propertyUse(p);
              return (
                <Row
                  key={p.id}
                  icon={USE_ICONS[use]}
                  label={p.label}
                  value={PROPERTY_USES.find(([u]) => u === use)?.[1]}
                  onPress={() => router.push(`/settings/property?id=${encodeURIComponent(p.id)}`)}
                  last={i === properties.length - 1}
                />
              );
            })}
          </Group>
        ) : null}
        {properties.length ? <Text style={type.caption}>{properties.length} saved · tap one to edit, move or remove it.</Text> : null}

        <SectionTitle>Property photos</SectionTitle>
        <Card>
          <Text style={type.callout}>Driveway or clearing-area photos so shovelers know what to expect. Up to 6.</Text>
          <PhotoGrid photos={photos} max={6} busy={busy} onAdd={() => void addPhoto()} onRemove={removePhoto} />
          <Notice text={photoError} />
        </Card>
      </Screen>
    </>
  );
}
