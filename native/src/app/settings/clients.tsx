import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { Contact, ContactField, ContactsSortOrder, requestPermissionsAsync } from "expo-contacts";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Linking, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShovelIcon } from "~/components/MapStyle";
import { TabHeader } from "~/components/TabHeader";
import { Avatar, Icon, Screen } from "~/components/ui";
import { useAuth } from "~/context/auth";
import { useAppTheme } from "~/lib/appearance";
import { inviteLink } from "~/lib/invite";
import { colors, radius, space, type } from "~/lib/theme";

/** Pulls the person's id out of a scanned SNOWD code (https://…/i/<uid> or snowd://invite/<uid>). */
const uidFromCode = (data: string) => data.match(/\/i\/([^/?#]+)/)?.[1] || data.match(/^snowd:\/\/invite\/([^/?#]+)/)?.[1] || "";

/**
 * Invite people to SNOWD, Snapchat-style: your SNOWD code (a QR with your photo in the middle) to
 * be scanned, quick buttons to copy, text, share or scan, and your phone's contacts with an Invite
 * button each. Only invites out of the app: it never lists or adds people who are already on SNOWD.
 */
export default function Invite() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const theme = useAppTheme();
  const uid = user?.uid || "";
  const operator = profile?.role === "operator";
  const link = inviteLink(uid);
  const name = (operator && profile?.businessName) || profile?.displayName || "Me";
  const photo = (operator && profile?.logoUrl) || profile?.avatar || "";
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  // Your phone's contacts, read on the phone only (nothing is uploaded), to text an invite.
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string }[] | null>(null);
  const [contactsDenied, setContactsDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<string[]>([]);
  const loadContacts = async () => {
    const { granted } = await requestPermissionsAsync();
    if (!granted) return setContactsDenied(true);
    const all = await Contact.getAllDetails([ContactField.FULL_NAME, ContactField.PHONES], { sortOrder: ContactsSortOrder.GivenName }).catch(() => []);
    setContacts(
      all
        .map((c, i) => ({ id: String((c as { id?: string }).id || i), name: String(c.fullName || "").trim(), phone: c.phones?.[0]?.number || "" }))
        .filter((c) => c.name && c.phone),
    );
  };
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (contacts || []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 60);
  }, [contacts, search]);
  const inviteText = operator ? `Book your snow clearing with ${name} on SNOWD: ${link}` : `Join me on SNOWD, the easy way to get snow cleared: ${link}`;
  const inviteContact = (c: { id: string; name: string; phone: string }) => {
    setInvited((x) => [...x, c.id]);
    const body = encodeURIComponent(`Hi ${c.name.split(" ")[0]}! ${inviteText}`);
    void Linking.openURL(`sms:${c.phone.replace(/[^\d+]/g, "")}&body=${body}`).catch(() => share(c.name.split(" ")[0]));
  };

  const copy = async () => {
    await Clipboard.setStringAsync(link);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = (to?: string) =>
    void Share.share({
      message: operator ? `${to ? `Hi ${to}! ` : ""}Book your snow clearing with ${name} on SNOWD: ${link}` : `${to ? `Hi ${to}! ` : ""}Add me on SNOWD, the easy way to get snow cleared: ${link}`,
      url: link,
    }).catch(() => {});
  const text = () => void Linking.openURL(`sms:&body=${encodeURIComponent(inviteText)}`).catch(() => share());
  const scan = async () => {
    const status = permission?.granted ? permission : await requestPermission();
    if (!status.granted) return;
    handled.current = false;
    setScanning(true);
  };
  const onScanned = (data: string) => {
    const scanned = uidFromCode(data);
    if (!scanned || handled.current) return;
    handled.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScanning(false);
    router.push(`/invite/${scanned}`);
  };
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "Invite friends" }} />
      <Screen contentInsetAdjustmentBehavior="never" contentStyle={{ padding: 0, gap: space.lg, paddingBottom: insets.bottom + 40 }}>
        <TabHeader title="Invite to SNOWD" subtitle={operator ? "Customers scan your code to book you." : "Friends scan your code to add you."} onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}>
          {/* Your SNOWD code: a QR with your photo in the middle, on a white card. */}
          <View style={styles.codeCard}>
            <View style={styles.qr}>
              {uid ? <QRCode value={link} size={196} color={theme.deep} backgroundColor="#fff" ecl="H" /> : null}
              <View style={[styles.qrCenter, { backgroundColor: theme.accent }]}>
                {photo ? <Avatar uri={photo} name={name} size={50} /> : <ShovelIcon size={26} />}
              </View>
            </View>
            <Text style={[type.headline, { fontSize: 20, textAlign: "center" }]}>{name}</Text>
            <Text style={[type.caption, { textAlign: "center" }]} numberOfLines={1}>{link.replace(/^https:\/\//, "")}</Text>
          </View>
        </TabHeader>

        <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
          {/* Big round actions, like Snapchat's Add Friends. */}
          <View style={styles.actions}>
            {[
              { key: "copy", icon: copied ? "checkmark" : "link", label: copied ? "Copied" : "Copy link", onPress: () => void copy() },
              { key: "text", icon: "message.fill", label: "Text", onPress: text },
              { key: "share", icon: "square.and.arrow.up", label: "Share", onPress: () => share() },
              { key: "scan", icon: "qrcode.viewfinder", label: "Scan", onPress: () => void scan() },
            ].map((a) => (
              <Pressable key={a.key} accessibilityRole="button" accessibilityLabel={a.label} onPress={() => { void Haptics.selectionAsync(); a.onPress(); }} style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.95 }] }]}>
                <View style={[styles.actionCircle, { backgroundColor: theme.accent }]}>
                  <Icon name={a.icon as never} size={22} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Invite from your contacts, one tap each (opens Messages with the invite written). */}
          <View style={{ gap: 10 }}>
            <Text style={type.overline}>Invite from contacts</Text>
            {contacts === null ? (
              <Pressable accessibilityRole="button" onPress={() => void loadContacts()} style={({ pressed }) => [styles.list, styles.findContacts, pressed && { opacity: 0.8 }]}>
                <View style={[styles.contactIcon, { backgroundColor: theme.accent }]}>
                  <Icon name="person.crop.circle.badge.plus" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.headline}>{contactsDenied ? "Allow access to contacts" : "Find people in your contacts"}</Text>
                  <Text style={type.caption}>{contactsDenied ? "Turn on Contacts for SNOWD in Settings." : "Your contacts stay on your phone."}</Text>
                </View>
                <Icon name="chevron.right" size={13} color={colors.muted} />
              </Pressable>
            ) : (
              <>
                <View style={styles.searchBox}>
                  <Icon name="magnifyingglass" size={15} color={colors.muted} />
                  <TextInput value={search} onChangeText={setSearch} placeholder="Search contacts" placeholderTextColor={colors.muted} accessibilityLabel="Search contacts" clearButtonMode="while-editing" style={{ flex: 1, fontSize: 16, color: colors.ink }} />
                </View>
                <View style={styles.list}>
                  {shown.length ? (
                    shown.map((c, i) => {
                      const done = invited.includes(c.id);
                      return (
                        <View key={c.id} style={[styles.person, i > 0 && styles.divider]}>
                          <Avatar name={c.name} size={40} />
                          <View style={{ flex: 1 }}>
                            <Text style={type.headline} numberOfLines={1}>{c.name}</Text>
                            <Text style={type.caption} numberOfLines={1}>{c.phone}</Text>
                          </View>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Invite ${c.name}`} onPress={() => inviteContact(c)} style={[styles.addButton, { backgroundColor: done ? colors.surfaceAlt : theme.accent }]}>
                            <Icon name={done ? "checkmark" : "paperplane.fill"} size={13} color={done ? colors.mint : "#fff"} weight="bold" />
                            <Text style={[styles.addText, done && { color: colors.mint }]}>{done ? "Invited" : "Invite"}</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[type.caption, { paddingVertical: 16, textAlign: "center" }]}>{search ? "No contacts match." : "No contacts with a phone number."}</Text>
                  )}
                </View>
              </>
            )}
          </View>
          <Text style={type.caption}>Your link opens SNOWD if they have it, or lets them get the app or use SNOWD on the web, with you already saved.</Text>
        </View>
      </Screen>

      {/* Scan someone else's SNOWD code with the camera. */}
      <Modal visible={scanning} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setScanning(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={(r) => onScanned(r.data)} />
          <View style={styles.scanFrameWrap} pointerEvents="none">
            <View style={[styles.scanFrame, { borderColor: "#fff" }]} />
            <Text style={styles.scanHint}>Point at a SNOWD code</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close scanner" onPress={() => setScanning(false)} style={[styles.close, { top: insets.top + 12 }]}>
            <Icon name="xmark" size={18} color="#fff" weight="bold" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignSelf: "center", alignItems: "center", gap: 6, width: "100%", maxWidth: 320, paddingVertical: space.lg, paddingHorizontal: space.md, marginTop: space.sm, borderRadius: 28, backgroundColor: "#fff" },
  qr: { padding: 10, borderRadius: radius.lg, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  qrCenter: { position: "absolute", width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#fff", overflow: "hidden" },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  action: { width: "25%", alignItems: "center", gap: 8 },
  actionCircle: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", boxShadow: "0px 6px 16px rgba(35,80,255,0.25)" },
  actionLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  person: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66 },
  findContacts: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 70 },
  contactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, minHeight: 34, borderRadius: 17 },
  addText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  scanFrameWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 18 },
  scanFrame: { width: 240, height: 240, borderRadius: 32, borderWidth: 4 },
  scanHint: { color: "#fff", fontSize: 17, fontWeight: "700" },
  close: { position: "absolute", right: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});
