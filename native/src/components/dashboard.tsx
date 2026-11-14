import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { SymbolViewProps } from "expo-symbols";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { SERVICE_LABELS, type Job } from "@/lib/types";
import { orderNumber } from "@/lib/workOrders";
import { personName, type Person } from "~/lib/data";
import { money } from "~/lib/format";
import { brand, ds, family, gap, gradient, stepColor, tap } from "~/lib/theme";
import { useAppTheme } from "~/lib/appearance";
import { PENGUIN, Skeleton, Snowfall } from "./brand";
import { useJobActions } from "./JobActions";
import { BigButton, ScalePress, Surface } from "./kit";
import { ORDER_STEPS, ProgressBar, stepIndex } from "./OrderProgress";
import { Avatar, Icon, Notice } from "./ui";

type SymbolName = SymbolViewProps["name"];

/** How far the first card rides up over the header. */
export const HEADER_OVERLAP = 28;

/** True when the person has turned system text up a long way, so layouts switch to fewer columns. */
export function useLargeText() {
  const { fontScale, width } = useWindowDimensions();
  return { large: fontScale >= 1.35, huge: fontScale >= 1.7, narrow: width < 370, fontScale };
}

/*
 * Layout inspired by premium car-companion apps: one big title with a status line, then the thing
 * that matters (the current job, or booking one), a row of round controls and a few calm rows.
 * Ink on white, one blue accent.
 */

/* ───────────────────────────── Top bar & title ───────────────────────────── */

/**
 * The blue header behind the top row and title: the brand gradient, one soft glow and a few faint
 * snowflakes. Kept short so the work order right under it stays the first thing you look at.
 */
