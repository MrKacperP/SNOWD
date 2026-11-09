import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { Linking, Text } from "react-native";
import { supportEmail } from "@/lib/mobilePolicies";
import { Card, Group, Row, Screen, SectionTitle } from "~/components/ui";
import { colors, type } from "~/lib/theme";

/** Help, permissions and policies — the website's App & privacy page. */
export default function Privacy() {
  const router = useRouter();
  const policy = (name: string) => router.push(`/settings/policy?policy=${name}`);
  return (
    <>
      <Stack.Screen options={{ title: "Help & privacy" }} />
      <Screen>
        <SectionTitle>Get help</SectionTitle>
        <Group>
          <Row icon="envelope.fill" label="Email support" value={supportEmail} onPress={() => void Linking.openURL(`mailto:${supportEmail}`)} />
          <Row icon="questionmark.circle.fill" label="Help & reporting" onPress={() => policy("support")} last />
        </Group>

        <SectionTitle>Permissions</SectionTitle>
        <Card>
          <Text style={type.callout}>Location is asked for only when you share your journey or use your current address. You can always type an address instead.</Text>
          <Text style={type.callout}>Only the photos you pick are uploaded. The camera is used only when you choose to take a photo.</Text>
        </Card>
        <Group>
          <Row icon="gearshape.fill" label="Open iPhone Settings" onPress={() => void Linking.openSettings()} last />
        </Group>

        <SectionTitle>Payments & policies</SectionTitle>
        <Group>
          <Row icon="creditcard.fill" label="Payments, cancellations & refunds" onPress={() => policy("payments")} />
          <Row icon="hand.raised.fill" label="Privacy & your data" onPress={() => policy("privacy")} />
          <Row icon="doc.text.fill" label="Terms of service" onPress={() => policy("terms")} last />
        </Group>

        <SectionTitle>Your account</SectionTitle>
        <Group>
          <Row icon="trash.fill" label="Delete account & data" tint={colors.danger} onPress={() => router.push("/settings/delete")} last />
        </Group>
        <Text style={[type.caption, { textAlign: "center" }]}>SNOWD {Constants.expoConfig?.version}</Text>
      </Screen>
    </>
  );
}
