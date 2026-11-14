import { NativeTabs } from "expo-router/native-tabs";
import { useEffect, useRef, useState } from "react";
import { onTabLongPress } from "../../../modules/tab-long-press";
import { TabQuickMenu, type QuickTab } from "~/components/TabQuickMenu";
import { useAuth } from "~/context/auth";
import { useChats, useJobs } from "~/lib/data";
import { useTabAvatar } from "~/components/TabAvatar";
import { brand } from "~/lib/theme";

export default function TabsLayout() {
  const { user, profile } = useAuth();
  const { chats } = useChats(user?.uid);
  const unread = chats.reduce((sum, chat) => sum + (chat.unreadCount?.[user?.uid || ""] || 0), 0);
  const operator = profile?.role === "operator";
  const { jobs } = useJobs(user?.uid, profile?.role);
  // Press and hold a tab for shortcuts: Orders previews what's on the go, Messages what's unread,
  // Profile opens account actions. Tabs are counted left to right as they show on screen.
  const [quick, setQuick] = useState<QuickTab | null>(null);
  const visible = useRef<string[]>([]);
  visible.current = operator ? ["home", "jobs", "messages", "profile"] : ["home", "jobs", "find", "messages", "profile"];
  useEffect(
    () =>
      onTabLongPress((index) => {
        const name = visible.current[index];
        if (name === "profile" || name === "jobs" || name === "messages") setQuick(name);
      }),
    [],
  );
  // Once there's a profile picture (a shoveler's business logo, else their photo), the Profile tab shows it.
  const { icon: avatarIcon, renderer } = useTabAvatar((operator && profile?.logoUrl) || profile?.avatar || undefined, brand.electric);
  return (
    <>
    <NativeTabs
      tintColor={brand.electric}
      iconColor={{ default: brand.slate, selected: brand.electric }}
      labelStyle={{ default: { fontSize: 15, fontWeight: "600", color: brand.slate }, selected: { fontSize: 15, fontWeight: "700", color: brand.electric } }}
      badgeBackgroundColor="#ff6b2c"
      // Icons only (each tab still has its name for VoiceOver); the bar never shrinks while scrolling.
      minimizeBehavior="never"
      labelVisibilityMode="unlabeled"
      indicatorColor={brand.ice}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="jobs">
        <NativeTabs.Trigger.Icon sf={{ default: "list.clipboard", selected: "list.clipboard.fill" }} md="assignment" />
        <NativeTabs.Trigger.Label hidden>{operator ? "Jobs" : "Orders"}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="find" hidden={operator}>
        <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="map" />
        <NativeTabs.Trigger.Label hidden>Find</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} md="chat" />
        <NativeTabs.Trigger.Label hidden>Messages</NativeTabs.Trigger.Label>
        {unread > 0 ? <NativeTabs.Trigger.Badge>{unread > 99 ? "99+" : String(unread)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        {avatarIcon ? (
          // "original" keeps the photo's colours; the default tinting would paint it one solid colour.
          <NativeTabs.Trigger.Icon src={avatarIcon} renderingMode="original" />
        ) : (
          <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
        )}
        <NativeTabs.Trigger.Label hidden>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
    {renderer}
    <TabQuickMenu tab={quick} onClose={() => setQuick(null)} jobs={jobs} chats={chats} />
    </>
  );
}
