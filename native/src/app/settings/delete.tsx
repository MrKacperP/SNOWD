import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Text } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { supportEmail } from "@/lib/mobilePolicies";
import { Button, Card, Field, Icon, Notice } from "~/components/ui";
import { friendlyAuthError, useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { colors, space, type } from "~/lib/theme";

/** Self-service deletion request, same server route and rules as the website's /account/delete. */
export default function DeleteAccount() {
  const router = useRouter();
  const { confirmIdentity, signOut } = useAuth();
  const [requested, setRequested] = useState<{ status: string | null; dueAt: string | null } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    api<{ status: string | null; dueAt: string | null }>("/api/account/deletion-request").then(setRequested).catch(() => setRequested({ status: null, dueAt: null }));
  }, []);

  const submit = async () => {
    setError("");
    setNeedsSignIn(false);
    setBusy(true);
    try {
      // Apple requires apps to revoke Sign in with Apple when an account is deleted; this also proves a recent sign-in.
      const confirmed = await confirmIdentity({ revokeApple: true });
      if (!confirmed) return;
      await api("/api/account/deletion-request", { confirmation, appleRevocationReported: true });
      setRequested({ status: "requested", dueAt: null });
    } catch (e) {
      const message = friendlyAuthError(e);
      if (/sign in again/i.test(message)) setNeedsSignIn(true);
      setError(message || "Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const done = requested?.status;

  return (
    <>
      <Stack.Screen options={{ title: "Delete account" }} />
      <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        {done ? (
          <Card style={{ alignItems: "center" }}>
            <Icon name="checkmark.circle.fill" size={40} color={colors.mint} />
            <Text style={type.title}>Request received</Text>
            <Text style={[type.callout, { textAlign: "center" }]}>
              Support will process your request within 30 days{requested?.dueAt ? ` (by ${new Date(requested.dueAt).toLocaleDateString("en-CA", { month: "long", day: "numeric" })})` : ""} and contact you about any records that must be kept or jobs still open. You can keep using your account until then.
            </Text>
            <Button title="Back to profile" variant="secondary" onPress={() => router.back()} style={{ alignSelf: "stretch" }} />
          </Card>
        ) : (
          <>
            <Text style={type.body}>Request permanent deletion of your SNOWD sign-in, profile and personal uploads. Support reviews related messages and records and processes requests within 30 days.</Text>
            <Text style={type.callout}>Financial, fraud-prevention, legal and unresolved-dispute records may need to be kept. Support will explain any exception. Your account stays open while the request is processed.</Text>
            <Notice tone="orange" text="Deletion can’t be undone once completed. Finish or cancel open jobs first; this request doesn’t cancel or refund a job by itself." />
            <Card>
              <Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} autoComplete="off" />
              <Notice text={error} />
              {needsSignIn ? <Button title="Sign out to sign in again" variant="secondary" onPress={() => void signOut()} /> : null}
              <Button title="Request permanent deletion" variant="danger" icon="trash" loading={busy} disabled={confirmation !== "DELETE"} onPress={submit} />
              <Text style={type.caption}>You’ll be asked to confirm with Apple or your password first.</Text>
            </Card>
            <Button title="Keep my account" variant="secondary" onPress={() => router.back()} />
          </>
        )}
        <Text style={[type.caption, { textAlign: "center" }]} onPress={() => void Linking.openURL(`mailto:${supportEmail}`)}>
          Need help? Contact {supportEmail}
        </Text>
      </KeyboardAwareScrollView>
    </>
  );
}
