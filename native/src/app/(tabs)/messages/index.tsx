import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Chat, Job } from "@/lib/types";
import { dateMillis, isOpenOrder, orderLabel } from "@/lib/workOrders";
import { CardSkeletons } from "~/components/brand";
import { HeaderPill, HeaderSearch, TabHeader } from "~/components/TabHeader";
import { Avatar, Empty, Icon, SwipeTabs, usePenguinRefresh } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useAppTheme } from "~/lib/appearance";
import { usePresence } from "~/lib/presence";
import { personName, useChats, useChatsById, useJobs, usePeople } from "~/lib/data";
import { useLiveHeaderTone } from "~/lib/headerTone";
import { shortTime } from "~/lib/format";
import { colors, space, stepColor, type } from "~/lib/theme";

type Filter = "all" | "unread" | "active";

/** Where a conversation's job stands: still going, finished, cancelled, or just a chat. */
function chatState(jobs: Job[]) {
  const open = jobs.filter(isOpenOrder);
  if (open.length) return { kind: "active" as const, label: orderLabel(open[0]), tone: stepColor(open[0].status) };
  const last = [...jobs].sort((a, b) => dateMillis(b.updatedAt || b.createdAt) - dateMillis(a.updatedAt || a.createdAt))[0];
  if (!last) return null;
  if (last.status === "completed") return { kind: "completed" as const, label: "Job completed", tone: stepColor("completed") };
  return { kind: "cancelled" as const, label: last.declinedBy ? "Declined" : "Job cancelled", tone: stepColor("cancelled") };
}

/** A friendly preview for messages that aren't plain text. */
const preview = (text?: string) =>
  !text ? "" : text === "[image]" ? "📷 Photo" : text === "[voice]" ? "🎙️ Voice message" : text === "[file]" ? "📄 File" : text === "[completion-photo]" ? "📷 Photo of the finished work" : text;

/**
 * Every conversation you've ever had, newest first, laid out like WhatsApp: photo, name and time,
 * the last message, and an unread count. Archived chats sit behind one row at the top.
 */