export function BlueHeader({ topInset, children, tone, footer }: { topInset: number; children: ReactNode; tone?: { text: string; bar: string }; /** Drawn inside the gradient at its bottom, so the colour runs to the bottom of this widget. */ footer?: ReactNode }) {
  // With a live job the header takes that job's progress colour (deep shade behind the text, so
  // white type stays readable); with no job it is the theme's blue. Top to bottom, so the top edge
  // is one flat colour that carries on seamlessly above the page when you pull down to refresh.
  const theme = useAppTheme();
  const top = tone ? tone.text : theme.deep;
  const image = tone
    ? `linear-gradient(180deg, ${tone.text} 0%, ${tone.text} 35%, ${tone.bar} 100%)`
    : `linear-gradient(180deg, ${theme.deep} 0%, ${theme.mid} 40%, ${theme.accent} 85%, ${theme.end} 100%)`;
  return (
    <View>
      {/* Above the header: the same top colour with snow still falling, so pulling down looks like more header. */}
      <View pointerEvents="none" style={[styles.overscroll, { backgroundColor: top }]}>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260 }}>
          <Snowfall count={6} height={260} color="rgba(255,255,255,0.45)" />
        </View>
      </View>
      <View style={[styles.blueHeader, { backgroundColor: top, backgroundImage: image, paddingTop: topInset }, footer ? { paddingBottom: gap.x4 } : null]}>
        <View pointerEvents="none" style={styles.headerGlow} />
        <Snowfall count={8} height={footer ? 420 : 220} color="rgba(255,255,255,0.55)" />
        {children}
        {footer ? (
          <View>
            {/* No hard bottom edge: the colour fades into the page behind the lower part of the widget. */}
            <View pointerEvents="none" style={[styles.headerFade, { backgroundImage: gradient.pageFade }]} />
            {footer}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** The quiet top row: the SNOWD name on the left, updates and your photo on the right. */
export function HomeTopBar({ unread, onBell, avatar, name, onProfile, pictureLabel = "Your profile" }: { unread: number; onBell: () => void; avatar?: string; name?: string; onProfile: () => void; pictureLabel?: string }) {
  return (
    <View style={styles.topBar}>
      <View accessible accessibilityRole="header" accessibilityLabel="SNOWD" style={styles.brandRow}>
        <Image source={PENGUIN} style={{ width: 22, height: 24 }} contentFit="contain" />
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.3}>SNOWD</Text>
      </View>
      <View style={styles.topActions}>
        <ScalePress haptic="light" accessibilityLabel={unread ? `Updates, ${unread} unread` : "Updates"} onPress={onBell} style={styles.topButton}>
          <Icon name="bell" size={21} color="#fff" />
          {unread ? <View style={styles.unreadDot} /> : null}
        </ScalePress>
        {/* The business logo (shovelers) or the home's photo (customers), big enough to recognise. */}
        <ScalePress haptic="light" accessibilityLabel={pictureLabel} onPress={onProfile} style={styles.picture}>
          {avatar ? <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <Avatar name={name} size={56} />}
        </ScalePress>
      </View>
    </View>
  );
}

/** One big title and a single status line, with a dot that says on or off duty (words too, not just colour). */
export function HomeTitle({ title, status, live }: { title: string; status: string; live?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={1.5}>{title}</Text>
      <View style={styles.statusLine}>
        {live !== undefined ? <View style={[styles.statusDot, { backgroundColor: live ? brand.liveBright : "rgba(255,255,255,0.45)" }]} /> : null}
        <Text style={styles.statusText} maxFontSizeMultiplier={1.6}>{status}</Text>
      </View>
    </View>
  );
}

/* ───────────────────────────── Round controls ───────────────────────────── */

/** Saves availability right away, and puts it back with a message if saving fails. */
export function useAvailability(available: boolean, onChange: (value: boolean) => Promise<void>) {
  const [on, setOn] = useState(available);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!saving) setOn(available);
  }, [available, saving]);
  const toggle = async () => {
    const next = !on;
    setOn(next);
    setError("");
    setSaving(true);
    void Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    try {
      await onChange(next);
    } catch {
      setOn(!next);
      setError("Couldn’t update your availability. Check your connection and try again.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };
  return { on, saving, error, toggle };
}

export type Control = { key: string; icon: SymbolName; label: string; onPress: () => void; active?: boolean; role?: "switch"; busy?: boolean };

/** A row of round controls with labels underneath. An active control (on duty) is filled. */
export function ControlRow({ items }: { items: Control[] }) {
  const { large } = useLargeText();
  return (
    <View style={[styles.controls, large && { flexWrap: "wrap", rowGap: gap.x4 }]}>
      {items.map((c) => (
        <Pressable
          key={c.key}
          accessibilityRole={c.role === "switch" ? "switch" : "button"}
          accessibilityLabel={c.label}
          accessibilityState={c.role === "switch" ? { checked: !!c.active, busy: !!c.busy } : undefined}
          onPress={() => {
            if (c.role !== "switch") void Haptics.selectionAsync();
            c.onPress();
          }}
          style={({ pressed }) => [styles.control, large && { width: "50%" }, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
        >
          <View style={[styles.controlCircle, c.active && styles.controlCircleOn]}>
            <Icon name={c.icon} size={22} color={c.active ? "#fff" : ds.ink} />
          </View>
          <Text style={[styles.controlLabel, c.active && { color: ds.ink }]} numberOfLines={2}>{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ───────────────────────────── Current job ───────────────────────────── */

/**
 * The current job as one calm card: the step (in its progress colour), who and how much, where,
 * the progress bar, and the one next action this step allows.
 */
export function ActiveJobCard({ job, uid, other, onFinished, celebrate, onDismiss }: { job: Job; uid: string; other?: Person; onFinished?: (message: string, key: string) => void; /** Just finished: show this success message in place of the actions. */ celebrate?: string; onDismiss?: () => void }) {
  const router = useRouter();
  const { large } = useLargeText();
  const state = useJobActions(job, { onDone: onFinished });
  const operator = job.operatorId === uid;
  const index = stepIndex(job);
  const step = ORDER_STEPS[index];
  const tone = stepColor(job.status);
  const services = (job.serviceTypes || []).map((s) => SERVICE_LABELS[s] || s).join(", ") || "Snow clearing";
  const eta = job.status === "en-route" && job.eta ? `Arriving in about ${job.eta} min` : job.status === "accepted" && job.nearbyEta ? `About ${job.nearbyEta} min away` : "";
  const place = [job.address, job.city].filter(Boolean).join(", ");
  const detail = [services, eta || place].filter(Boolean).join(" · ");
  const amount = money(jobDisplayPrice(job, operator));
  const name = personName(other);
  const stepText = `${step?.label || "Open"}${index >= 0 ? ` · Step ${index + 1} of ${ORDER_STEPS.length}` : ""}`;
  const [primary, ...rest] = state.actions;

  return (
    <Surface style={styles.card}>
      <ScalePress depthScale={0.985} accessibilityLabel={`${stepText}. ${name}, ${amount}. ${detail}. Order ${orderNumber(job)}. Open job details`} onPress={() => router.push(`/job/${job.id}`)} style={{ gap: 6 }}>
        <View style={styles.cardHead}>
          <Text style={[styles.stepText, { color: tone.text }]}>{stepText}</Text>
          <Icon name="chevron.right" size={13} color={ds.ink3} weight="bold" />
        </View>
        {/* With very large text the amount moves under the name, so neither gets cut off. */}
        <View style={[styles.nameRow, large && { flexDirection: "column", alignItems: "flex-start", gap: 0 }]}>
          <Text style={[styles.name, large && { flex: 0 }]} numberOfLines={large ? undefined : 1}>{name}</Text>
          <Text style={styles.amount}>{amount}</Text>
        </View>
        <Text style={styles.detail} numberOfLines={large ? undefined : 1}>{detail}</Text>
        <View style={{ marginTop: 6 }}>
          <ProgressBar job={job} compact />
        </View>
      </ScalePress>

      {celebrate ? (
        // The success lands right here in the work order, where the button that finished it was.
        <Animated.View entering={FadeIn.duration(250)} accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.success}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.successIcon}>
            <Icon name="checkmark" size={20} color="#fff" weight="bold" />
          </Animated.View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.successTitle}>Nice work!</Text>
            <Text style={styles.successBody}>{celebrate}</Text>
          </View>
          {onDismiss ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} onPress={onDismiss} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.6 }]}>
              <Icon name="xmark" size={14} color={ds.mint} weight="bold" />
            </Pressable>
          ) : null}
        </Animated.View>
      ) : (
        <>
        <Notice text={state.error} />
        <Notice tone="green" text={state.success} />

        <View style={styles.actionRow}>
          {primary ? (
            <BigButton
              title={primary.title}
              icon={primary.icon}
              variant={primary.variant === "danger" ? "danger" : "primary"}
              loading={state.busy === primary.key}
              disabled={!!state.busy && state.busy !== primary.key}
              onPress={() => void state.press(primary)}
              style={{ flex: 1 }}
            />
          ) : null}
          {job.chatId ? (
            primary ? (
              <ScalePress haptic="light" accessibilityLabel={`Message ${name}`} onPress={() => router.push(`/chat/${job.chatId}`)} style={styles.iconButton}>
                <Icon name="bubble.left" size={20} color={ds.ink} />
              </ScalePress>
            ) : (
              // Nothing for you to do right now: messaging is the action, so it fills the widget's width.
              <BigButton title={`Message ${name}`} icon="bubble.left.fill" variant="soft" onPress={() => router.push(`/chat/${job.chatId}`)} style={{ flex: 1 }} />
            )
          ) : null}
        </View>
        {rest.map((a) => (
          <Pressable key={a.key} accessibilityRole="button" accessibilityLabel={a.title} disabled={!!state.busy} onPress={() => void state.press(a)} style={({ pressed }) => [styles.textButton, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.textButtonLabel, a.variant === "danger" && { color: "#b42318" }]}>{state.busy === a.key ? "Working…" : a.title}</Text>
          </Pressable>
        ))}
        </>
      )}
    </Surface>
  );
}

/* ───────────────────────────── Rows ───────────────────────────── */

export type InfoItem = { key: string; icon: SymbolName; label: string; value: string; onPress?: () => void; iconColor?: string };

/** A grouped list of rows, like a settings list: icon, label, value on the right, chevron. */
export function InfoList({ items }: { items: InfoItem[] }) {
  return (
    <Surface style={{ padding: 0, gap: 0, borderRadius: 24, overflow: "hidden" }}>
      {items.map((it, i) => (
        <Pressable
          key={it.key}
          accessibilityRole={it.onPress ? "button" : undefined}
          accessibilityLabel={`${it.label}: ${it.value}`}
          disabled={!it.onPress}
          onPress={() => {
            void Haptics.selectionAsync();
            it.onPress?.();
          }}
          style={({ pressed }) => [styles.infoRow, i > 0 && styles.infoDivider, pressed && { backgroundColor: ds.bgAlt }]}
        >
          <Icon name={it.icon} size={19} color={it.iconColor || ds.ink3} />
          <Text style={styles.infoLabel}>{it.label}</Text>
          <Text style={styles.infoValue}>{it.value}</Text>
          {it.onPress ? <Icon name="chevron.right" size={13} color={ds.ink3} weight="bold" /> : null}
        </Pressable>
      ))}
    </Surface>
  );
}

/* ───────────────────────────── Penguin moments ───────────────────────────── */

/** A short message card: used for the empty state and celebrations. */
export function MessageCard({ title, body, tone = "white", action, hop }: { title?: string; body: string; tone?: "white" | "live"; action?: ReactNode; hop?: boolean }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!hop || reduce) return;
    y.value = withSequence(withTiming(-10, { duration: 180, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 6, stiffness: 180 }));
  }, [hop, reduce, y]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Surface tone={tone} elevation={tone === "white" ? "low" : "none"} style={styles.card}>
      <Animated.View style={[{ gap: 2 }, bounce]}>
        {title ? <Text accessibilityRole="header" style={styles.name}>{title}</Text> : null}
        <Text style={styles.detail}>{body}</Text>
      </Animated.View>
      {action}
    </Surface>
  );
}

