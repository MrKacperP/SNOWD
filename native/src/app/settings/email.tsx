import { Stack } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Group, Notice, Screen, ToggleRow } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { db } from "~/lib/firebase";
import { type } from "~/lib/theme";

/** Which emails SNOWD sends — the website's Settings → Notifications. Saves on every switch. */
export default function EmailSettings() {
  const { user, profile } = useAuth();
  const [prefs, setPrefs] = useState({ account: true, workOrders: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        <Text style={type.callout}>Job, message and payment updates always appear in the app under the bell on Home. Choose which ones also arrive by email.</Text>
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
