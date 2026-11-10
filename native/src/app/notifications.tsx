import { Stack, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { presentNotification } from "@/lib/notificationPresentation";
import { Button, Empty, Icon, Notice, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { shortTime } from "~/lib/format";
import { notificationRoute, useNotifications } from "~/lib/notifications";
import { colors, radius, space, type } from "~/lib/theme";

const KIND_ICONS = { message: "bubble.left.fill", order: "list.clipboard.fill", payment: "creditcard.fill", account: "person.crop.circle.badge.checkmark", invite: "mappin.and.ellipse" } as const;

/** Job, message, payment and account updates — the website's notification bell, same wording. */
export default function Notifications() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, unread, loading, error, markRead, markAllRead } = useNotifications(user?.uid);

  return (
    <>
      <Stack.Screen options={{ title: "Updates", headerRight: () => (unread ? <Button title="Mark all read" variant="ghost" small onPress={() => void markAllRead()} /> : null) }} />
      <Screen contentStyle={{ gap: space.sm }}>
        <Notice text={error} />
        {!loading && !items.length ? <Empty icon="bell" title="No updates yet" body="Job, message and payment updates will appear here." /> : null}
        {items.map((item) => {
          const view = presentNotification(item);
          const route = notificationRoute(item);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? "" : "New. "}${view.title}. ${view.detail || ""}`}
              onPress={() => {
                void markRead(item.id);
                if (route) router.push(route);
              }}
              style={({ pressed }) => [
                { flexDirection: "row", gap: 12, padding: space.lg, borderRadius: radius.lg, backgroundColor: item.read ? colors.surface : "#f3f6ff", borderWidth: 0.5, borderColor: item.read ? colors.border : colors.accentBorder },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: view.needsAction ? colors.sunSoft : colors.accentSoft }}>
                <Icon name={KIND_ICONS[view.kind]} size={20} color={view.needsAction ? colors.sunText : colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[type.headline, { flex: 1 }]} numberOfLines={2}>{view.title}</Text>
                  <Text style={type.caption}>{shortTime(item.createdAt)}</Text>
                </View>
                {view.context ? <Text style={[type.caption, { fontWeight: "600" }]}>{view.context}</Text> : null}
                {view.detail ? <Text style={type.callout} numberOfLines={2}>{view.detail}</Text> : null}
                {route ? <Text style={{ color: view.needsAction ? colors.sunText : colors.accent, fontWeight: "700", fontSize: 15, marginTop: 4 }}>{view.action} ›</Text> : null}
              </View>
              {!item.read ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 }} /> : null}
            </Pressable>
          );
        })}
      </Screen>
    </>
  );
}
