"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Entry = { id: string; senderId: string; senderName: string; content: string; createdAt: number; read: boolean; type?: string; metadata?: { imageUrl?: string; audioUrl?: string; completionPhotoUrl?: string; newStatus?: string } };
export function Conversation({ id, support = false }: { id: string; support?: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const source = support ? collection(db, 'supportChats', id, 'messages') : query(collection(db, 'messages'), where('chatId', '==', id));
    return onSnapshot(source, snapshot => {
      const messages = snapshot.docs.map(d => { const data = d.data(); return { ...data, id: d.id, createdAt: data.createdAt?.toMillis?.() || 0 } as Entry; }).sort((a, b) => a.createdAt - b.createdAt);
      setEntries(messages); setLoading(false);
      if (support) {
        const unread = snapshot.docs.filter(d => d.data().senderId !== 'SNOWD_ADMIN' && !d.data().read);
        void (async () => { for (let i = 0; i < unread.length; i += 400) { const batch = writeBatch(db); unread.slice(i, i + 400).forEach(d => batch.update(d.ref, { read: true })); await batch.commit(); } })().catch(() => setError('Messages loaded, but unread status could not be saved.'));
      }
    }, () => { setError('Conversation could not load. Check your access and try again.'); setLoading(false); });
  }, [id, support]);
  return <div className="space-y-3 py-4" aria-live="polite">
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading && <p>Loading conversation…</p>}
    {!loading && !entries.length && !error && <p>No messages in this conversation yet.</p>}
    {entries.map(entry => {
      const isUpdate = entry.type === 'status-update' || entry.type === 'payment' || entry.senderId === 'system';
      const isCancellation = entry.metadata?.newStatus === 'cancelled' || /cancel/i.test(entry.content || '');
      return <article key={entry.id} className={`rounded-2xl p-3 border ${isCancellation ? 'border-red-200 bg-red-50' : isUpdate ? 'border-amber-200 bg-amber-50' : entry.senderId === 'SNOWD_ADMIN' ? 'bg-[var(--sky)] ml-6' : 'bg-[var(--ice)] mr-6'}`}>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--text-muted)]"><span className="font-semibold">{isCancellation ? <span className="mr-2 rounded-full bg-red-100 px-2 py-0.5 text-red-700">Cancellation</span> : isUpdate ? <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Work order update</span> : null}{['SNOWD_ADMIN', 'system'].includes(entry.senderId) ? 'Admin · ' : 'User · '}{['SNOWD_ADMIN', 'system'].includes(entry.senderId) ? <span>{entry.senderName || 'System'}</span> : <Link href={`/admin/users/${entry.senderId}`}>{entry.senderName || entry.senderId}</Link>}</span><time>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Time unavailable'}</time></div>
      <p className="whitespace-pre-wrap break-words mt-2 text-sm">{entry.content}</p>
      {(entry.metadata?.imageUrl || entry.metadata?.completionPhotoUrl) && <a className="inline-block mt-2 underline" href={entry.metadata.imageUrl || entry.metadata.completionPhotoUrl} target="_blank" rel="noopener noreferrer">Reopen photo upload ↗</a>}
      {entry.metadata?.audioUrl && <audio className="mt-2 max-w-full" controls src={entry.metadata.audioUrl} preload="none" />}
    </article>;})}
  </div>;
}
