import { useRouter } from "expo-router";
import type { SymbolViewProps } from "expo-symbols";
import { useMemo, type ReactNode } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Chat, Job } from "@/lib/types";
import { isOpenOrder, orderActionNeeded, orderLabel, scheduleText } from "@/lib/workOrders";
import { useAuth } from "~/context/auth";
import { personName, usePeople } from "~/lib/data";
import { shortTime } from "~/lib/format";
import { brand, colors, depth } from "~/lib/theme";
import { Avatar, Icon } from "./ui";

export type QuickTab = "profile" | "jobs" | "messages";

const previewText = (text?: string) =>
  !text ? "" : text === "[image]" ? "📷 Photo" : text === "[voice]" ? "🎙️ Voice message" : text === "[file]" ? "📄 File" : text === "[completion-photo]" ? "📷 Photo of the finished work" : text;

/**
 * The card that opens when someone presses and holds a tab: account shortcuts on Profile,
 * the orders still on the go on Orders, and the conversations waiting on you on Messages.
 */
export function TabQuickMenu({ tab, onClose, jobs, chats }: { tab: QuickTab | null; onClose: () => void; jobs: Job[]; chats: Chat[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!tab} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {tab ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(160)} style={StyleSheet.absoluteFill}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(11,26,107,0.28)" }]} />
          </Animated.View>
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(220)} style={[styles.card, depth.high, { bottom: insets.bottom + 78 }]}>
            {tab === "profile" ? <ProfileMenu onClose={onClose} /> : null}
            {tab === "jobs" ? <OrdersMenu onClose={onClose} jobs={jobs} /> : null}
            {tab === "messages" ? <MessagesMenu onClose={onClose} chats={chats} jobs={jobs} /> : null}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, gap: 2 }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Item({ icon, label, onPress, tint = brand.navy, leading, detail, trailing, last }: { icon?: SymbolViewProps["name"]; label: string; onPress: () => void; tint?: string; leading?: ReactNode; detail?: string; trailing?: ReactNode; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label} onPress={onPress} style={({ pressed }) => [styles.item, !last && styles.divider, pressed && { backgroundColor: colors.surfaceAlt }]}>
      {leading || (icon ? <Icon name={icon} size={20} color={tint} /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.itemLabel, { color: tint }]} numberOfLines={1}>{label}</Text>
        {detail ? <Text style={styles.itemDetail} numberOfLines={1}>{detail}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

function Footer({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.footer, pressed && { opacity: 0.7 }]}>
      <Text style={styles.footerText}>{label}</Text>
      <Icon name="chevron.right" size={13} color={brand.electric} weight="bold" />
    </Pressable>
  );
}

function Nothing({ icon, text }: { icon: SymbolViewProps["name"]; text: string }) {
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 22, paddingHorizontal: 18 }}>
      <Icon name={icon} size={26} color={brand.sky} />
      <Text style={[styles.subtitle, { textAlign: "center" }]}>{text}</Text>
    </View>
  );
}

function ProfileMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const operator = profile?.role === "operator";
  const go = (path: string) => {
    onClose();
    router.push(path as never);
  };
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 18, paddingBottom: 10 }}>
        <Avatar uri={(operator && profile?.logoUrl) || profile?.avatar || undefined} name={profile?.businessName || profile?.displayName} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{(operator && profile?.businessName) || profile?.displayName || "Your profile"}</Text>
          {profile?.email ? <Text style={styles.subtitle} numberOfLines={1}>{profile.email}</Text> : null}
        </View>
      </View>
      <Item icon="person.crop.circle" label="Edit profile" onPress={() => go("/settings/account")} />
      {operator ? (
        <Item icon="paintpalette" label="Edit business profile" onPress={() => go("/settings/branding")} />
      ) : (
        <Item icon="house" label="Edit properties" onPress={() => go("/settings/properties")} />
      )}
      <Item
        icon="rectangle.portrait.and.arrow.right"
        label="Sign out"
        tint={colors.danger}
        last
        onPress={() => {
          onClose();
          Alert.alert("Sign out?", "You can sign back in any time. Your orders and messages are kept.", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", style: "destructive", onPress: () => void signOut() },
          ]);
        }}
      />
    </View>
  );
}

