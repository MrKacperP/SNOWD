import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Loading } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useJobs } from "~/lib/data";
import { db } from "~/lib/firebase";
import { clockTime, dayLabel, shortTime } from "~/lib/format";
import { chooseUpload, uploadFile } from "~/lib/uploads";
import { colors, radius, space, type } from "~/lib/theme";
import { readSupportJobRef, supportJobChoices, supportJobLine, supportJobRef, type SupportJobRef } from "@/lib/supportJob";
import type { Job } from "@/lib/types";

// Same IDs and phone number the website's support chat uses, so both sides see one conversation.
const SUPPORT_ID = "SNOWD_ADMIN";
const SUPPORT_PHONE = "437-922-3895";

// Topic IDs match the website's problem categories, so the admin inbox labels them the same way.
const TOPICS = [
  { id: "job", icon: "calendar", label: "A booking or job", desc: "Status, scheduling or cancelling", hint: "Your order number and what went wrong" },
  { id: "payment", icon: "creditcard", label: "Payment or refund", desc: "A charge, refund or payout", hint: "The date, amount and what you expected" },
  { id: "operator", icon: "person.fill.questionmark", label: "An operator", desc: "No-show, quality or conduct", hint: "Who, when, and what happened" },
  { id: "account", icon: "person.crop.circle", label: "My account", desc: "Signing in, details or verification", hint: "What you were trying to do" },
  { id: "safety", icon: "exclamationmark.shield", label: "Safety or damage", desc: "Unsafe behaviour or property damage", hint: "What happened, when, and who was involved" },
  { id: "other", icon: "ellipsis.bubble", label: "Something else", desc: "Questions, feedback, anything", hint: "Tell us what you need" },
] as const;
type TopicId = (typeof TOPICS)[number]["id"];
const topicOf = (id?: string) => TOPICS.find((t) => t.id === id);

type SupportMessage = { id: string; senderId: string; content: string; read: boolean; createdAt: unknown; type?: string; imageUrl?: string; jobRef?: SupportJobRef | null };
type ChatInfo = { exists: boolean; status: string; topic: string; lastMessage: string; lastMessageTime: unknown };
type Item = { kind: "day"; id: string; label: string } | { kind: "message"; id: string; message: SupportMessage; first: boolean; last: boolean };

