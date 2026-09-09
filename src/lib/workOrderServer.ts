import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp, Transaction } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { Job } from "@/lib/types";

export class OrderError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export async function orderUser(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) throw new Error();
    return (await getAdminAuth().verifyIdToken(token, true)).uid;
  } catch {
    throw new OrderError("Please sign in again.", 401);
  }
}
export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,150}$/.test(value);
}
export function parseSchedule(body: Record<string, unknown>) {
  const mode = body.scheduleMode;
  if (mode !== "asap" && mode !== "scheduled")
    throw new OrderError("Choose ASAP or a scheduled time.", 400);
  const timezone =
    typeof body.scheduleTimezone === "string"
      ? body.scheduleTimezone
      : "America/Toronto";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw new OrderError("Choose a valid timezone.", 400);
  }
  const millis =
    typeof body.scheduledDate === "string"
      ? Date.parse(body.scheduledDate)
      : NaN;
  if (
    mode === "scheduled" &&
    (!Number.isFinite(millis) ||
      millis <= Date.now() ||
      millis > Date.now() + 30 * 86400000)
  )
    throw new OrderError("Choose a future appointment within 30 days.", 400);
  return {
    scheduleMode: mode,
    scheduledDate: mode === "scheduled" ? Timestamp.fromMillis(millis) : null,
    scheduledTime:
      mode === "scheduled"
        ? new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
          }).format(millis)
        : "ASAP",
    scheduleTimezone: timezone,
  };
}
export function orderEvent(
  tx: Transaction,
  job: Job,
  uid: string,
  eventId: string,
  title: string,
) {
  const db = getAdminDb(),
    now = FieldValue.serverTimestamp();
  const recipient = uid === job.clientId ? job.operatorId : job.clientId;
  const message = `Order #${job.orderNumber || `L-${job.id}`} · ${title}`;
  tx.set(db.doc(`jobs/${job.id}/events/${eventId}`), {
    title,
    actorId: uid,
    createdAt: now,
  });
  tx.set(db.doc(`notifications/${job.id}-${eventId}`), {
    uid: recipient,
    jobId: job.id,
    chatId: job.chatId,
    type: "job",
    title: message,
    message,
    read: false,
    createdAt: now,
  });
  if (job.chatId) {
    tx.set(db.doc(`messages/${job.id}-${eventId}`), {
      chatId: job.chatId,
      jobId: job.id,
      senderId: uid,
      senderName: "Work order update",
      type: "system",
      content: message,
      createdAt: now,
      read: false,
    });
    tx.update(db.doc(`chats/${job.chatId}`), {
      lastMessage: message,
      lastMessageTime: now,
      [`unreadCount.${recipient}`]: FieldValue.increment(1),
    });
  }
}
export function orderFailure(error: unknown) {
  if (error instanceof OrderError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error("Work order action failed", error);
  return NextResponse.json(
    { error: "Could not update this work order. Please retry." },
    { status: 500 },
  );
}