export default function Messages() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const { chats, loading, error, reload } = useChats(uid);
  const { jobs, reload: reloadJobs } = useJobs(uid, profile?.role);
  const tone = useLiveHeaderTone(jobs, uid);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const archived = useMemo(() => new Set(profile?.archivedChats || []), [profile?.archivedChats]);
  // Every job's conversation is here, open or closed, old or new. Chats are read straight from
  // each job too, so they show even if the full list can't load. A live job with no messages yet
  // still gets a row that opens its chat.
  const jobChats = useChatsById(jobs.map((j) => j.chatId || ""));
  const allChats = useMemo(() => {
    const fetched = Object.values(jobChats).filter((c) => !c.mergedInto && (!uid || c.participants?.includes(uid)));
    const known = new Set([...chats, ...fetched].map((c) => c.id));
    const missing = jobs
      .filter((j) => isOpenOrder(j) && j.chatId && !known.has(j.chatId))
      .map((j) => ({ id: j.chatId!, jobId: j.id, jobIds: [j.id], participants: [j.clientId, j.operatorId].filter(Boolean) as string[], unreadCount: {}, createdAt: j.createdAt, lastActivityTime: j.updatedAt || j.createdAt }) as Chat);
    const seen = new Set<string>();
    const when = (c: Chat) => dateMillis(c.lastActivityTime || c.lastMessageTime || c.createdAt);
    return [...missing, ...chats, ...fetched].filter((c) => !seen.has(c.id) && seen.add(c.id)).sort((a, b) => when(b) - when(a));
  }, [chats, jobChats, jobs, uid]);
  const people = usePeople(allChats.flatMap((c) => c.participants.filter((p) => p !== uid)));
  // The green dot means they really have SNOWD open right now (a fresh heartbeat), nothing older.
  const online = usePresence(allChats.slice(0, 40).flatMap((c) => c.participants.filter((p) => p !== uid)));
  const list = useRef<FlatList>(null);
  const touched = useRef(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The list draws under the status bar; settle it flush with the top whenever the tab appears
  // (iOS can open it nudged down by the status bar's height), until the person touches it.
  useFocusEffect(
    useCallback(() => {
      const timers = [0, 50, 300, 700].map((ms) => setTimeout(() => !touched.current && list.current?.scrollToOffset({ offset: 0, animated: false }), ms));
      return () => timers.forEach(clearTimeout);
    }, []),
  );
  const { scrollProps, indicator } = usePenguinRefresh(() => {
    reload();
    reloadJobs();
  });

  const all = useMemo(
    () =>
      allChats.map((chat) => {
        const otherId = chat.participants.find((p) => p !== uid) || "";
        return { chat, other: people[otherId], state: chatState(jobs.filter((j) => j.chatId === chat.id || (chat.jobIds || []).includes(j.id))), unread: chat.unreadCount?.[uid] || 0 };
      }),
    [allChats, jobs, people, uid],
  );
  const archivedCount = all.filter((r) => archived.has(r.chat.id)).length;
  const unreadCount = all.filter((r) => r.unread && !archived.has(r.chat.id)).length;
  const activeCount = all.filter((r) => r.state?.kind === "active" && !archived.has(r.chat.id)).length;

  // Live jobs where nobody has written yet: shown in a prompt card above the list.
  const quiet = all.filter((r) => r.state?.kind === "active" && !r.chat.lastMessage && !archived.has(r.chat.id));

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all
      .filter((r) => archived.has(r.chat.id) === showArchived)
      .filter((r) => filter === "all" || (filter === "unread" ? r.unread > 0 : r.state?.kind === "active"))
      .filter((r) => !needle || personName(r.other).toLowerCase().includes(needle) || (r.chat.lastMessage || "").toLowerCase().includes(needle));
  }, [all, archived, showArchived, filter, search]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "Messages" }} />
      <SwipeTabs tab="/messages">
        <Animated.FlatList
          ref={list as never}
          onTouchStart={() => {
            touched.current = true;
          }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          style={{ backgroundColor: colors.surface }}
          data={rows}
          keyExtractor={(row) => row.chat.id}
          keyboardDismissMode="on-drag"
          {...scrollProps}
          contentContainerStyle={{ paddingBottom: 120, minHeight: height + insets.top + 1 }}
          ListHeaderComponent={
            <View>
              <TabHeader
                tone={tone}
                pageColor={colors.surface}
                title={showArchived ? "Archived" : "Messages"}
                subtitle={showArchived ? "Chats you’ve put away. Every message is kept." : undefined}
                right={
                  showArchived ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Back to all messages" hitSlop={8} onPress={() => setShowArchived(false)} style={styles.headerButton}>
                      <Icon name="chevron.left" size={18} color="#fff" weight="bold" />
                    </Pressable>
                  ) : null
                }
              >
                <HeaderSearch value={search} onChangeText={setSearch} placeholder="Search" />
                {!showArchived ? (
                  <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
                    <HeaderPill label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
                    <HeaderPill label="Unread" count={unreadCount} selected={filter === "unread"} onPress={() => setFilter("unread")} />
                    <HeaderPill label="Active jobs" count={activeCount} selected={filter === "active"} onPress={() => setFilter("active")} />
                  </View>
                ) : null}
              </TabHeader>
              {indicator}
              {!showArchived && !search && quiet.length ? (
                <View style={styles.liveCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.liveDot, { backgroundColor: quiet[0].state!.tone.bar }]} />
                    <Text style={[type.headline, { flex: 1 }]}>{quiet.length === 1 ? "Your live job is waiting for a hello" : `${quiet.length} live jobs are waiting for a hello`}</Text>
                  </View>
                  <Text style={type.callout}>Send a quick message so they know you’re on it. A gate code, parking tip or ETA helps the job go smoothly.</Text>
                  {quiet.slice(0, 3).map((row) => (
                    <Pressable key={row.chat.id} accessibilityRole="button" accessibilityLabel={`Message ${personName(row.other)} about the live job`} onPress={() => router.push(`/chat/${row.chat.id}`)} style={({ pressed }) => [styles.liveRow, pressed && { opacity: 0.85 }]}>
                      <Avatar uri={row.other?.logoUrl || row.other?.avatar} name={personName(row.other)} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={type.headline} numberOfLines={1}>{personName(row.other)}</Text>
                        <Text style={{ color: row.state!.tone.text, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>{row.state!.label}</Text>
                      </View>
                      <View style={[styles.liveButton, { backgroundColor: theme.accent }]}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Message</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {!showArchived && archivedCount && !search && filter === "all" ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Archived, ${archivedCount} chats`} onPress={() => setShowArchived(true)} style={({ pressed }) => [styles.archivedRow, pressed && { backgroundColor: colors.surfaceAlt }]}>
                  <View style={styles.archivedIcon}>
                    <Icon name="archivebox" size={20} color={colors.muted} />
                  </View>
                  <Text style={[type.headline, { flex: 1 }]}>Archived</Text>
                  <Text style={[type.caption, { fontWeight: "700" }]}>{archivedCount}</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            loading ? (
              <View style={{ padding: space.lg }}>
                <CardSkeletons count={4} />
              </View>
            ) : (
              <Empty
                icon="bubble.left.and.bubble.right"
                title={(all.length ? "" : error) || (search ? "No matches" : filter === "unread" ? "You’re all caught up" : filter === "active" ? "No active jobs" : "No conversations yet")}
                body={search || filter !== "all" ? undefined : profile?.role === "operator" ? "When a customer requests you, your chat will show up here." : "Book a shoveler and you can chat with them here. Every message is kept."}
              />
            )
          }
          renderItem={({ item }) => {
            const name = personName(item.other);
            const last = preview(item.chat.lastMessage) || (item.state ? item.state.label : "Say hello 👋");
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${name}. ${item.unread ? `${item.unread} unread. ` : ""}${last}. ${shortTime(item.chat.lastMessageTime || item.chat.lastActivityTime)}`}
                onPress={() => router.push(`/chat/${item.chat.id}`)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
              >
                <View>
                  <Avatar uri={item.other?.logoUrl || item.other?.avatar} name={name} size={54} />
                  {item.other && online[item.other.uid] ? <View style={styles.online} /> : null}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.line}>
                    <Text style={[type.headline, { flex: 1 }]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.time, item.unread ? { color: theme.accent, fontWeight: "700" } : null]}>{shortTime(item.chat.lastMessageTime || item.chat.lastActivityTime || item.chat.createdAt)}</Text>
                  </View>
                  <View style={styles.line}>
                    <Text style={[styles.preview, item.unread ? { color: colors.ink, fontWeight: "600" } : null]} numberOfLines={1}>{last}</Text>
                    {item.unread ? (
                      <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                        <Text style={styles.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text>
                      </View>
                    ) : null}
                  </View>
                  {item.state?.kind === "active" ? (
                    <View style={styles.line}>
                      <View style={[styles.dot, { backgroundColor: item.state.tone.bar }]} />
                      <Text style={{ color: item.state.tone.text, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>{item.state.label}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      </SwipeTabs>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 78, paddingHorizontal: space.lg, paddingVertical: 10, backgroundColor: "transparent" },
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
  time: { fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] },
  preview: { flex: 1, fontSize: 15, lineHeight: 20, color: colors.muted },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space.lg + 54 + space.md },
  online: { position: "absolute", right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: "#22c55e", borderWidth: 2, borderColor: colors.surface },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  archivedRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  archivedIcon: { width: 54, alignItems: "center" },
  liveCard: { margin: space.lg, marginBottom: space.sm, padding: space.lg, gap: 10, borderRadius: 20, backgroundColor: colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.surface },
  liveButton: { paddingHorizontal: 14, minHeight: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
});
