import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { mobilePolicies, policyDate } from "@/lib/mobilePolicies";
import { Chip, Empty, Screen } from "~/components/ui";
import { type } from "~/lib/theme";

/** Policy text shared with the website (src/lib/mobilePolicies.ts), so both always match. */
export default function Policy() {
  const { policy = "terms" } = useLocalSearchParams<{ policy?: string }>();
  const router = useRouter();
  const doc = mobilePolicies[policy];
  return (
    <>
      <Stack.Screen options={{ title: doc?.title || "Policy" }} />
      <Screen>
        {!doc ? (
          <Empty icon="doc.questionmark" title="Policy not found" />
        ) : (
          <>
            <Text style={type.caption}>Updated {policyDate}</Text>
            {doc.sections.map((section) => (
              <View key={section.title} style={{ gap: 6 }}>
                <Text style={type.headline}>{section.title}</Text>
                <Text style={[type.body, { color: "#2c4552" }]}>{section.text}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {Object.entries(mobilePolicies)
                .filter(([key]) => key !== policy)
                .map(([key, value]) => (
                  <Chip key={key} label={value.title} onPress={() => router.replace(`/settings/policy?policy=${key}`)} />
                ))}
            </View>
          </>
        )}
      </Screen>
    </>
  );
}
