import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Job } from "@/lib/types";
import { dateMillis, isOpenOrder, orderLabel } from "@/lib/workOrders";
import { CardSkeletons } from "~/components/brand";
import { Avatar, Chip, Empty, SwipeTabs, usePenguinRefresh } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { personName, useChats, useJobs, usePeople } from "~/lib/data";
import { shortTime } from "~/lib/format";
import { colors, radius, space, stepColor, type } from "~/lib/theme";

type Filter = "all" | "active" | "closed";

/** Where a conversation's job stands: still going, finished, cancelled, or just a chat. */
function chatState(jobs: Job[]) {
  const open = jobs.filter(isOpenOrder);
  if (open.length) return { kind: "active" as const, label: orderLabel(open[0]), tone: stepColor(open[0].status) };
  const last = [...jobs].sort((a, b) => dateMillis(b.updatedAt || b.createdAt) - dateMillis(a.updatedAt || a.createdAt))[0];
  if (!last) return { kind: "chat" as const, label: "Chat", tone: { text: colors.muted, soft: colors.surfaceAlt, bar: colors.faint } };
  if (last.status === "completed") return { kind: "completed" as const, label: "Job completed", tone: stepColor("completed") };
  return { kind: "cancelled" as const, label: last.declinedBy ? "Declined" : "Job cancelled", tone: stepColor("cancelled") };
}

export default function Messages() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const { chats, loading, error, reload } = useChats(uid);
  const { jobs, reload: reloadJobs } = useJobs(uid, profile?.role);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const archived = useMemo(() => new Set(profile?.archivedChats || []), [profile?.archivedChats]);
  const people = usePeople(chats.flatMap((c) => c.participants.filter((p) => p !== uid)));
  const { scrollProps, indicator } = usePenguinRefresh(() => {
    reload();
    reloadJobs();
  });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return chats
      .filter((chat) => !archived.has(chat.id))
      .map((chat) => {
        const otherId = chat.participants.find((p) => p !== uid) || "";
        const state = chatState(jobs.filter((j) => j.chatId === chat.id));
        return { chat, other: people[otherId], state, unread: chat.unreadCount?.[uid] || 0 };
      })
      .filter((row) => filter === "all" || (filter === "active" ? row.state.kind === "active" : row.state.kind !== "active"))
      .filter((row) => !needle || personName(row.other).toLowerCase().includes(needle) || (row.chat.lastMessage || "").toLowerCase().includes(needle));
  }, [chats, archived, jobs, people, search, uid, filter]);

  const activeCount = useMemo(() => chats.filter((c) => jobs.some((j) => j.chatId === c.id && isOpenOrder(j))).length, [chats, jobs]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Messages",
          headerSearchBarOptions: { placeholder: "Search conversations", onChangeText: (e) => setSearch(e.nativeEvent.text), hideWhenScrolling: true },
        }}
      />
      <SwipeTabs tab="/messages">
        <Animated.FlatList
          contentInsetAdjustmentBehavior="automatic"
          style={{ backgroundColor: colors.bg }}
          data={rows}
          keyExtractor={(row) => row.chat.id}
          {...scrollProps}
          ListHeaderComponent={
            <View>
              {indicator}
              <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md }}>
                <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
                <Chip label={activeCount ? `Active · ${activeCount}` : "Active"} icon="bolt.fill" selected={filter === "active"} onPress={() => setFilter("active")} />
                <Chip label="Past" icon="clock.arrow.circlepath" selected={filter === "closed"} onPress={() => setFilter("closed")} />
              </View>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 84 }} />}
          ListEmptyComponent={
            loading ? (
              <View style={{ padding: space.lg }}>
                <CardSkeletons count={4} />
              </View>
            ) : (
              <Empty
                icon="bubble.left.and.bubble.right"
                title={error || (search ? "No matches" : filter === "active" ? "No active chats" : filter === "closed" ? "No past chats yet" : "No conversations yet")}
                body={search ? undefined : profile?.role === "operator" ? "When a customer requests you, your chat will show up here." : "Book a shoveler and you can chat with them here. Every message is kept."}
              />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${personName(item.other)}. ${item.state.label}. ${item.unread ? `${item.unread} unread. ` : ""}${item.chat.lastMessage || "No messages yet"}`}
              onPress={() => router.push(`/chat/${item.chat.id}`)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <View>
                <Avatar uri={item.other?.logoUrl || item.other?.avatar} name={personName(item.other)} size={54} />
                {item.other?.isOnline ? <View style={styles.online} /> : null}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[type.headline, { flex: 1 }]} numberOfLines={1}>{personName(item.other)}</Text>
                  <Text style={[type.caption, item.unread ? { color: colors.accent, fontWeight: "700" } : null]}>{shortTime(item.chat.lastMessageTime || item.chat.lastActivityTime)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[type.callout, { flex: 1 }, item.unread ? { color: colors.ink, fontWeight: "600" } : null]} numberOfLines={1}>
                    {item.chat.lastMessage || "No messages yet. Tap to say hello."}
                  </Text>
                  {item.unread ? (
                    <View style={styles.unread}>
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{item.unread > 99 ? "99+" : item.unread}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.pill, { backgroundColor: item.state.tone.soft }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.state.tone.bar }} />
                  <Text style={{ color: item.state.tone.text, fontSize: 12, fontWeight: "800" }}>{item.state.label}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      </SwipeTabs>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 84, paddingHorizontal: space.lg, paddingVertical: 14, backgroundColor: colors.bg },
  online: { position: "absolute", right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: "#22c55e", borderWidth: 2, borderColor: colors.bg },
  unread: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
});
