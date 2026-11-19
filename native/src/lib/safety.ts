import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import type { ChatMessage } from "@/lib/types";
import { useAuth } from "~/context/auth";
import { notifyAdmin } from "./admin";
import { db } from "./firebase";

/**
 * Report and block, the same records the website uses: reports go to `claims` (the admin team's
 * review queue) and blocks to `userBlocks/{me}/users/{them}`, which the Firestore rules enforce for
 * both people, so neither can message the other while a block stands.
 */

const REASONS = [
  { label: "Harassment or threats", type: "harassment" },
  { label: "Inappropriate or offensive content", type: "inappropriate-content" },
  { label: "Scam or fraud", type: "fraud" },
  { label: "Unsafe behaviour or damage", type: "safety" },
  { label: "Something else", type: "other" },
] as const;

type Target = { uid: string; name: string; chatId?: string; jobId?: string; message?: ChatMessage };

/** Whether I've blocked this person, kept live. */
export function useBlocked(otherId: string) {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!uid || !otherId) return;
    return onSnapshot(doc(db, "userBlocks", uid, "users", otherId), (snap) => setBlocked(snap.exists()), () => setBlocked(false));
  }, [uid, otherId]);
  return blocked;
}

async function setBlock(uid: string, otherId: string, block: boolean) {
  const ref = doc(db, "userBlocks", uid, "users", otherId);
  if (block) await setDoc(ref, { createdAt: serverTimestamp() });
  else await deleteDoc(ref);
}

/** Shows a list of choices; iOS gets a native action sheet. */
function choose(title: string, options: { label: string; destructive?: boolean; run: () => void }[]) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...options.map((o) => o.label), "Cancel"], cancelButtonIndex: options.length, destructiveButtonIndex: options.flatMap((o, i) => (o.destructive ? [i] : [])) },
      (index) => options[index]?.run(),
    );
  } else {
    Alert.alert(title, undefined, [...options.map((o) => ({ text: o.label, style: o.destructive ? ("destructive" as const) : ("default" as const), onPress: o.run })), { text: "Cancel", style: "cancel" as const }]);
  }
}

/** Report and block actions for one person, used from chats and profiles. */
export function useSafety() {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";

  const fileReport = async (target: Target, reason: (typeof REASONS)[number], details: string) => {
    const quoted = target.message ? `Reported message (${target.message.type}): ${target.message.type === "text" ? target.message.content : target.message.metadata?.imageUrl || target.message.metadata?.audioUrl || target.message.metadata?.fileUrl || target.message.content}` : "";
    try {
      await addDoc(collection(db, "claims"), {
        claimantId: uid,
        claimantRole: profile?.role === "operator" ? "operator" : "client",
        againstId: target.uid,
        claimantName: profile?.displayName || "User",
        title: reason.label,
        jobId: target.jobId || "",
        chatId: target.chatId || "",
        messageId: target.message?.id || "",
        type: reason.type,
        description: [details.trim(), quoted].filter(Boolean).join("\n\n") || reason.label,
        status: "open",
        source: "native-app",
        photoUrls: target.message?.metadata?.imageUrl ? [target.message.metadata.imageUrl] : [],
        adminNotes: "",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      notifyAdmin({ type: "support", title: "New report", message: `${profile?.displayName || "A member"} reported ${target.name}: ${reason.label}`, chatId: target.chatId, meta: { againstId: target.uid, reason: reason.type } });
      Alert.alert("Thanks for telling us", `Our team reviews every report within 24 hours and will act on anything that breaks the rules. You can also block ${target.name} so they can’t message you.`);
    } catch {
      Alert.alert("Report not sent", "Check your connection and try again.");
    }
  };

  const askDetails = (target: Target, reason: (typeof REASONS)[number]) => {
    if (Platform.OS === "ios") {
      Alert.prompt("Anything else we should know?", "Optional. Add details to help our team review this.", [
        { text: "Cancel", style: "cancel" },
        { text: "Send report", onPress: (details?: string) => void fileReport(target, reason, details || "") },
      ], "plain-text");
    } else void fileReport(target, reason, "");
  };

  /** Pick a reason, add optional details, then send the report to the review team. */
  const report = (target: Target) => {
    if (!uid || !target.uid) return;
    choose(target.message ? "Why are you reporting this message?" : `Why are you reporting ${target.name}?`, REASONS.map((reason) => ({ label: reason.label, run: () => askDetails(target, reason) })));
  };

  const toggleBlock = (target: Target, blocked: boolean) => {
    if (!uid || !target.uid) return;
    const apply = () =>
      void setBlock(uid, target.uid, !blocked).catch(() => Alert.alert(blocked ? "Couldn’t unblock" : "Couldn’t block", "Check your connection and try again."));
    if (blocked) return apply();
    Alert.alert(`Block ${target.name}?`, "Neither of you will be able to send messages in this chat. Open jobs aren’t cancelled; cancel them from the work order if you need to. You can unblock them any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: apply },
    ]);
  };

  /** The "…" menu: report, and block or unblock. */
  const menu = (target: Target, blocked: boolean) =>
    choose(target.name, [
      { label: `Report ${target.name}`, run: () => report(target) },
      { label: blocked ? `Unblock ${target.name}` : `Block ${target.name}`, destructive: !blocked, run: () => toggleBlock(target, blocked) },
    ]);

  return { report, toggleBlock, menu };
}
