/** Only acknowledge the destination currently being viewed, never another order's messages. */
export function notificationWasViewed(item: { read?: boolean; type?: string; chatId?: string; jobId?: string }, pathname: string) {
  if (item.read) return false;
  return Boolean(
    (item.chatId && pathname === `/dashboard/messages/${item.chatId}`) ||
    (item.type !== "message" && item.jobId && pathname === `/dashboard/jobs/${item.jobId}`)
  );
}