/**
 * A customer's main call to action when nothing is booked: one clear "Book a shoveler" button,
 * with the penguin and three short reassurances.
 */
export function BookCard({ city, onBook }: { city?: string; onBook: () => void }) {
  return (
    <Surface style={[styles.card, { gap: gap.x4 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: gap.x3 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={[styles.name, { fontSize: 26, lineHeight: 31 }]}>Need snow cleared?</Text>
          <Text style={styles.detail}>Book a trusted shoveler near {city || "you"}. You only pay when it’s done.</Text>
        </View>
        <Image source={PENGUIN} style={{ width: 58, height: 62 }} contentFit="contain" accessibilityIgnoresInvertColors />
      </View>
      <View style={{ gap: 8 }}>
        {["Pick a shoveler and see the price first", "Follow every step live, right here", "Card is only charged after the photo of the work"].map((line) => (
          <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="checkmark.circle.fill" size={18} color={ds.mint} />
            <Text style={[styles.detail, { color: ds.ink2, flex: 1 }]}>{line}</Text>
          </View>
        ))}
      </View>
      <BigButton title="Book a shoveler" icon="snowflake" onPress={onBook} />
    </Surface>
  );
}

/** A celebration after finishing a job, shown until dismissed. */
export function Celebration({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert">
      <MessageCard
        tone="live"
        hop
        title="Nice work!"
        body={message}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={6} onPress={onDismiss} style={({ pressed }) => [styles.textButton, { alignSelf: "flex-end" }, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.textButtonLabel, { color: ds.mint }]}>Dismiss</Text>
          </Pressable>
        }
      />
    </View>
  );
}

/** Placeholder in the shape of the job card, so nothing jumps when data arrives. */
export function DashboardSkeleton() {
  return (
    <Surface style={styles.card}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading your dashboard" style={{ gap: gap.x3 }}>
        <Skeleton width={150} height={14} />
        <Skeleton width="70%" height={22} />
        <Skeleton width="55%" height={16} />
        <Skeleton height={6} />
        <Skeleton height={54} style={{ borderRadius: ds.radius }} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  overscroll: { position: "absolute", top: -800, height: 820, left: 0, right: 0, backgroundColor: brand.royalDeep },
  // Square bottom edge: the rounded cards below overlap it instead.
  blueHeader: { paddingHorizontal: gap.x4, paddingBottom: gap.x5 + HEADER_OVERLAP, gap: gap.x3, overflow: "hidden", backgroundColor: brand.royal, backgroundImage: `linear-gradient(160deg, ${brand.royalDeep} 0%, ${brand.royal} 45%, ${ds.accent} 85%, ${ds.accentIndigo} 100%)` },
  headerFade: { position: "absolute", top: -90, bottom: -gap.x4, left: -gap.x4, right: -gap.x4 },
  headerGlow: { position: "absolute", top: 40, right: -110, width: 300, height: 300, borderRadius: 999, backgroundImage: gradient.glow },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: tap },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: { fontFamily: family.heading, fontSize: 17, letterSpacing: 3, color: "#fff" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  topButton: { width: tap, height: tap, alignItems: "center", justifyContent: "center" },
  picture: { width: 56, height: 56, borderRadius: 18, overflow: "hidden", marginLeft: 6, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  unreadDot: { position: "absolute", top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: ds.sun, borderWidth: 1.5, borderColor: brand.royal },
  title: { fontFamily: family.heading, fontSize: 34, lineHeight: 40, letterSpacing: -1, color: "#fff" },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { flexShrink: 1, fontFamily: family.body, fontSize: 16, lineHeight: 21, color: brand.onBlueSoft },
  controls: { flexDirection: "row", justifyContent: "space-between" },
  control: { width: "25%", alignItems: "center", gap: 8, minHeight: tap },
  controlCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, alignItems: "center", justifyContent: "center", ...ds.cardShadow },
  controlCircleOn: { backgroundColor: ds.accent, borderColor: ds.accent, ...ds.accentShadow },
  controlLabel: { fontFamily: family.bodySemi, fontSize: 14, lineHeight: 18, color: ds.ink2, textAlign: "center" },
  card: { padding: gap.x4, gap: gap.x3, borderRadius: 24 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: gap.x2 },
  stepText: { flexShrink: 1, fontFamily: family.bodyBold, fontSize: 14, lineHeight: 18, letterSpacing: 0.2 },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: gap.x3 },
  name: { flex: 1, fontFamily: family.heading, fontSize: 22, lineHeight: 27, letterSpacing: -0.5, color: ds.ink },
  amount: { fontFamily: family.heading, fontSize: 22, lineHeight: 27, letterSpacing: -0.5, color: ds.ink, fontVariant: ["tabular-nums"] },
  detail: { fontFamily: family.body, fontSize: 16, lineHeight: 21, color: ds.ink3 },
  actionRow: { flexDirection: "row", gap: gap.x2, alignItems: "stretch" },
  success: { flexDirection: "row", alignItems: "center", gap: gap.x3, padding: gap.x4, borderRadius: ds.radius, backgroundColor: ds.mintSoft, borderWidth: 1, borderColor: "#cfe9dd" },
  successIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: ds.mint, alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: family.heading, fontSize: 19, lineHeight: 24, color: ds.mint },
  successBody: { fontFamily: family.body, fontSize: 15, lineHeight: 20, color: ds.ink2 },
  iconButton: { width: 56, minHeight: 56, borderRadius: ds.radius, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, alignItems: "center", justifyContent: "center" },
  textButton: { minHeight: tap, alignItems: "center", justifyContent: "center", marginTop: -gap.x2 },
  textButtonLabel: { fontFamily: family.bodySemi, fontSize: 16, color: ds.ink3 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: gap.x3, paddingHorizontal: gap.x4, minHeight: 50 },
  infoDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ds.border },
  infoLabel: { flex: 1, fontFamily: family.bodySemi, fontSize: 16, lineHeight: 21, color: ds.ink },
  infoValue: { fontFamily: family.body, fontSize: 16, lineHeight: 21, color: ds.ink3, fontVariant: ["tabular-nums"] },
});