const millis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value instanceof Date ? value.getTime() : Date.now());
const callSupport = () => void Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\D/g, "")}`);
const isResolved = (status: string) => ["resolved", "closed"].includes(status);

export default function Support() {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const chatId = `support_${uid}`;
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // The page opens on "What do you need help with?"; choosing a problem (or the open conversation) opens the chat.
  const [phase, setPhase] = useState<"pick" | "chat">("pick");
  const [topic, setTopic] = useState<TopicId | "">("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const stopChat = onSnapshot(
      doc(db, "supportChats", chatId),
      (snap) => {
        const data = snap.data({ serverTimestamps: "estimate" });
        setChat({ exists: snap.exists(), status: String(data?.status || ""), topic: String(data?.problemCategory || ""), lastMessage: String(data?.lastMessage || ""), lastMessageTime: data?.lastMessageTime || data?.updatedAt });
      },
      () => setChat({ exists: false, status: "", topic: "", lastMessage: "", lastMessageTime: null }),
    );
    const stopMessages = onSnapshot(
      query(collection(db, "supportChats", chatId, "messages"), orderBy("createdAt", "desc"), limit(200)),
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data({ serverTimestamps: "estimate" });
            return { id: d.id, senderId: String(data.senderId || ""), content: String(data.content || ""), read: !!data.read, createdAt: data.createdAt, type: data.type, imageUrl: data.metadata?.imageUrl, jobRef: readSupportJobRef(data.metadata?.jobRef) };
          }),
        );
        setLoading(false);
        setLoadError(false);
      },
      () => {
        setLoading(false);
        setLoadError(true);
      },
    );
    return () => {
      stopChat();
      stopMessages();
    };
  }, [chatId, uid]);

  // An open conversation is one with messages that support hasn't marked resolved yet.
  const openChat = !!chat?.exists && messages.length > 0 && !isResolved(chat.status);
  const unread = messages.filter((m) => m.senderId === SUPPORT_ID && !m.read).length;

  /** Start a conversation about a problem: posts the opening line, the same way the website does. */
  const startTopic = async (id: TopicId) => {
    const chosen = topicOf(id)!;
    if (starting) return;
    setStarting(true);
    try {
      const chatRef = doc(db, "supportChats", chatId);
      const name = profile?.displayName || "Customer";
      const opening = `I need help with: ${chosen.label} — ${chosen.desc}`;
      const batch = writeBatch(db);
      batch.set(chatRef, { userId: uid, userName: name, userRole: profile?.role || "client", status: "open", problemCategory: id, lastMessage: opening, lastMessageTime: serverTimestamp(), updatedAt: serverTimestamp(), ...(chat?.exists ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
      batch.set(doc(collection(chatRef, "messages")), { senderId: uid, senderName: name, content: opening, type: "text", createdAt: serverTimestamp(), read: false });
      await batch.commit();
      notifyAdmins(uid, chatId, name, opening, chosen.label);
      setTopic(id);
      setPhase("chat");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert("Couldn’t reach support", `Check your connection and try again, or call us at ${SUPPORT_PHONE}.`);
    } finally {
      setStarting(false);
    }
  };

  const pickTopic = (id: TopicId) => {
    void Haptics.selectionAsync();
    if (id !== "safety") return void startTopic(id);
    Alert.alert("Are you safe right now?", "If anyone is in danger, call 911 first. Otherwise, call us or tell us what happened in a message.", [
      { text: "Call 911", style: "destructive", onPress: () => void Linking.openURL("tel:911") },
      { text: "Call SNOWD", onPress: callSupport },
      { text: "Send a message", style: "cancel", onPress: () => void startTopic("safety") },
    ]);
  };

  if (!uid || loading || !chat) return <Loading />;

  if (phase === "pick") {
    return (
      <Picker
        openChat={openChat}
        chat={chat}
        unread={unread}
        starting={starting}
        loadError={loadError}
        onOpenChat={() => {
          setTopic((chat.topic as TopicId) || "");
          setPhase("chat");
        }}
        onPick={pickTopic}
      />
    );
  }

  return <Conversation uid={uid} chatId={chatId} messages={messages} chat={chat} topic={topic} name={profile?.displayName || "Customer"} role={profile?.role || "client"} />;
}

function notifyAdmins(uid: string, chatId: string, name: string, text: string, label: string) {
  void addDoc(collection(db, "adminNotifications"), {
    type: "support",
    title: "New support message",
    message: text,
    senderName: name,
    chatLabel: label,
    preview: text,
    chatId,
    uid,
    meta: { path: "/admin/support-chats", source: "native" },
    createdAt: serverTimestamp(),
    read: false,
  }).catch(() => {});
}

/** First screen: the open conversation (if any) on top, then the problems someone can start a new one about. */
function Picker({ openChat, chat, unread, starting, loadError, onOpenChat, onPick }: { openChat: boolean; chat: ChatInfo; unread: number; starting: boolean; loadError: boolean; onOpenChat: () => void; onPick: (id: TopicId) => void }) {
  const insets = useSafeAreaInsets();
  const open = topicOf(chat.topic);
  return (
    <>
      <Stack.Screen options={{ title: "Support", headerTitleStyle: { color: colors.ink }, headerTransparent: false, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerRight: undefined, headerTitle: undefined }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.md, paddingBottom: insets.bottom + space.xl, gap: space.md }}>
        <View style={{ gap: 6, paddingTop: space.sm }}>
          <Text style={type.title}>What do you need help with?</Text>
          <Text style={type.callout}>Real people from the SNOWD team read every message and usually reply within a few hours.</Text>
        </View>

        {loadError ? <Text style={[type.caption, { color: colors.danger }]}>We couldn’t load your past messages. Check your connection.</Text> : null}

        {openChat ? (
          <View style={{ gap: 8 }}>
            <Text style={type.overline}>Your open conversation</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Continue your open conversation about ${open?.label || "your request"}${unread ? `, ${unread} new ${unread === 1 ? "reply" : "replies"}` : ""}`} onPress={onOpenChat} style={({ pressed }) => [styles.openCard, pressed && { opacity: 0.9 }]}>
              <View style={styles.openIcon}>
                <Icon name={open?.icon || "bubble.left.and.bubble.right.fill"} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[type.headline, { color: "#fff", flexShrink: 1 }]} numberOfLines={1}>{open?.label || "Support conversation"}</Text>
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginLeft: "auto" }}>{shortTime(chat.lastMessageTime)}</Text>
                </View>
                <Text style={{ fontSize: 15, lineHeight: 20, color: "rgba(255,255,255,0.88)" }} numberOfLines={2}>{chat.lastMessage || "Tap to continue"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={styles.livePill}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" }} />
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>{chat.status === "in-progress" ? "WAITING ON YOU" : "OPEN"}</Text>
                  </View>
                  {unread ? (
                    <View style={[styles.livePill, { backgroundColor: "#fff" }]}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: colors.accent }}>{unread} NEW</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Icon name="chevron.right" size={15} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          {openChat ? <Text style={[type.overline, { marginTop: space.sm }]}>Or start something new</Text> : null}
          <View style={styles.group}>
            {TOPICS.map((t, i) => (
              <Pressable key={t.id} accessibilityRole="button" accessibilityHint="Starts a conversation with SNOWD support" disabled={starting} onPress={() => onPick(t.id)} style={({ pressed }) => [styles.topicRow, i < TOPICS.length - 1 && styles.topicDivider, pressed && { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.topicIcon, t.id === "safety" && { backgroundColor: "#fdecea" }]}>
                  <Icon name={t.icon} size={18} color={t.id === "safety" ? colors.danger : colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.headline}>{t.label}</Text>
                  <Text style={type.caption}>{t.desc}</Text>
                </View>
                {starting ? null : <Icon name="chevron.right" size={14} color={colors.faint} />}
              </Pressable>
            ))}
          </View>
        </View>

        {starting ? <ActivityIndicator color={colors.accent} /> : null}

        <Pressable accessibilityRole="button" accessibilityLabel={`Call SNOWD support at ${SUPPORT_PHONE}`} onPress={callSupport} style={styles.callRow}>
          <Icon name="phone.fill" size={16} color={colors.accent} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.accent }}>Rather talk? Call {SUPPORT_PHONE}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

