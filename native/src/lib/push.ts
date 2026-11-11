import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { db } from "./firebase";

// While the app is open the in-app banner (InAppBanner) shows the update, so the system one stays
// quiet on screen but still lands in Notification Centre with its sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

/** The EAS project the push service sends through. Set by `eas init` (app.json) or EXPO_PUBLIC_EAS_PROJECT_ID. */
const projectId: string | undefined =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID || Constants.easConfig?.projectId || (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

let currentToken = "";

/** Asks for notification permission once signed in, and registers this phone so the server can reach it. */
export async function registerForPush(uid: string) {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", { name: "Job and message updates", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200] });
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted" || !projectId) return;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  currentToken = data;
  await setDoc(doc(db, "pushTokens", data), { uid, platform: Platform.OS, updatedAt: serverTimestamp() });
}

/** Stops sending this person's updates to this phone (call before signing out). */
export async function unregisterPush() {
  if (currentToken) await deleteDoc(doc(db, "pushTokens", currentToken)).catch(() => {});
  currentToken = "";
  await Notifications.setBadgeCountAsync(0).catch(() => {});
}

function routeFor(data: Record<string, unknown> | undefined) {
  if (typeof data?.chatId === "string" && data.chatId) return `/chat/${data.chatId}`;
  if (typeof data?.jobId === "string" && data.jobId) return `/job/${data.jobId}`;
  return "/notifications";
}

/**
 * Registers for phone notifications while signed in, opens the matching chat or work order
 * when one is tapped (also when it launched the app).
 */
export function usePushNotifications(uid?: string, ready?: boolean) {
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (uid && ready) void registerForPush(uid).catch(() => {});
  }, [uid, ready]);

  useEffect(() => {
    if (!ready) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || handled.current === response.notification.request.identifier) return;
      handled.current = response.notification.request.identifier;
      router.push(routeFor(response.notification.request.content.data) as never);
    };
    open(Notifications.getLastNotificationResponse());
    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    return () => tapped.remove();
  }, [ready, router]);
}

/** Keeps the app icon's badge equal to the number of unread updates and messages. */
export function useBadge(count: number) {
  useEffect(() => {
    void Notifications.setBadgeCountAsync(count).catch(() => {});
  }, [count]);
}
