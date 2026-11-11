import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { AppState, Linking, Text } from "react-native";
import { Group, Notice, Screen, SectionTitle, ToggleRow } from "~/components/ui";
import { registerForPush } from "~/lib/push";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { type } from "~/lib/theme";

/** Which emails SNOWD sends — the website's Settings → Notifications. Saves on every switch. */
export default function EmailSettings() {
  const { user, profile } = useAuth();
  const [prefs, setPrefs] = useState({ account: true, workOrders: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [push, setPush] = useState<string>("undetermined");

  // Re-read the phone setting whenever the person comes back from iOS Settings.
  useEffect(() => {
    const read = () => void Notifications.getPermissionsAsync().then((p) => setPush(p.status));
    read();
    const sub = AppState.addEventListener("change", (state) => state === "active" && read());
    return () => sub.remove();
  }, []);

  // iOS only lets an app ask once; after that, changes are made in Settings.
  const togglePush = async () => {
    if (push === "undetermined") {
      const result = await Notifications.requestPermissionsAsync();
      setPush(result.status);
      if (result.status === "granted" && user) await registerForPush(user.uid);
    } else void Linking.openSettings();
  };

  useEffect(() => {
    setPrefs({ account: profile?.emailNotifications?.account !== false, workOrders: profile?.emailNotifications?.workOrders !== false });
  }, [profile?.emailNotifications?.account, profile?.emailNotifications?.workOrders]);

  const set = async (key: "account" | "workOrders", value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user!.uid), { emailNotifications: next });
    } catch {
      setPrefs(previous);
      setError("Couldn’t save your email preference. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Notifications" }} />
      <Screen>
        <Text style={type.callout}>Job, message and payment updates always appear in the app under the bell on Home, and drop in as a banner while the app is open.</Text>
        <SectionTitle>On this phone</SectionTitle>
        <Group>
          <ToggleRow
            title="Phone notifications"
            body={push === "granted" ? "New messages and every job step reach your lock screen." : "Turn on to get new messages and job progress on your lock screen."}
            value={push === "granted"}
            onValueChange={() => void togglePush()}
            last
          />
        </Group>
        <SectionTitle>By email</SectionTitle>
        <Group>
          <ToggleRow title="Work-order emails" body="New requests, approvals, scheduling, arrival, completion, cancellation and payment updates." value={prefs.workOrders} disabled={saving} onValueChange={(v) => void set("workOrders", v)} />
          <ToggleRow title="Account emails" body="Welcome messages and important updates about your SNOWD account." value={prefs.account} disabled={saving} onValueChange={(v) => void set("account", v)} last />
        </Group>
        <Notice text={error} />
        <Text style={type.caption}>Emails go to {profile?.email || user?.email}. Changes save automatically.</Text>
      </Screen>
    </>
  );
}
