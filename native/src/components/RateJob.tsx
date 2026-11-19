import * as Haptics from "expo-haptics";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Job } from "@/lib/types";
import { useAuth } from "~/context/auth";
import { api } from "~/lib/api";
import { db } from "~/lib/firebase";
import { isObjectionable, OBJECTIONABLE_NOTE } from "@/lib/moderation";
import { Button, Card, Icon, Notice } from "./ui";
import { colors, radius, space, type } from "~/lib/theme";

const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

/**
 * Lets the customer rate a finished job, once, through the same /api/jobs/review route as the website,
 * so it shows on the shoveler's public profile and updates their rating, with a note in the chat.
 */
export function RateJob({ job, name }: { job: Job; name: string }) {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [done, setDone] = useState<number | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    getDocs(query(collection(db, "reviews"), where("reviewerId", "==", uid), where("jobId", "==", job.id)))
      .then((snap) => setDone(snap.empty ? null : Number(snap.docs[0].data().rating) || 0))
      .catch(() => setDone(null));
  }, [uid, job.id]);

  if (done === undefined) return null;
  if (done !== null)
    return (
      <Card style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Icon name="star.fill" size={18} color="#f5b301" />
        <Text style={[type.callout, { flex: 1 }]}>You rated this job {done} out of 5. Thanks!</Text>
      </Card>
    );

  const submit = async () => {
    setError("");
    if (!rating) return setError("Tap a star to rate the job.");
    if (rating < 3 && !comment.trim()) return setError("Tell us what went wrong so we can follow up.");
    if (isObjectionable(comment)) return setError(OBJECTIONABLE_NOTE);
    setBusy(true);
    try {
      // The server saves the review, updates the shoveler's average rating and posts a note in the chat.
      await api("/api/jobs/review", { jobId: job.id, rating, comment: comment.trim() });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(rating);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Your rating wasn’t sent. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Text style={type.headline}>Rate {name}</Text>
        <Text style={type.caption}>Your rating shows on their profile and helps neighbours choose.</Text>
      </View>
      <View accessibilityRole="adjustable" accessibilityLabel={`Rating, ${rating || "none"} out of 5`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
            accessibilityState={{ selected: rating === n }}
            hitSlop={4}
            onPress={() => {
              setRating(n);
              void Haptics.selectionAsync();
            }}
          >
            <Icon name={n <= rating ? "star.fill" : "star"} size={32} color={n <= rating ? "#f5b301" : colors.faint} />
          </Pressable>
        ))}
        {rating ? <Text style={[type.callout, { marginLeft: 6, fontWeight: "600" }]}>{LABELS[rating]}</Text> : null}
      </View>
      <TextInput
        value={comment}
        onChangeText={(text) => {
          setComment(text);
          setError("");
        }}
        placeholder={rating && rating < 3 ? "What went wrong?" : "Add a comment (optional)"}
        placeholderTextColor={colors.faint}
        multiline
        maxLength={500}
        accessibilityLabel="Review comment"
        style={{ minHeight: 72, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, fontSize: 16, color: colors.ink, backgroundColor: colors.bg, textAlignVertical: "top" }}
      />
      <Notice text={error} />
      <Button title="Send rating" icon="star.fill" loading={busy} disabled={!rating} onPress={() => void submit()} />
    </Card>
  );
}
