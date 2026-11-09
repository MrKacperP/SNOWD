import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { Avatar, Button, Card, Empty, Notice, Screen } from "~/components/ui";
import { api } from "~/lib/api";
import { type } from "~/lib/theme";

type NearbyClient = { uid: string; displayName: string; city: string; distanceKm: number | null };

/** Customers inside the shoveler's service area, with an invite to book — the website's Nearby clients. */
export default function NearbyClients() {
  const router = useRouter();
  const [clients, setClients] = useState<NearbyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setClients((await api<{ clients: NearbyClient[] }>("/api/operators/nearby-clients")).clients);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load nearby clients.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (clientId: string) => {
    setBusy(clientId);
    setError("");
    try {
      await api("/api/operators/nearby-clients", { clientId });
      setInvited((list) => [...list, clientId]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send the invitation.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Nearby clients" }} />
      <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        <Text style={type.callout}>Customers inside your service area can see you too. Invite them to choose a service, date and payment method.</Text>
        <Notice text={error} />
        {!loading && !error && !clients.length ? (
          <Empty icon="person.2" title="No clients in your area yet" body="Check your base address and service area." action={<Button title="Edit service area" small onPress={() => router.push("/settings/service-area")} />} />
        ) : null}
        {clients.map((c) => (
          <Card key={c.uid} style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar name={c.displayName} size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.headline} numberOfLines={1}>{c.displayName || "Client"}</Text>
              <Text style={type.caption}>{c.city}{c.distanceKm !== null ? ` · ${c.distanceKm.toFixed(1)} km away` : ""}</Text>
            </View>
            <Button small title={invited.includes(c.uid) ? "Invited" : "Invite"} icon={invited.includes(c.uid) ? "checkmark" : "paperplane.fill"} variant={invited.includes(c.uid) ? "secondary" : "primary"} disabled={busy !== null || invited.includes(c.uid)} loading={busy === c.uid} onPress={() => void invite(c.uid)} />
          </Card>
        ))}
      </Screen>
    </>
  );
}
