import { usePresence } from "~/lib/presence";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, increment, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatMessage, Job } from "@/lib/types";
import { dateMillis, isOpenOrder, orderLabel, orderNumber } from "@/lib/workOrders";
import { ProgressBar } from "~/components/OrderProgress";
import { clock, LiveWaveform, useVoiceRecorder, VoicePlayer, type VoiceNote } from "~/components/Voice";
import { Avatar, Icon, Loading } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { personName, useChat, useJobs, useMessages, usePeople } from "~/lib/data";
import { db } from "~/lib/firebase";
import { clockTime, dayLabel } from "~/lib/format";
import { chooseUpload, storageName, uploadFile } from "~/lib/uploads";
import { colors, radius, space, stepColor, type } from "~/lib/theme";

const REACTIONS = ["👍", "❤️", "😂", "🙏", "❄️"];
const PERSON_TYPES = ["text", "image", "voice", "file"];

const fileSize = (bytes?: number) => (!bytes ? "" : bytes >= 10 * 1024 * 1024 ? `${Math.round(bytes / 1024 / 1024)} MB` : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

type Item = { kind: "day"; id: string; label: string } | { kind: "message"; id: string; message: ChatMessage; first: boolean; last: boolean };

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const chat = useChat(chatId);
  const { messages, loading } = useMessages(chatId, chat?.mergedFrom);
  const { jobs } = useJobs(uid, profile?.role);
  const otherId = chat?.participants.find((p) => p !== uid) || "";
  const other = usePeople(otherId ? [otherId] : [])[otherId];
  const otherOnline = !!usePresence(otherId ? [otherId] : [])[otherId];
  const chatJobs = jobs.filter((j) => j.chatId === chatId);
  const openJob = chatJobs.filter(isOpenOrder).at(-1);
  // The order this conversation is about: the open one, or else the most recent one (done or cancelled).
  const latestJob = openJob || chatJobs[0];
  // Upload progress 0–1 while a photo or file goes up, null when idle.
  const [uploading, setUploading] = useState<number | null>(null);
  // Voice messages: tap the mic to start, tap stop to finish, then review (play, scrub, speed) and send.
  // Tapping (not holding) means a permission prompt or a stray gesture can't cut a recording short.
  const voice = useVoiceRecorder();
  const [note, setNote] = useState<VoiceNote | null>(null);
  const toggleRecording = async () => {
    if (voice.recording) {
      const recorded = await voice.stop().catch(() => null);
      if (recorded) setNote(recorded);
    } else {
      await voice.start().catch(() => false);
    }
  };
  const sendVoice = async () => {
    if (!note) return;
    try {
      setUploading(0);
      const url = await uploadFile(`chat-voice/${uid}`, note.uri, { name: `${Date.now()}.m4a`, contentType: "audio/mp4", onProgress: setUploading });
      const sent = await send("Voice message", "voice", { audioUrl: url, durationMs: Math.round(note.durationMs), peaks: note.peaks });
      // Keep the recording if the message didn't go, so it can be sent again.
      if (sent) setNote(null);
    } catch (e) {
      Alert.alert("Voice message not sent", e instanceof Error ? e.message : "Check your connection and try again. Your recording is still here.");
    } finally {
      setUploading(null);
    }
  };
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [viewer, setViewer] = useState("");
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // One source of truth for the keyboard: the whole screen lifts by exactly the keyboard's height,
  // and the composer's bottom gap shrinks from the home-indicator inset to a small margin, so the
  // input box sits right on top of the keyboard with no double padding or overlap.
  const { height: keyboardHeight, progress } = useReanimatedKeyboardAnimation();
  const lift = useAnimatedStyle(() => ({ paddingBottom: Math.max(0, -keyboardHeight.value) }));
  const composerPadding = useAnimatedStyle(() => ({ paddingBottom: interpolate(progress.value, [0, 1], [Math.max(insets.bottom, 10), 10]) }));

  // Old per-order chats were merged into one chat per pair of people; follow the move.
  useEffect(() => {
    if (chat?.mergedInto) router.replace(`/chat/${chat.mergedInto}`);
  }, [chat?.mergedInto, router]);

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
    if (!uid || !chatId || (kind === "text" && !content.trim())) return false;
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
      void api("/api/notifications/message", { chatId, message: kind === "text" ? content : kind === "voice" ? "🎤 Voice message" : kind === "image" ? "📷 Photo" : content, senderName: profile?.displayName || "User" }).catch(() => {});
      return true;
    } catch {
      if (kind === "text") setDraft(content);
      Alert.alert("Message not sent", kind === "text" ? "Check your connection and try again. Your message is still in the box." : "Check your connection and try again.");
      return false;
    } finally {
      setSending(false);
    }
  };

  // Photos of any size go up full resolution; "Choose a file" sends PDFs, documents or videos.
  const attach = async () => {
    try {
      const picked = await chooseUpload(undefined, { files: true });
      if (!picked) return;
      setUploading(0);
      if (picked.kind === "photo") {
        const url = await uploadFile(`chat-photos/${uid}`, picked.uri, { onProgress: setUploading });
        await send("Photo", "image", { imageUrl: url });
      } else {
        const { file } = picked;
        const url = await uploadFile(`chat-files/${uid}`, file.uri, { name: storageName(file.name), contentType: file.mimeType, onProgress: setUploading });
        await send(`📄 ${file.name}`, "file", { fileUrl: url, fileName: file.name, ...(file.size ? { fileSize: file.size } : {}), fileType: file.mimeType });
      }
    } catch (e) {
      Alert.alert("Couldn’t send that", e instanceof Error ? e.message : "Try another photo or file.");
    } finally {
      setUploading(null);
    }
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
          // The contact sits at the far left, right beside the back button, like Messages.
          headerTitle: "",
          headerBackVisible: true,
          headerLeft: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${personName(other)}. ${otherOnline ? "Online now" : "Offline"}`} accessibilityHint="Opens their profile" onPress={() => otherId && router.push(other?.role === "operator" ? `/operator/${otherId}` : `/person/${otherId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 240, paddingRight: 8 }}>
              <View>
                <Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={34} />
                {otherOnline ? <View style={styles.onlineDot} /> : null}
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={[type.headline, { lineHeight: 20 }]} numberOfLines={1}>{personName(other)}</Text>
                <Text style={{ fontSize: 12, lineHeight: 15, color: otherOnline ? colors.mint : colors.faint }} numberOfLines={1}>{otherOnline ? "Online now" : "Offline"}</Text>
              </View>
            </Pressable>
          ),
          headerRight: () =>
            other?.phone ? (
              <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel={`Call ${personName(other)}`} onPress={() => void Linking.openURL(`tel:${other.phone!.replace(/[^\d+]/g, "")}`)} style={{ minHeight: 36, paddingHorizontal: 6, justifyContent: "center" }}>
                <Icon name="phone.fill" size={21} color={colors.accent} />
              </Pressable>
            ) : null,
        }}
      />
      <Animated.View style={[{ flex: 1, backgroundColor: colors.bg }, lift]}>
        {latestJob ? <OrderStatusBar job={latestJob} open={!!openJob} onPress={() => router.push(`/job/${latestJob.id}`)} /> : null}

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
              // A live job with no messages yet: prompt the first message.
              openJob ? (
                <View style={{ transform: [{ scaleY: -1 }] }}>
                  <View style={styles.prompt}>
                    <View style={styles.promptIcon}>
                      <Icon name="bubble.left.and.text.bubble.right.fill" size={22} color={colors.accent} />
                    </View>
                    <Text style={[type.headline, { textAlign: "center" }]}>Your job with {personName(other).split(" ")[0]} is live</Text>
                    <Text style={[type.callout, { textAlign: "center" }]}>Send a quick message so they know you’re here. Share a gate code, where to park, or anything to watch out for.</Text>
                  </View>
                </View>
              ) : (
                <View style={{ transform: [{ scaleY: -1 }], alignItems: "center", padding: space.xxl, gap: 8 }}>
                  <Text style={type.headline}>Start the conversation</Text>
                  <Text style={[type.callout, { textAlign: "center" }]}>Say hello, share a gate code or ask a question. Order updates show up here too.</Text>
                </View>
              )
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
                <Text style={type.caption} numberOfLines={1}>{replyTo.type === "text" ? replyTo.content : replyTo.type === "file" ? replyTo.metadata?.fileName || "File" : "Photo"}</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setReplyTo(null)}>
                <Icon name="xmark.circle.fill" size={18} color={colors.faint} />
              </Pressable>
            </View>
          ) : null}
          {/* One composer row: attach, type, and a mic that turns into stop while recording. */}
          <View style={styles.composer}>
            {voice.recording ? (
              // Recording: a live waveform and timer until stop is tapped.
              <View style={styles.recordStrip}>
                <RecDot />
                <Text style={{ fontWeight: "700", color: colors.ink, fontVariant: ["tabular-nums"], minWidth: 34 }}>{clock(voice.durationMs)}</Text>
                <View style={{ flex: 1 }}>
                  <LiveWaveform samples={voice.live} />
                </View>
              </View>
            ) : note ? (
              // Review: listen back (scrub, speed), then delete or send.
              <>
                <Pressable accessibilityRole="button" accessibilityLabel="Delete recording" hitSlop={6} onPress={() => setNote(null)} style={styles.roundButton}>
                  <Icon name="trash" size={18} color={colors.danger} />
                </Pressable>
                <View style={styles.reviewBox}>
                  <VoicePlayer uri={note.uri} durationMs={note.durationMs} peaks={note.peaks} />
                </View>
              </>
            ) : (
              <>
                <Pressable hitSlop={4} accessibilityRole="button" accessibilityLabel={uploading !== null ? `Uploading, ${Math.round(uploading * 100)} percent` : "Add a photo or file"} disabled={uploading !== null} onPress={() => void attach()} style={styles.roundButton}>
                  {uploading !== null ? (
                    uploading > 0.02 ? <Text style={{ fontSize: 12, fontWeight: "800", color: colors.accent }}>{Math.round(uploading * 100)}%</Text> : <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Icon name="paperclip" size={19} color={colors.ink} />
                  )}
                </Pressable>
                <TextInput
                  ref={inputRef}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Type a message"
                  accessibilityLabel="Message"
                  placeholderTextColor={colors.faint}
                  multiline
                  style={styles.input}
                />
              </>
            )}
            {note && !voice.recording ? (
              <Pressable key="send-voice" accessibilityRole="button" accessibilityLabel="Send voice message" disabled={uploading !== null} onPress={() => void sendVoice()} style={[styles.send, { backgroundColor: colors.accent }]}>
                {uploading !== null ? <ActivityIndicator color="#fff" /> : <Icon name="arrow.up" size={19} color="#fff" weight="bold" />}
              </Pressable>
            ) : draft.trim() && !voice.recording ? (
              <Pressable
                key="send-text"
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: sending }}
                disabled={sending}
                onPress={() => void send(draft.trim())}
                style={[styles.send, { backgroundColor: colors.accent }]}
              >
                <Icon name="arrow.up" size={19} color="#fff" weight="bold" />
              </Pressable>
            ) : (
              // With nothing typed, the button is a mic: tap to record, tap again to stop and listen back.
              <Pressable
                key="mic"
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={voice.recording ? "Stop recording" : "Record a voice message"}
                accessibilityHint={voice.recording ? "Stops so you can listen back before sending" : "Tap to start recording"}
                onPress={() => void toggleRecording()}
                style={[styles.send, { backgroundColor: voice.recording ? colors.danger : colors.accent }]}
              >
                {/* While recording, a ring around the button breathes with your voice. */}
                {voice.recording ? <LevelRing level={voice.level} /> : null}
                <Icon name={voice.recording ? "stop.fill" : "mic.fill"} size={19} color="#fff" />
              </Pressable>
            )}
          </View>
          {voice.error ? <Text style={[type.caption, { color: colors.danger, paddingHorizontal: space.md, paddingTop: 6 }]}>{voice.error}</Text> : null}
        </Animated.View>
      </Animated.View>

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

