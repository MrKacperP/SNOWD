/** Dry run by default. Run with --apply during the coordinated work-order cutover. */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

async function main() {
  const apply = process.argv.includes("--apply");
  const db = getAdminDb();
  const [jobs, chats] = await Promise.all([
    db.collection("jobs").get(),
    db.collection("chats").get(),
  ]);
  const jobMap = new Map(jobs.docs.map((d) => [d.id, d.data()]));
  const groups = new Map<string, string[]>();
  for (const job of jobs.docs)
    if (job.data().chatId)
      groups.set(job.data().chatId, [
        ...(groups.get(job.data().chatId) || []),
        job.id,
      ]);
  const report: { chatId: string; jobIds: string[]; reason: string }[] = [];
  for (const chat of chats.docs) {
    const data = chat.data();
    const ids = [
      ...new Set([
        ...(groups.get(chat.id) || []),
        ...(data.legacyJobIds || []),
      ]),
    ].filter((id) => jobMap.has(id));
    if (
      ids.length > 1 ||
      (ids.length === 1 && data.jobId !== ids[0]) ||
      data.legacyHistory
    )
      report.push({
        chatId: chat.id,
        jobIds: ids,
        reason: data.legacyHistory
          ? "Resume / verify legacy migration"
          : "Shared or mismatched conversation",
      });
  }
  const missing = jobs.docs
    .filter(
      (d) =>
        !d.data().chatId || !chats.docs.some((c) => c.id === d.data().chatId),
    )
    .map((d) => d.id);
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        jobs: jobs.size,
        chats: chats.size,
        mixedConversations: report,
        ordersMissingChats: missing,
      },
      null,
      2,
    ),
  );
  if (!apply) return;
  for (const item of report) {
    const legacyRef = db.doc(`chats/${item.chatId}`);
    await legacyRef.update({ legacyHistory: true, legacyJobIds: item.jobIds });
    for (const id of item.jobIds) await repair(id, item.chatId);
  }
  for (const id of missing) await repair(id);
  console.log(
    "Migration complete. Historical messages, receipts and claims were not moved or relabelled.",
  );

  async function repair(id: string, legacyChatId?: string) {
    await db.runTransaction(async (tx) => {
      const jobRef = db.doc(`jobs/${id}`),
        job = (await tx.get(jobRef)).data();
      if (!job) return;
      const target = db.doc(`chats/order-${id}`),
        existing = await tx.get(target);
      if (existing.exists && existing.data()?.jobId !== id)
        throw new Error(`Chat collision for ${id}; no overwrite performed.`);
      if (job.chatId === target.id && existing.exists) return;
      const now = FieldValue.serverTimestamp();
      tx.set(target, {
        jobId: id,
        participants: [job.clientId, job.operatorId],
        unreadCount: { [job.clientId]: 0, [job.operatorId]: 0 },
        createdAt: now,
        lastMessage: "Dedicated conversation for this work order",
        lastMessageTime: now,
      });
      tx.update(jobRef, {
        chatId: target.id,
        ...(legacyChatId ? { legacyChatId } : {}),
        orderNumber: job.orderNumber || `L-${id}`,
        revision: (job.revision || 0) + 1,
      });
      tx.set(db.doc(`jobs/${id}/events/chat-migrated`), {
        title:
          "Dedicated order conversation created; earlier shared history preserved",
        createdAt: now,
        actorId: "system",
      });
    });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
