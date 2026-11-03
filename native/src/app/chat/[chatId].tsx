import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, increment, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { ActionSheetIOS, Alert, FlatList, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatMessage } from "@/lib/types";
import { dateMillis, isOpenOrder, orderLabel, orderNumber } from "@/lib/workOrders";
import { Avatar, Icon, Loading } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { personName, useChat, useJobs, useMessages, usePeople } from "~/lib/data";
import { db } from "~/lib/firebase";
import { clockTime, dayLabel } from "~/lib/format";
import { pickPhoto } from "~/lib/photos";
import { colors, radius, space, type } from "~/lib/theme";

const REACTIONS = ["👍", "❤️", "😂", "🙏", "❄️"];
const PERSON_TYPES = ["text", "image", "voice"];

type Item = { kind: "day"; id: string; label: string } | { kind: "message"; id: string; message: ChatMessage; first: boolean; last: boolean };

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const chat = useChat(chatId);
  const { messages, loading } = useMessages(chatId);
  const { jobs } = useJobs(uid, profile?.role);
  const otherId = chat?.participants.find((p) => p !== uid) || "";
  const other = usePeople(otherId ? [otherId] : [])[otherId];
  const openJob = jobs.filter((j) => j.chatId === chatId && isOpenOrder(j)).at(-1);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [viewer, setViewer] = useState("");
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Composer hugs the home indicator when the keyboard is closed and the keyboard when open.
  const { progress } = useReanimatedKeyboardAnimation();
  const composerPadding = useAnimatedStyle(() => ({ paddingBottom: interpolate(progress.value, [0, 1], [insets.bottom + 6, 8]) }));

  const quickReplies = profile?.role === "operator" ? ["On my way now", "I just arrived", "I’ll send a photo when finished"] : ["Thanks for the update", "Let me know when you arrive", "I’ll keep an eye out"];

  // Inverted list: newest first, with day separators after each day's messages.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const list = [...messages].reverse();
    list.forEach((message, i) => {
      const older = list[i + 1], newer = list[i - 1];
      const day = new Date(dateMillis(message.createdAt)).toDateString();
      const sameAs = (m?: ChatMessage) => !!m && m.senderId === message.senderId && PERSON_TYPES.includes(m.type) && new Date(dateMillis(m.createdAt)).toDateString() === day;
      out.push({ kind: "message", id: message.id, message, first: !sameAs(older), last: !sameAs(newer) });
      if (!older || new Date(dateMillis(older.createdAt)).toDateString() !== day) out.push({ kind: "day", id: `day-${day}`, label: dayLabel(message.createdAt) });
    });
    return out;
  }, [messages]);

  // Mark the other person's messages read while this chat is open.
  useEffect(() => {
    if (!uid || !chatId) return;
    const unread = messages.filter((m) => m.senderId !== uid && !m.read && !m.pending);
    unread.forEach((m) => void updateDoc(doc(db, "messages", m.id), { read: true }).catch(() => {}));
    if (chat?.unreadCount?.[uid]) void updateDoc(doc(db, "chats", chatId), { [`unreadCount.${uid}`]: 0 }).catch(() => {});
  }, [messages, chat?.unreadCount, uid, chatId]);

  const send = async (content: string, kind: ChatMessage["type"] = "text", metadata?: ChatMessage["metadata"]) => {
    if (!uid || !chatId || (kind === "text" && !content.trim())) return;
    setSending(true);
    try {
      const message: Record<string, unknown> = { chatId, senderId: uid, senderName: profile?.displayName || "User", type: kind, content, read: false, createdAt: Timestamp.now() };
      if (openJob) message.jobId = openJob.id;
      if (metadata) message.metadata = metadata;
      if (replyTo) message.replyTo = { id: replyTo.id, senderName: replyTo.senderName || "User", content: replyTo.type === "text" ? replyTo.content.slice(0, 140) : `[${replyTo.type}]` };
      // Same writes as the website: message + chat preview + the other person's unread count.
      const batch = writeBatch(db);
      batch.set(doc(collection(db, "messages")), message);
      batch.update(doc(db, "chats", chatId), {
        lastActivityTime: Timestamp.now(),
        lastMessage: kind === "text" ? content : `[${kind}]`,
        lastMessageTime: Timestamp.now(),
        ...(otherId ? { [`unreadCount.${otherId}`]: increment(1) } : {}),
      });
      if (kind === "text") setDraft("");
      setReplyTo(null);
      await batch.commit();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (kind === "text") void api("/api/notifications/message", { chatId, message: content, senderName: profile?.displayName || "User" }).catch(() => {});
    } catch {
      if (kind === "text") setDraft(content);
      Alert.alert("Message not sent", "Check your connection and try again. Your message is still in the box.");
    } finally {
      setSending(false);
    }
  };

  const attach = () => {
    const go = async (source: "camera" | "library") => {
      try {
        const data = await pickPhoto(source);
        if (data) await send("Photo", "image", { imageUrl: data });
      } catch (e) {
        Alert.alert("Couldn’t add photo", e instanceof Error ? e.message : "Try another photo.");
      }
    };
    ActionSheetIOS.showActionSheetWithOptions({ options: ["Take photo", "Choose from library", "Cancel"], cancelButtonIndex: 2 }, (i) => {
      if (i === 0) void go("camera");
      if (i === 1) void go("library");
    });
  };

  const react = async (message: ChatMessage, emoji: string) => {
    setSelected(null);
    const next = { ...(message.reactions || {}) };
    if (next[uid] === emoji) delete next[uid];
    else next[uid] = emoji;
    void Haptics.selectionAsync();
    await updateDoc(doc(db, "messages", message.id), { reactions: next }).catch(() => {});
  };

  if (!chatId) return <Loading />;

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={32} />
              <View>
                <Text style={type.headline} numberOfLines={1}>{personName(other)}</Text>
                <Text style={{ fontSize: 12, color: other?.isOnline ? colors.mint : colors.faint }}>{other?.isOnline ? "Online" : "Offline"}</Text>
              </View>
            </View>
          ),
          headerRight: () =>
            other?.phone ? (
              <Pressable hitSlop={10} onPress={() => void Linking.openURL(`tel:${other.phone!.replace(/[^\d+]/g, "")}`)}>
                <Icon name="phone.fill" size={19} color={colors.accent} />
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
        {openJob ? (
          <Pressable onPress={() => router.push(`/job/${openJob.id}`)} style={({ pressed }) => [styles.orderBar, pressed && { opacity: 0.8 }]}>
            <View style={styles.orderDot}>
              <Icon name="snowflake" size={14} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: colors.ink, fontSize: 14 }}>{orderLabel(openJob)}</Text>
              <Text style={type.caption}>{orderNumber(openJob)} · tap to view order</Text>
            </View>
            <Icon name="chevron.right" size={13} color={colors.faint} />
          </Pressable>
        ) : null}

        {loading ? (
          <Loading />
        ) : (
          <FlatList
            inverted
            data={items}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: space.md, paddingVertical: space.md }}
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }], alignItems: "center", padding: space.xxl, gap: 8 }}>
                <Text style={type.headline}>Start the conversation</Text>
                <Text style={[type.callout, { textAlign: "center" }]}>Messages about your order stay here, together with its updates.</Text>
              </View>
            }
            renderItem={({ item }) =>
              item.kind === "day" ? (
                <Text style={styles.day}>{item.label}</Text>
              ) : (
                <Bubble
                  message={item.message}
                  mine={item.message.senderId === uid}
                  first={item.first}
                  last={item.last}
                  onLongPress={() => {
                    if (!PERSON_TYPES.includes(item.message.type)) return;
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelected(item.message);
                  }}
                  onOpenImage={setViewer}
                />
              )
            }
          />
        )}

        <Animated.View style={[styles.composerWrap, composerPadding]}>
          {replyTo ? (
            <View style={styles.replyBar}>
              <View style={{ width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: colors.accent }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>Replying to {replyTo.senderId === uid ? "yourself" : replyTo.senderName}</Text>
                <Text style={type.caption} numberOfLines={1}>{replyTo.type === "text" ? replyTo.content : "Photo"}</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setReplyTo(null)}>
                <Icon name="xmark.circle.fill" size={18} color={colors.faint} />
              </Pressable>
            </View>
          ) : null}
          {focused && !draft ? (
            <FlatList
              horizontal
              data={quickReplies}
              keyExtractor={(r) => r}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ gap: 8, paddingHorizontal: space.md, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => setDraft(item)} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.7 }]}>
                  <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13 }}>{item}</Text>
                </Pressable>
              )}
            />
          ) : null}
          <View style={styles.composer}>
            <Pressable hitSlop={8} onPress={attach} style={styles.roundButton}>
              <Icon name="plus" size={18} color={colors.ink} weight="bold" />
            </Pressable>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Message"
              placeholderTextColor={colors.faint}
              multiline
              style={styles.input}
            />
            <Pressable
              disabled={!draft.trim() || sending}
              onPress={() => void send(draft.trim())}
              style={[styles.send, { backgroundColor: draft.trim() ? colors.accent : colors.border }]}
            >
              <Icon name="arrow.up" size={17} color="#fff" weight="bold" />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.scrim} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              {REACTIONS.map((emoji) => (
                <Pressable key={emoji} onPress={() => selected && void react(selected, emoji)} style={[styles.reaction, selected?.reactions?.[uid] === emoji && { backgroundColor: colors.accentSoft }]}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setReplyTo(selected);
                setSelected(null);
                setTimeout(() => inputRef.current?.focus(), 250);
              }}
            >
              <Icon name="arrowshape.turn.up.left" size={18} color={colors.ink} />
              <Text style={type.body}>Reply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer("")}>
        <Pressable style={{ flex: 1, backgroundColor: "#000" }} onPress={() => setViewer("")}>
          <Image source={{ uri: viewer }} style={{ flex: 1 }} contentFit="contain" />
          <View style={{ position: "absolute", top: insets.top + 12, right: 20 }}>
            <Icon name="xmark.circle.fill" size={30} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function Bubble({ message, mine, first, last, onLongPress, onOpenImage }: { message: ChatMessage; mine: boolean; first: boolean; last: boolean; onLongPress: () => void; onOpenImage: (uri: string) => void }) {
  const image = message.metadata?.imageUrl || message.metadata?.completionPhotoUrl;
  if (!PERSON_TYPES.includes(message.type)) {
    return (
      <View style={{ alignItems: "center", marginVertical: 8, gap: 8 }}>
        <View style={styles.system}>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 18 }}>{message.content}</Text>
        </View>
        {image ? (
          <Pressable onPress={() => onOpenImage(image)}>
            <Image source={{ uri: image }} style={{ width: 200, height: 150, borderRadius: radius.md }} contentFit="cover" />
          </Pressable>
        ) : null}
      </View>
    );
  }
  const reactions = Object.values(message.reactions || {});
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginTop: first ? 10 : 2 }}>
      <Pressable onLongPress={onLongPress} delayLongPress={250} onPress={image ? () => onOpenImage(image) : undefined} style={{ maxWidth: "80%" }}>
        <View
          style={[
            styles.bubble,
            mine ? styles.mine : styles.theirs,
            mine ? { borderBottomRightRadius: last ? 6 : 20 } : { borderBottomLeftRadius: last ? 6 : 20 },
            image ? { padding: 4 } : null,
            message.pending ? { opacity: 0.7 } : null,
          ]}
        >
          {message.replyTo ? (
            <View style={[styles.quote, { backgroundColor: mine ? "rgba(255,255,255,0.18)" : colors.surfaceAlt }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: mine ? "#fff" : colors.accent }}>{message.replyTo.senderName}</Text>
              <Text style={{ fontSize: 13, color: mine ? "rgba(255,255,255,0.85)" : colors.muted }} numberOfLines={2}>{message.replyTo.content}</Text>
            </View>
          ) : null}
          {image ? (
            <Image source={{ uri: image }} style={{ width: 220, height: 220, borderRadius: 16 }} contentFit="cover" transition={150} />
          ) : message.type === "voice" ? (
            <Text style={{ color: mine ? "#fff" : colors.ink, fontSize: 16 }}>🎙️ Voice message</Text>
          ) : (
            <Text selectable style={{ color: mine ? "#fff" : colors.ink, fontSize: 16, lineHeight: 21 }}>{message.content}</Text>
          )}
        </View>
      </Pressable>
      {reactions.length ? (
        <View style={[styles.reactionPill, mine ? { marginRight: 8 } : { marginLeft: 8 }]}>
          <Text style={{ fontSize: 13 }}>{reactions.join("")}</Text>
        </View>
      ) : null}
      {last ? (
        <Text style={[styles.meta, mine ? { marginRight: 6 } : { marginLeft: 6 }]}>
          {message.pending ? "Sending…" : clockTime(message.createdAt)}
          {mine && !message.pending ? (message.read ? " · Read" : " · Delivered") : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  orderBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.lg, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  orderDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  day: { alignSelf: "center", marginVertical: 12, fontSize: 12, fontWeight: "600", color: colors.faint },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, gap: 6 },
  mine: { backgroundColor: colors.bubbleMine },
  theirs: { backgroundColor: colors.bubbleTheirs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  quote: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  meta: { fontSize: 11, color: colors.faint, marginTop: 3 },
  system: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, maxWidth: "85%" },
  reactionPill: { marginTop: -6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  composerWrap: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: space.md },
  roundButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 36, maxHeight: 120, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, fontSize: 16, color: colors.ink, backgroundColor: colors.bg },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  replyBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: space.md, marginBottom: 8, padding: 8, borderRadius: radius.sm, backgroundColor: colors.bg },
  quick: { paddingHorizontal: 12, height: 30, borderRadius: radius.pill, backgroundColor: colors.accentSoft, justifyContent: "center" },
  scrim: { flex: 1, backgroundColor: "rgba(10,20,30,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, margin: space.md, marginBottom: 40, borderRadius: radius.xl, padding: space.lg, gap: space.md },
  reaction: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