/** Pinned under the header: which order this chat is about and whether it's active, done or cancelled. */
function OrderStatusBar({ job, open, onPress }: { job: Job; open: boolean; onPress: () => void }) {
  const tone = stepColor(job.status);
  const label = open ? orderLabel(job) : job.status === "completed" ? "Job completed" : job.declinedBy ? "Request declined" : "Job cancelled";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Order ${orderNumber(job)}. ${open ? "Active chat" : "Chat history kept"}. Open order`} onPress={onPress} style={({ pressed }) => [styles.orderBar, pressed && { opacity: 0.85 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={[styles.orderDot, { backgroundColor: tone.soft }]}>
          <Icon name={open ? "snowflake" : job.status === "completed" ? "checkmark.seal.fill" : "xmark.octagon.fill"} size={15} color={tone.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: tone.text, fontSize: 15 }} numberOfLines={1}>{label}</Text>
          <Text style={[type.caption, { fontSize: 13 }]} numberOfLines={1}>Order #{orderNumber(job)} · {open ? "Active chat · tap to track" : "Messages are kept here"}</Text>
        </View>
        <View style={[styles.statePill, { backgroundColor: open ? colors.mintSoft : colors.surfaceAlt }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: open ? "#22c55e" : colors.faint }} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: open ? colors.mint : colors.muted }}>{open ? "ACTIVE" : "CLOSED"}</Text>
        </View>
      </View>
      {open ? <ProgressBar job={job} compact /> : null}
    </Pressable>
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
            // Voice notes sit on a light bubble either way, so the grey-and-blue levels read clearly.
            message.type === "voice" ? styles.voiceBubble : null,
            mine ? { borderBottomRightRadius: last ? 6 : 20 } : { borderBottomLeftRadius: last ? 6 : 20 },
            image ? { padding: 4 } : null,
            message.pending ? { opacity: 0.7 } : null,
          ]}
        >
          {message.replyTo ? (
            <View style={[styles.quote, { backgroundColor: mine ? "rgba(255,255,255,0.18)" : colors.surfaceAlt }]}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: mine ? "#fff" : colors.accent }}>{message.replyTo.senderName}</Text>
              <Text style={{ fontSize: 13, color: mine ? "rgba(255,255,255,0.85)" : colors.muted }} numberOfLines={2}>{message.replyTo.content}</Text>
            </View>
          ) : null}
          {image ? (
            <Image source={{ uri: image }} style={{ width: 220, height: 220, borderRadius: 16 }} contentFit="cover" transition={150} />
          ) : message.type === "file" && message.metadata?.fileUrl ? (
            <Pressable accessibilityRole="link" accessibilityLabel={`File ${message.metadata.fileName || ""}. Open`} onPress={() => void Linking.openURL(message.metadata!.fileUrl!)} onLongPress={onLongPress} style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.accentSoft }}>
                <Icon name="doc.fill" size={18} color={mine ? "#fff" : colors.accent} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ color: mine ? "#fff" : colors.ink, fontSize: 16, fontWeight: "700" }} numberOfLines={2}>{message.metadata.fileName || "File"}</Text>
                <Text style={{ color: mine ? "rgba(255,255,255,0.8)" : colors.muted, fontSize: 13 }}>{[fileSize(message.metadata.fileSize), "Tap to open"].filter(Boolean).join(" · ")}</Text>
              </View>
            </Pressable>
          ) : message.type === "voice" && message.metadata?.audioUrl ? (
            <VoicePlayer uri={message.metadata.audioUrl} durationMs={message.metadata.durationMs} peaks={message.metadata.peaks} />
          ) : (
            <Text selectable style={{ color: mine ? "#fff" : colors.ink, fontSize: 17, lineHeight: 23 }}>{message.content}</Text>
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
  orderBar: { gap: 10, marginHorizontal: space.md, marginTop: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  orderDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  statePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  onlineDot: { position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2, borderColor: colors.surface },
  day: { alignSelf: "center", marginVertical: 12, fontSize: 13, fontWeight: "600", color: colors.muted },
  bubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, gap: 6 },
  mine: { backgroundColor: colors.bubbleMine },
  theirs: { backgroundColor: colors.bubbleTheirs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  quote: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  system: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, maxWidth: "85%" },
  reactionPill: { marginTop: -6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  composerWrap: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: space.md },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderRadius: 22, borderWidth: 1.5, borderColor: colors.borderStrong, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 17, color: colors.ink, backgroundColor: colors.bg },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  replyBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: space.md, marginBottom: 8, padding: 8, borderRadius: radius.sm, backgroundColor: colors.bg },
  prompt: { alignItems: "center", gap: 10, margin: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  promptIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  recordStrip: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.borderStrong },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  voiceBubble: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  micLive: { backgroundColor: colors.danger, transform: [{ scale: 1.15 }] },
  reviewBox: { flex: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.borderStrong },
  scrim: { flex: 1, backgroundColor: "rgba(10,20,30,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, margin: space.md, marginBottom: 40, borderRadius: radius.xl, padding: space.lg, gap: space.md },
  reaction: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});

/** The recording dot: blue, gently pulsing. */
function RecDot() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })), -1);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }, style]} />;
}

/** A soft ring behind the mic that grows with how loud you are. */
function LevelRing({ level }: { level: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(1 + level * 0.9, { damping: 12, stiffness: 200 });
  }, [level, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, opacity: 0.25 }, style]} />;
}
