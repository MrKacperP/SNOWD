import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { isOpenOrder, orderLabel } from "@/lib/workOrders";
import { Avatar, Empty } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { personName, useChats, useJobs, usePeople } from "~/lib/data";
import { shortTime } from "~/lib/format";
import { colors, space, type } from "~/lib/theme";

export default function Messages() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const { chats, loading, error } = useChats(uid);
  const { jobs } = useJobs(uid, profile?.role);
  const [search, setSearch] = useState("");
  const archived = useMemo(() => new Set(profile?.archivedChats || []), [profile?.archivedChats]);
  const people = usePeople(chats.flatMap((c) => c.participants.filter((p) => p !== uid)));

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return chats
      .filter((chat) => !archived.has(chat.id))
      .map((chat) => {
        const otherId = chat.participants.find((p) => p !== uid) || "";
        const openJob = jobs.find((j) => j.chatId === chat.id && isOpenOrder(j));
        return { chat, other: people[otherId], openJob, unread: chat.unreadCount?.[uid] || 0 };
      })
      .filter((row) => !needle || personName(row.other).toLowerCase().includes(needle) || (row.chat.lastMessage || "").toLowerCase().includes(needle));
  }, [chats, archived, jobs, people, search, uid]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Messages",
          headerSearchBarOptions: { placeholder: "Search conversations", onChangeText: (e) => setSearch(e.nativeEvent.text), hideWhenScrolling: true },
        }}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.bg }}
        data={rows}
        keyExtractor={(row) => row.chat.id}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 84 }} />}
        ListEmptyComponent={
          loading ? undefined : (
            <Empty
              icon="bubble.left.and.bubble.right"
              title={error || (search ? "No matches" : "No conversations yet")}
              body={search ? undefined : profile?.role === "operator" ? "When a customer requests you, your chat will show up here." : "Book a shoveler and you can chat with them here."}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${personName(item.other)}. ${item.unread ? `${item.unread} unread. ` : ""}${item.chat.lastMessage || "No messages yet"}`}
            onPress={() => router.push(`/chat/${item.chat.id}`)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
          >
            <View>
              <Avatar uri={item.other?.logoUrl || item.other?.avatar} name={personName(item.other)} size={54} />
              {item.other?.isOnline ? <View style={styles.online} /> : null}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[type.headline, { flex: 1 }]} numberOfLines={1}>{personName(item.other)}</Text>
                <Text style={[type.caption, item.unread ? { color: colors.accent, fontWeight: "700" } : null]}>{shortTime(item.chat.lastMessageTime || item.chat.lastActivityTime)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[type.callout, { flex: 1 }, item.unread ? { color: colors.ink, fontWeight: "600" } : null]} numberOfLines={2}>
                  {item.chat.lastMessage || "No messages yet. Tap to say hello."}
                </Text>
                {item.unread ? (
                  <View style={styles.unread}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{item.unread > 99 ? "99+" : item.unread}</Text>
                  </View>
                ) : null}
              </View>
              {item.openJob ? <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "700" }}>● {orderLabel(item.openJob)}</Text> : null}
            </View>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 80, paddingHorizontal: space.lg, paddingVertical: 14, backgroundColor: colors.bg },
  online: { position: "absolute", right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: "#22c55e", borderWidth: 2, borderColor: colors.bg },
  unread: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
});
