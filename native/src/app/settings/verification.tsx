import { Image } from "expo-image";
import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Text, View } from "react-native";
import { isOperatorPublic } from "@/lib/operatorDiscovery";
import type { OperatorProfile } from "@/lib/types";
import { Badge, Button, Card, Icon, Notice, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { notifyAdmin } from "~/lib/admin";
import { db } from "~/lib/firebase";
import { chooseUpload, storageName, uploadFile } from "~/lib/uploads";
import { colors, radius, space, type } from "~/lib/theme";

/** Government ID and student transcript uploads — the website's Settings → Verification. */
export default function VerificationSettings() {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const status = profile?.verificationStatus;
  const [busy, setBusy] = useState<"" | "id" | "transcript">("");
  const [error, setError] = useState("");
  const isPublic = operator && isOperatorPublic(profile as OperatorProfile);

  // Photos go up as JPEGs; documents (PDF, Word…) keep their own type and name.
  const uploadPicked = (picked: NonNullable<Awaited<ReturnType<typeof chooseUpload>>>, base: string) =>
    picked.kind === "photo"
      ? uploadFile(`verification/${uid}`, picked.uri, { name: `${base}.jpg` })
      : uploadFile(`verification/${uid}`, picked.file.uri, { name: `${base}-${storageName(picked.file.name)}`, contentType: picked.file.mimeType });

  const uploadId = async () => {
    setError("");
    try {
      // A full-size photo keeps the fine print readable; a scan or PDF from Files works too.
      const picked = await chooseUpload("Government ID", { files: true });
      if (!picked) return;
      setBusy("id");
      const url = await uploadPicked(picked, "id-photo");
      await updateDoc(doc(db, "users", uid), { idPhotoUrl: url, idVerified: false, accountApproved: false, verificationStatus: "pending", verificationNote: "" });
      notifyAdmin({ type: "document_uploaded", message: `ID document uploaded by ${profile?.displayName || profile?.email}`, uid, meta: { name: profile?.displayName || "", email: profile?.email || "" } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your ID couldn’t be uploaded. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const uploadTranscript = async () => {
    setError("");
    try {
      const picked = await chooseUpload("Transcript or report card", { files: true });
      if (!picked) return;
      setBusy("transcript");
      const url = await uploadPicked(picked, "transcript");
      await updateDoc(doc(db, "users", uid), { studentTranscriptUrl: url });
      notifyAdmin({ type: "document_uploaded", message: `Student transcript uploaded by ${profile?.displayName || profile?.email}`, uid, meta: { name: profile?.displayName || "", email: profile?.email || "" } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your transcript couldn’t be uploaded. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const idBadge = profile?.idVerified ? (
    <Badge label="Verified" tone="green" />
  ) : status === "rejected" ? (
    <Badge label="Rejected" tone="red" />
  ) : profile?.idPhotoUrl ? (
    <Badge label="Pending review" tone="orange" />
  ) : (
    <Badge label="Not submitted" />
  );

  const publicNote =
    profile?.idVerified && profile?.isAvailable === false
      ? "Your ID is verified. Turn on availability from Home to appear in nearby searches."
      : status === "rejected"
        ? "Your previous submission was rejected. Review the feedback below and upload a new ID photo."
        : !profile?.idPhotoUrl
          ? "Upload your government ID below to start verification."
          : "Your ID is under review. Once approved, your account goes public.";

  return (
    <>
      <Stack.Screen options={{ title: "Verification" }} />
      <Screen>
        {operator ? (
          <Card style={{ backgroundColor: isPublic ? colors.mintSoft : colors.sunSoft, borderColor: isPublic ? "#bfe3d5" : colors.sunBorder, flexDirection: "row", alignItems: "center" }}>
            <Icon name={isPublic ? "checkmark.shield.fill" : "shield.lefthalf.filled"} size={26} color={isPublic ? colors.mint : colors.sunText} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.headline}>{isPublic ? "Your account is public" : "Not public yet"}</Text>
              <Text style={type.caption}>{isPublic ? "You’re verified and visible to customers. You can receive jobs." : publicNote}</Text>
            </View>
          </Card>
        ) : null}

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="person.text.rectangle.fill" size={20} color={colors.accent} />
            <Text style={[type.headline, { flex: 1 }]}>Government ID</Text>
            {idBadge}
          </View>
          <Text style={type.callout}>
            A clear photo of your driver’s licence, passport or other government ID{operator ? " — required for your account to go public." : " to get verified and build trust."}
          </Text>
          {status === "rejected" && profile?.verificationNote ? (
            <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md, gap: 4 }}>
              <Text style={[type.overline, { color: colors.danger }]}>Feedback from SNOWD</Text>
              <Text style={{ color: colors.danger, fontSize: 15 }}>{profile.verificationNote}</Text>
            </View>
          ) : null}
          {profile?.idPhotoUrl ? <Image source={{ uri: profile.idPhotoUrl }} style={{ width: "100%", aspectRatio: 1.6, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} contentFit="cover" /> : null}
          {!profile?.idVerified ? (
            <Button title={status === "rejected" ? "Upload a new ID photo" : profile?.idPhotoUrl ? "Replace photo" : "Upload ID photo"} icon="camera.fill" loading={busy === "id"} disabled={!!busy} onPress={uploadId} />
          ) : null}
          <Text style={type.caption}>Only SNOWD’s verification team sees your ID.</Text>
        </Card>

        {operator ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="graduationcap.fill" size={20} color={colors.accent} />
              <Text style={[type.headline, { flex: 1 }]}>Student transcript</Text>
              <Badge label={profile?.studentTranscriptUrl ? "Uploaded" : "Optional"} tone={profile?.studentTranscriptUrl ? "green" : "gray"} />
            </View>
            <Text style={type.callout}>A photo of your transcript or latest report card shows customers you’re a student and may qualify you for student promotions.</Text>
            {profile?.studentTranscriptUrl && !/\.pdf|application%2Fpdf/.test(profile.studentTranscriptUrl) ? (
              <Image source={{ uri: profile.studentTranscriptUrl }} style={{ width: "100%", aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} contentFit="cover" />
            ) : null}
            <Button title={profile?.studentTranscriptUrl ? "Replace transcript" : "Upload transcript"} icon="doc.viewfinder" variant="secondary" loading={busy === "transcript"} disabled={!!busy} onPress={uploadTranscript} />
          </Card>
        ) : null}
        <Notice text={error} />
      </Screen>
    </>
  );
}
