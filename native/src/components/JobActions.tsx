import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, View, type StyleProp, type ViewStyle } from "react-native";
import type { Job } from "@/lib/types";
import { useAuth } from "~/context/auth";
import { jobActions, type JobAction } from "~/lib/jobActions";
import { Button, Notice } from "./ui";

function askPhotoSource(): Promise<"camera" | "library" | null> {
  return new Promise((resolve) => {
    if (Platform.OS === "ios")
      ActionSheetIOS.showActionSheetWithOptions({ title: "Add a photo of the finished work", options: ["Take photo", "Choose from library", "Cancel"], cancelButtonIndex: 2 }, (i) =>
        resolve(i === 0 ? "camera" : i === 1 ? "library" : null),
      );
    else
      Alert.alert("Add a photo of the finished work", undefined, [
        { text: "Take photo", onPress: () => resolve("camera") },
        { text: "Choose from library", onPress: () => resolve("library") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
  });
}

/**
 * Runs a work order's next steps: confirms what needs confirming, asks for the photo source,
 * shows a spinner on the pressed button, buzzes on success or failure and says what happened.
 */
export function useJobActions(job: Job | null) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const actions = job ? jobActions(job, user?.uid || "", profile) : [];

  const execute = async (action: JobAction, source?: "camera" | "library") => {
    setBusy(action.key);
    setError("");
    setSuccess("");
    try {
      const result = await action.run(source);
      if (result !== false) {
        setSuccess(action.done);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy("");
    }
  };

  const press = async (action: JobAction) => {
    if (action.photo) {
      const source = await askPhotoSource();
      if (source) void execute(action, source);
      return;
    }
    if (action.confirm) {
      const c = action.confirm;
      Alert.alert(c.title, c.message, [
        { text: "Not now", style: "cancel" },
        { text: c.label, style: c.destructive ? "destructive" : "default", onPress: () => void execute(action) },
      ]);
      return;
    }
    void execute(action);
  };

  return { actions, busy, error, success, press, setError, setSuccess };
}

/** The work order's next-step buttons side by side (main action widest), plus what happened. */
export function JobActionButtons({ state, style, showNotices = true }: { state: ReturnType<typeof useJobActions>; style?: StyleProp<ViewStyle>; showNotices?: boolean }) {
  const { actions, busy, error, success, press } = state;
  if (!actions.length && !error && !success) return null;
  return (
    <View style={[{ gap: 10 }, style]}>
      {showNotices ? (
        <>
          <Notice text={error} />
          <Notice tone="green" text={success} />
        </>
      ) : null}
      {actions.length ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {actions.map((action, i) => (
            <Button
              key={action.key}
              title={action.title}
              icon={action.icon}
              variant={action.variant || "primary"}
              loading={busy === action.key}
              disabled={!!busy && busy !== action.key}
              onPress={() => void press(action)}
              style={{ flex: i === 0 ? 2 : 1 }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
