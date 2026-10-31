/**
 * Merges per-order chats into one chat per client/operator pair (`pair-{uidA}_{uidB}`).
 * Dry run by default. Run with --apply during the cutover. Safe to re-run.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { pairChatId } from "../src/lib/workOrderServer";
import { FieldValue, Timestamp, WriteBatch } from "firebase-admin/firestore";

const TERMINAL = ["completed", "cancelled"];
const millis = (value: unknown) =>
  value instanceof Timestamp ? value.toMillis() : 0;

async function main() {
  const apply = process.argv.includes("--apply");
  const db = getAdminDb();
  const [jobs, chats] = await Promise.all([
    db.collection("jobs").get(),
    db.collection("chats").get(),
  ]);

  type Pair = { target: string; participants: [string, string]; jobs: typeof jobs.docs; sources: typeof chats.docs };
  const pairs = new Map<string, Pair>();
  const pairFor = (a: string, b: string) => {
    const target = pairChatId(a, b);
    if (!pairs.has(target))
      pairs.set(target, { target, participants: [a, b], jobs: [], sources: [] });
    return pairs.get(target)!;
  };
  for (const job of jobs.docs) {
    const { clientId, operatorId } = job.data();
    if (clientId && operatorId) pairFor(clientId, operatorId).jobs.push(job);
  }
  for (const chat of chats.docs) {
    const data = chat.data();
    if (chat.id.startsWith("pair-") || data.mergedInto) continue;
    const people = [...new Set<string>(data.participants || [])];
    if (people.length !== 2) continue;
    const job = jobs.docs.find((j) => j.id === data.jobId)?.data();
    // Keep the client/operator order from the job when we know it.
    const [a, b] = job && people.includes(job.clientId) && people.includes(job.operatorId)
      ? [job.clientId, job.operatorId]
      : people;
    pairFor(a, b).sources.push(chat);
  }

  const plan = [...pairs.values()].filter((p) => {
    const existing = chats.docs.find((c) => c.id === p.target);
    return p.sources.length > 0 || !existing || p.jobs.some((j) => j.data().chatId !== p.target);
  });
  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    pairs: plan.map((p) => ({
      target: p.target,
      mergeChats: p.sources.map((c) => c.id),
      jobs: p.jobs.map((j) => j.id),
    })),
  }, null, 2));
  if (!apply) return;

  for (const pair of plan) {
    const ordered = [...pair.jobs].sort((x, y) => millis(x.data().createdAt) - millis(y.data().createdAt));
    const existing = (await db.doc(`chats/${pair.target}`).get()).data();
    const latestSource = [...pair.sources].sort(
      (x, y) => millis(y.data().lastMessageTime) - millis(x.data().lastMessageTime),
    )[0]?.data();
    const unread: Record<string, number> = { [pair.participants[0]]: 0, [pair.participants[1]]: 0 };
    for (const source of [existing, ...pair.sources.map((c) => c.data())])
      for (const [uid, count] of Object.entries(source?.unreadCount || {}))
        if (uid in unread) unread[uid] += Number(count) || 0;
    const useSourcePreview = latestSource && millis(latestSource.lastMessageTime) > millis(existing?.lastMessageTime);

    await db.doc(`chats/${pair.target}`).set({
      participants: existing?.participants || pair.participants,
      jobId: ordered.at(-1)?.id || existing?.jobId || "",
      jobIds: ordered.map((j) => j.id),
      openJobIds: ordered.filter((j) => !TERMINAL.includes(j.data().status)).map((j) => j.id),
      unreadCount: unread,
      ...(useSourcePreview
        ? {
            lastMessage: latestSource.lastMessage || "",
            lastMessageTime: latestSource.lastMessageTime,
            lastActivityTime: latestSource.lastActivityTime || latestSource.lastMessageTime,
          }
        : {}),
      ...(pair.sources.length ? { mergedFrom: FieldValue.arrayUnion(...pair.sources.map((c) => c.id)) } : {}),
      createdAt: existing?.createdAt || FieldValue.serverTimestamp(),
    }, { merge: true });

    let batch: WriteBatch = db.batch(), pending = 0;
    const queue = async (fn: (b: WriteBatch) => void) => {
      fn(batch);
      if (++pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
    };
    for (const source of pair.sources) {
      const data = source.data();
      const messages = await db.collection("messages").where("chatId", "==", source.id).get();
      for (const message of messages.docs)
        await queue((b) => b.update(message.ref, {
          chatId: pair.target,
          originalChatId: source.id,
          // A per-order chat's untagged messages belong to its order; old shared chats stay untagged.
          ...(!message.data().jobId && data.jobId && !data.legacyHistory ? { jobId: data.jobId } : {}),
        }));
      await queue((b) => b.update(source.ref, { mergedInto: pair.target, legacyHistory: true }));
    }
    for (const job of pair.jobs)
      if (job.data().chatId !== pair.target)
        await queue((b) => b.update(job.ref, { chatId: pair.target }));
    if (pending) await batch.commit();
    console.log(`Merged ${pair.sources.length} chat(s) into ${pair.target}`);
  }
  console.log("Pair chat merge complete.");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
