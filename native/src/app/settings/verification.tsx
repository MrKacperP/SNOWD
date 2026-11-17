import { Image } from "expo-image";
import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { isOperatorPublic } from "@/lib/operatorDiscovery";
import type { OperatorProfile } from "@/lib/types";
import { Badge, Button, Card, Icon, Notice, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { idState, useVerificationUpload } from "~/lib/verification";
import { colors, radius, space, type } from "~/lib/theme";

const isPdf = (url: string) => /\.pdf|application%2Fpdf/i.test(url);

/** Why a student should send their transcript: shown as a short list on the Students card. */
const STUDENT_PERKS: { icon: Parameters<typeof Icon>[0]["name"]; text: string }[] = [
  { icon: "tag.fill", text: "Student promotions and lower fees" },
  { icon: "checkmark.seal.fill", text: "A Student badge on your profile" },
  { icon: "star.fill", text: "Shown first to customers who want to hire students" },
];

/** Government ID and student transcript uploads — the website's Settings → Verification. */
export default function VerificationSettings() {
  const { profile } = useAuth();
  const operator = profile?.role === "operator";
  const state = idState(profile);
  const { busy, error, failed, uploadId, uploadTranscript } = useVerificationUpload();
  const isPublic = operator && isOperatorPublic(profile as OperatorProfile);
  const transcript = profile?.studentTranscriptUrl || "";

  const idBadge =
    state === "verified" ? <Badge label="Verified" tone="green" /> : state === "rejected" ? <Badge label="Rejected" tone="red" /> : state === "pending" ? <Badge label="Pending review" tone="orange" /> : <Badge label="Not submitted" />;

  const publicNote =
    state === "verified" && profile?.isAvailable === false
      ? "Your ID is verified. Turn on availability from Home to appear in nearby searches."
      : state === "rejected"
        ? "Your previous submission was rejected. Review the feedback below and upload a new ID photo."
        : state === "missing"
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
            <Text style={[type.headline, { flex: 1 }]}>ID verification</Text>
            {idBadge}
          </View>
          <Text style={type.callout}>A photo of your driver’s licence, passport or other government ID. It’s only used to verify your address and identity{operator ? ", and is needed before customers can book you" : ""}.</Text>
          {state === "rejected" && profile?.verificationNote ? (
            <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md, gap: 4 }}>
              <Text style={[type.overline, { color: colors.danger }]}>Feedback from SNOWD</Text>
              <Text style={{ color: colors.danger, fontSize: 15 }}>{profile.verificationNote}</Text>
            </View>
          ) : null}
          {profile?.idPhotoUrl && !isPdf(profile.idPhotoUrl) ? <Image source={{ uri: profile.idPhotoUrl }} style={{ width: "100%", aspectRatio: 1.6, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} contentFit="cover" /> : null}
          {state !== "verified" ? (
            <Button title={state === "rejected" ? "Upload a new ID photo" : state === "pending" ? "Replace photo" : "Upload ID photo"} icon="camera.fill" loading={busy === "id"} disabled={!!busy} onPress={() => void uploadId()} />
          ) : null}
          {failed === "id" ? <Notice text={error} /> : null}
        </Card>

        {/* Students: a transcript proves it, and unlocks student promotions. */}
        <Card style={{ backgroundColor: transcript ? colors.mintSoft : colors.accentSoft, borderColor: transcript ? "#bfe3d5" : "#d6defe" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: transcript ? colors.mint : colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Icon name="graduationcap.fill" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.overline}>For students</Text>
              <Text style={type.headline}>{transcript ? "Transcript sent" : "Are you a student? Upload your transcript"}</Text>
            </View>
            {transcript ? <Badge label="In review" tone="green" /> : null}
          </View>
          <Text style={type.callout}>
            {transcript
              ? "Thanks. Once SNOWD confirms you’re a student, your student promotions turn on automatically."
              : `A photo of your transcript, latest report card or student card confirms you’re a student${operator ? " to customers" : ""} and gets you better promotions.`}
          </Text>
          <View style={{ gap: 8 }}>
            {STUDENT_PERKS.filter((p) => operator || p.icon === "tag.fill").map((p) => (
              <View key={p.text} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name={p.icon} size={15} color={transcript ? colors.mint : colors.accent} />
                <Text style={[type.body, { flex: 1 }]}>{p.text}</Text>
              </View>
            ))}
          </View>
          {transcript && !isPdf(transcript) ? <Image source={{ uri: transcript }} style={{ width: "100%", aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} contentFit="cover" /> : null}
          {transcript && isPdf(transcript) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="doc.fill" size={16} color={colors.muted} />
              <Text style={type.caption}>PDF uploaded</Text>
            </View>
          ) : null}
          <Button title={transcript ? "Replace transcript" : "Upload transcript"} icon="doc.viewfinder" variant={transcript ? "secondary" : "primary"} loading={busy === "transcript"} disabled={!!busy} onPress={() => void uploadTranscript()} />
          {failed === "transcript" ? <Notice text={error} /> : null}
          <Text style={type.caption}>Photos, scans and PDFs all work. Only SNOWD’s team sees it.</Text>
        </Card>
      </Screen>
    </>
  );
}
