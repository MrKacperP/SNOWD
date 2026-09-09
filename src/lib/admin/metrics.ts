export function dailySeries(rows: Array<{ date: string; value: number }>, days: number, now = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now); day.setUTCHours(0, 0, 0, 0); day.setUTCDate(day.getUTCDate() - days + 1 + i);
    const date = day.toISOString().slice(0, 10);
    return { date, value: rows.filter(r => r.date.slice(0, 10) === date).reduce((sum, r) => sum + r.value, 0) };
  });
}
export function notificationHref(data: Record<string, unknown>): string {
  const meta = (data.meta || {}) as Record<string, unknown>;
  const path = String(meta.path || '');
  if ((path === '/admin/support-chats' || path === '/admin/chats') && (data.chatId || meta.chatId)) return `${path}?id=${encodeURIComponent(String(data.chatId || meta.chatId))}`;
  if (path === '/admin' || path.startsWith('/admin/')) return path;
  const type = String(data.type || '');
  if (type === 'document_uploaded' || type.includes('account_') || type === 'verification') return data.uid ? `/admin/users/${encodeURIComponent(String(data.uid))}` : '/admin/verifications';
  if (type.includes('job')) { const id = meta.jobId || data.jobId; return id ? `/admin/jobs?id=${encodeURIComponent(String(id))}` : '/admin/jobs'; }
  if (type === 'support') { const id = data.chatId || meta.chatId || (data.uid ? `support_${data.uid}` : ''); return id ? `/admin/support-chats?id=${encodeURIComponent(String(id))}` : '/admin/support-chats'; }
  if (type === 'payment' || type === 'transaction') return '/admin/transactions';
  if (type === 'claim') return '/admin/claims';
  if (data.uid) return `/admin/users/${encodeURIComponent(String(data.uid))}`;
  return '/admin/activity';
}