function OrdersMenu({ onClose, jobs }: { onClose: () => void; jobs: Job[] }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const active = useMemo(() => jobs.filter(isOpenOrder), [jobs]);
  const people = usePeople(active.map((j) => (operator ? j.clientId : j.operatorId)));
  const noun = operator ? "job" : "order";
  return (
    <View>
      <Header title={operator ? "Active jobs" : "Active orders"} subtitle={active.length ? `${active.length} ${noun}${active.length === 1 ? "" : "s"} on the go` : undefined} />
      {active.length ? (
        <ScrollView style={{ maxHeight: 340 }} bounces={false}>
          {active.map((job, i) => {
            const other = people[operator ? job.clientId : job.operatorId];
            const action = orderActionNeeded(job, uid);
            return (
              <Item
                key={job.id}
                label={personName(other)}
                detail={action || `${orderLabel(job)} · ${scheduleText(job)}`}
                tint={brand.navy}
                last={i === active.length - 1}
                leading={<Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={38} />}
                trailing={action ? <View style={styles.dot} /> : <Icon name="chevron.right" size={13} color={brand.slate} />}
                onPress={() => {
                  onClose();
                  router.push(`/job/${job.id}`);
                }}
              />
            );
          })}
        </ScrollView>
      ) : (
        <Nothing icon="list.clipboard" text={operator ? "No jobs on the go right now." : "Nothing booked right now."} />
      )}
      <Footer
        label={operator ? "See all jobs" : "See all orders"}
        onPress={() => {
          onClose();
          router.navigate("/jobs");
        }}
      />
    </View>
  );
}

function MessagesMenu({ onClose, chats, jobs }: { onClose: () => void; chats: Chat[]; jobs: Job[] }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const archived = useMemo(() => new Set(profile?.archivedChats || []), [profile?.archivedChats]);
  // Unread conversations first, then live orders waiting on your reply (read from the orders
  // themselves, since an order's chat isn't always in the chat list yet).
  const rows = useMemo(() => {
    const unread = chats
      .filter((c) => !archived.has(c.id) && (c.unreadCount?.[uid] || 0) > 0)
      .map((chat) => ({ key: chat.id, otherId: chat.participants.find((p) => p !== uid) || "", unread: chat.unreadCount?.[uid] || 0, text: previewText(chat.lastMessage) || "New message", time: chat.lastMessageTime, path: `/chat/${chat.id}` }));
    const seen = new Set(unread.map((r) => r.key));
    const waiting = jobs
      .filter((job) => isOpenOrder(job) && orderActionNeeded(job, uid) && !(job.chatId && seen.has(job.chatId)))
      .map((job) => ({ key: job.chatId || job.id, otherId: job.operatorId === uid ? job.clientId : job.operatorId, unread: 0, text: orderActionNeeded(job, uid), time: undefined, path: job.chatId ? `/chat/${job.chatId}` : `/job/${job.id}` }));
    return [...unread, ...waiting];
  }, [chats, jobs, uid, archived]);
  const people = usePeople(rows.map((r) => r.otherId));
  const unreadTotal = rows.reduce((sum, r) => sum + r.unread, 0);
  return (
    <View>
      <Header title="Needs your attention" subtitle={rows.length ? (unreadTotal ? `${unreadTotal} unread message${unreadTotal === 1 ? "" : "s"}` : "Orders waiting on you") : undefined} />
      {rows.length ? (
        <ScrollView style={{ maxHeight: 340 }} bounces={false}>
          {rows.map((row, i) => {
            const other = people[row.otherId];
            return (
              <Item
                key={row.key}
                label={personName(other)}
                detail={row.text}
                last={i === rows.length - 1}
                leading={<Avatar uri={other?.logoUrl || other?.avatar} name={personName(other)} size={38} />}
                trailing={
                  row.unread ? (
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {row.time ? <Text style={styles.time}>{shortTime(row.time)}</Text> : null}
                      <View style={styles.count}><Text style={styles.countText}>{row.unread > 99 ? "99+" : row.unread}</Text></View>
                    </View>
                  ) : (
                    <View style={styles.dot} />
                  )
                }
                onPress={() => {
                  onClose();
                  router.push(row.path as never);
                }}
              />
            );
          })}
        </ScrollView>
      ) : (
        <Nothing icon="checkmark.bubble" text="You're all caught up." />
      )}
      <Footer
        label="Open messages"
        onPress={() => {
          onClose();
          router.navigate("/messages");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: "absolute", left: 14, right: 14, backgroundColor: colors.surface, borderRadius: 26, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  title: { fontSize: 20, lineHeight: 25, fontWeight: "800", letterSpacing: -0.3, color: brand.navy },
  subtitle: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: brand.slate },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 13, minHeight: 52 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemLabel: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  itemDetail: { fontSize: 14, lineHeight: 19, color: brand.slate },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: brand.frost },
  footerText: { fontSize: 16, fontWeight: "700", color: brand.electric },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff6b2c" },
  time: { fontSize: 12, color: brand.slate, fontWeight: "500" },
  count: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: "#ff6b2c", alignItems: "center", justifyContent: "center" },
  countText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