/** The conversation itself: a normal text-message thread with SNOWD Support. */
function Conversation({ uid, chatId, messages, chat, topic, name, role }: { uid: string; chatId: string; messages: SupportMessage[]; chat: ChatInfo; topic: TopicId | ""; name: string; role: string }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [viewer, setViewer] = useState("");
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  // Reuse the same message ID when a failed send is retried, so a flaky connection can't post it twice.
  const attempt = useRef<{ text: string; id: string } | null>(null);
  const chosen = topicOf(topic);
  const { jobs } = useJobs(uid, role);
  // The job the person chose to attach to their next message, if any.
  const [attached, setAttached] = useState<Job | null>(null);
  const referenced = useMemo(() => new Set(messages.map((m) => m.jobRef?.jobId).filter(Boolean)), [messages]);
  const choices = useMemo(() => {
    const { jobs: list, active } = supportJobChoices(jobs);
    return { active, jobs: list.filter((j) => !referenced.has(j.id)) };
  }, [jobs, referenced]);

  const { height: keyboardHeight, progress } = useReanimatedKeyboardAnimation();
  const lift = useAnimatedStyle(() => ({ paddingBottom: Math.max(0, -keyboardHeight.value) }));
  const composerPadding = useAnimatedStyle(() => ({ paddingBottom: interpolate(progress.value, [0, 1], [Math.max(insets.bottom, 10), 10]) }));

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  // Mark support's replies read while the conversation is open.
  useEffect(() => {
    messages.filter((m) => m.senderId === SUPPORT_ID && !m.read).forEach((m) => void updateDoc(doc(db, "supportChats", chatId, "messages", m.id), { read: true }).catch(() => {}));
  }, [messages, chatId]);

  // Newest first for the inverted list, with a day label above each day's messages.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    messages.forEach((message, i) => {
      const older = messages[i + 1], newer = messages[i - 1];
      const day = new Date(millis(message.createdAt)).toDateString();
      const same = (m?: SupportMessage) => !!m && m.senderId === message.senderId && new Date(millis(m.createdAt)).toDateString() === day;
      out.push({ kind: "message", id: message.id, message, first: !same(older), last: !same(newer) });
      if (!older || new Date(millis(older.createdAt)).toDateString() !== day) out.push({ kind: "day", id: `day-${day}`, label: dayLabel(message.createdAt) });
    });
    return out;
  }, [messages]);

  const send = async (content: string, imageUrl?: string) => {
    const job = imageUrl ? null : attached;
    const jobRef = job ? supportJobRef(job) : null;
    if (!content.trim() && !imageUrl && !jobRef) return false;
    if (sending) return false;
    const text = content.trim() || (jobRef ? supportJobLine(jobRef) : "Photo");
    setSending(true);
    try {
      const chatRef = doc(db, "supportChats", chatId);
      if (attempt.current?.text !== text) attempt.current = { text, id: doc(collection(chatRef, "messages")).id };
      const preview = imageUrl ? "📷 Photo" : text;
      const batch = writeBatch(db);
      // Writing again reopens a conversation support had marked resolved. An attached job becomes the ticket's linked job.
      batch.set(chatRef, { userId: uid, userName: name, userRole: role, status: "open", lastMessage: preview, lastMessageTime: serverTimestamp(), updatedAt: serverTimestamp(), ...(jobRef ? { linkedJobId: jobRef.jobId, linkedJob: jobRef } : {}) }, { merge: true });
      batch.set(doc(chatRef, "messages", attempt.current.id), { senderId: uid, senderName: name, content: text, type: imageUrl ? "image" : "text", ...(imageUrl ? { metadata: { imageUrl } } : jobRef ? { metadata: { jobRef } } : {}), createdAt: serverTimestamp(), read: false });
      if (!imageUrl) {
        setDraft("");
        setAttached(null);
      }
      await batch.commit();
      attempt.current = null;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      notifyAdmins(uid, chatId, name, jobRef && text !== supportJobLine(jobRef) ? `${supportJobLine(jobRef)}\n${preview}` : preview, topicOf(chat.topic)?.label || "Support chat");
      return true;
    } catch {
      if (!imageUrl) {
        setDraft(content);
        setAttached(job);
      }
      Alert.alert("Message not sent", "Check your connection and try again. Your message is still in the box.");
      return false;
    } finally {
      setSending(false);
    }
  };

  const attachPhoto = async () => {
    try {
      const picked = await chooseUpload("Send a photo to support");
      if (!picked || picked.kind !== "photo") return;
      setUploading(0);
      const url = await uploadFile(`chat-photos/${uid}`, picked.uri, { onProgress: setUploading });
      await send("Photo", url);
    } catch (e) {
      Alert.alert("Photo not sent", e instanceof Error ? e.message : "Try another photo.");
    } finally {
      setUploading(null);
    }
  };

  const resolved = isResolved(chat.status);

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: true,
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text style={[type.headline, { lineHeight: 20 }]}>SNOWD Support</Text>
              <Text style={{ fontSize: 12, lineHeight: 15, color: colors.faint }} numberOfLines={1}>{topicOf(chat.topic)?.label || "Usually replies within a few hours"}</Text>
            </View>
          ),
          headerRight: () => (
            <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel={`Call SNOWD support at ${SUPPORT_PHONE}`} onPress={callSupport} style={{ minHeight: 36, paddingHorizontal: 6, justifyContent: "center" }}>
              <Icon name="phone.fill" size={21} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <Animated.View style={[{ flex: 1, backgroundColor: colors.bg }, lift]}>
        {resolved ? (
          <View style={styles.banner}>
            <Icon name="checkmark.seal.fill" size={16} color={colors.mint} />
            <Text style={[type.caption, { flex: 1, color: colors.ink }]}>Support marked this resolved. Send a message any time to reopen it.</Text>
          </View>
        ) : null}

        <FlatList
          inverted
          data={items}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.md, paddingVertical: space.md }}
          renderItem={({ item }) => (item.kind === "day" ? <Text style={styles.day}>{item.label}</Text> : <Bubble item={item} mine={item.message.senderId === uid} onOpenImage={setViewer} />)}
        />

        <Animated.View style={[styles.composerWrap, composerPadding]}>
          {attached ? (
            <View style={styles.attachedRow}>
              <JobChip job={attached} attached onPress={() => setAttached(null)} />
            </View>
          ) : choices.jobs.length ? (
            <View style={styles.attachedRow}>
              <Text style={styles.suggestLabel}>{choices.active ? (choices.jobs.length > 1 ? "Add one of your current jobs?" : "Add your current job?") : "Is this about your last job?"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
                {choices.jobs.map((j) => (
                  <JobChip
                    key={j.id}
                    job={j}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setAttached(j);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : chosen && !draft ? (
            <Text style={styles.hint}>Helpful to include: {chosen.hint.toLowerCase()}.</Text>
          ) : null}
          <View style={styles.composer}>
            <Pressable hitSlop={4} accessibilityRole="button" accessibilityLabel={uploading !== null ? `Uploading, ${Math.round(uploading * 100)} percent` : "Send a photo"} disabled={uploading !== null || sending} onPress={() => void attachPhoto()} style={styles.roundButton}>
              {uploading !== null ? (
                uploading > 0.02 ? <Text style={{ fontSize: 12, fontWeight: "800", color: colors.accent }}>{Math.round(uploading * 100)}%</Text> : <ActivityIndicator color={colors.accent} />
              ) : (
                <Icon name="camera.fill" size={18} color={colors.ink} />
              )}
            </Pressable>
            <TextInput ref={inputRef} value={draft} onChangeText={setDraft} placeholder="Text SNOWD Support" accessibilityLabel="Message to support" placeholderTextColor={colors.faint} multiline maxLength={4000} style={styles.input} />
            <Pressable
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !(draft.trim() || attached) || sending }}
              disabled={!(draft.trim() || attached) || sending}
              onPress={() => void send(draft)}
              style={[styles.send, { backgroundColor: draft.trim() || attached ? colors.accent : colors.surfaceAlt }]}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Icon name="arrow.up" size={19} color={draft.trim() || attached ? "#fff" : colors.faint} weight="bold" />}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer("")}>
        <Pressable accessibilityLabel="Close photo" style={{ flex: 1, backgroundColor: "#000" }} onPress={() => setViewer("")}>
          <Image source={{ uri: viewer }} style={{ flex: 1 }} contentFit="contain" />
          <View style={{ position: "absolute", top: insets.top + 12, right: 20 }}>
            <Icon name="xmark.circle.fill" size={30} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function Bubble({ item, mine, onOpenImage }: { item: Extract<Item, { kind: "message" }>; mine: boolean; onOpenImage: (uri: string) => void }) {
  const { message, first, last } = item;
  const auto = message.type === "auto-reply";
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginTop: first ? 10 : 2 }}>
      {!mine && first ? <Text style={styles.sender}>{auto ? "SNOWD Support · automatic reply" : "SNOWD Support"}</Text> : null}
      <Pressable disabled={!message.imageUrl} onPress={() => message.imageUrl && onOpenImage(message.imageUrl)} style={{ maxWidth: "82%" }}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs, mine ? { borderBottomRightRadius: last ? 6 : 20 } : { borderBottomLeftRadius: last ? 6 : 20 }, message.imageUrl ? { padding: 4 } : null]}>
          {message.jobRef ? <JobRefCard jobRef={message.jobRef} mine={mine} /> : null}
          {message.imageUrl ? (
            <Image source={{ uri: message.imageUrl }} style={{ width: 220, height: 220, borderRadius: 16 }} contentFit="cover" transition={150} />
          ) : message.jobRef && message.content === supportJobLine(message.jobRef) ? null : (
            <Text selectable style={{ color: mine ? "#fff" : colors.ink, fontSize: 17, lineHeight: 23 }}>{message.content}</Text>
          )}
        </View>
      </Pressable>
      {last ? (
        <Text style={[styles.meta, mine ? { marginRight: 6 } : { marginLeft: 6 }]}>
          {clockTime(message.createdAt)}
          {mine ? (message.read ? " · Read" : " · Delivered") : ""}
        </Text>
      ) : null}
    </View>
  );
}

