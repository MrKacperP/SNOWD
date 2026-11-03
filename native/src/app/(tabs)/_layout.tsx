import { NativeTabs } from "expo-router/native-tabs";
import { useAuth } from "~/context/auth";
import { useChats } from "~/lib/data";
import { colors } from "~/lib/theme";

export default function TabsLayout() {
  const { user, profile } = useAuth();
  const { chats } = useChats(user?.uid);
  const unread = chats.reduce((sum, chat) => sum + (chat.unreadCount?.[user?.uid || ""] || 0), 0);
  const operator = profile?.role === "operator";
  return (
    <NativeTabs tintColor={colors.accent}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="jobs">
        <NativeTabs.Trigger.Icon sf={{ default: "list.clipboard", selected: "list.clipboard.fill" }} md="assignment" />
        <NativeTabs.Trigger.Label>{operator ? "Jobs" : "Orders"}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="find" hidden={operator}>
        <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="map" />
        <NativeTabs.Trigger.Label>Find</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} md="chat" />
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        {unread > 0 ? <NativeTabs.Trigger.Badge>{unread > 99 ? "99+" : String(unread)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