/** A job someone can attach to their next message, or the one they already attached (tap to remove). */
function JobChip({ job, attached, onPress }: { job: Job; attached?: boolean; onPress: () => void }) {
  const ref = supportJobRef(job);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={attached ? `Order ${ref.orderNumber} attached. Remove it` : `Attach order ${ref.orderNumber}, ${ref.title}, ${ref.statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.jobChip, attached && styles.jobChipOn, pressed && { opacity: 0.8 }]}
    >
      <Icon name={attached ? "paperclip" : "plus.circle.fill"} size={15} color={colors.accent} />
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.jobChipTitle} numberOfLines={1}>Order #{ref.orderNumber} · {ref.statusLabel}</Text>
        <Text style={styles.jobChipSub} numberOfLines={1}>{ref.title}{ref.address ? ` · ${ref.address}` : ""}</Text>
      </View>
      {attached ? <Icon name="xmark.circle.fill" size={17} color={colors.faint} /> : null}
    </Pressable>
  );
}

/** The job a message is about, shown at the top of its bubble. */
function JobRefCard({ jobRef, mine }: { jobRef: SupportJobRef; mine: boolean }) {
  const ink = mine ? "#fff" : colors.ink;
  const sub = mine ? "rgba(255,255,255,0.8)" : colors.muted;
  return (
    <View style={[styles.jobRef, { backgroundColor: mine ? "rgba(255,255,255,0.16)" : colors.surfaceAlt }]}>
      <Icon name="snowflake" size={14} color={ink} />
      <View style={{ flexShrink: 1 }}>
        <Text style={{ color: ink, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>Order #{jobRef.orderNumber}{jobRef.statusLabel ? ` · ${jobRef.statusLabel}` : ""}</Text>
        <Text style={{ color: sub, fontSize: 13 }} numberOfLines={1}>{[jobRef.title, jobRef.address].filter(Boolean).join(" · ")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  openCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.md, borderRadius: radius.xl, backgroundColor: colors.accent },
  openIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.2)" },
  group: { borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: "hidden" },
  topicRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingHorizontal: space.md, paddingVertical: 12 },
  topicDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  topicIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  callRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: space.md, marginTop: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.mintSoft },
  day: { alignSelf: "center", marginVertical: 12, fontSize: 13, fontWeight: "600", color: colors.muted },
  sender: { fontSize: 13, fontWeight: "700", color: colors.accent, marginLeft: 6, marginBottom: 4 },
  bubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  mine: { backgroundColor: colors.bubbleMine },
  theirs: { backgroundColor: colors.bubbleTheirs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  hint: { fontSize: 13, color: colors.muted, paddingHorizontal: space.md, paddingBottom: 6 },
  attachedRow: { paddingHorizontal: space.md, paddingBottom: 8, gap: 6 },
  suggestLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  jobChip: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: 300, minHeight: 44, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  jobChipOn: { alignSelf: "flex-start", borderColor: colors.accent, backgroundColor: colors.accentSoft },
  jobChipTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  jobChipSub: { fontSize: 12, color: colors.muted },
  jobRef: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, marginBottom: 6, minWidth: 200 },
  composerWrap: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: space.md },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderRadius: 22, borderWidth: 1.5, borderColor: colors.borderStrong, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 17, color: colors.ink, backgroundColor: colors.bg },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
