import { Stack } from 'expo-router';
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Notice, Screen } from '~/components/ui';
import { useAuth } from '~/context/auth';
import { db } from '~/lib/firebase';
import { type, colors } from '~/lib/theme';

export default function Support() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<{ id: string; content: string; senderId: string }[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const attempt = useRef<{ text: string; id: string } | null>(null);
  const id = `support_${user?.uid}`;
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'supportChats', id, 'messages'), orderBy('createdAt', 'desc'), limit(100)), snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, content: String(d.data().content || ''), senderId: String(d.data().senderId || '') })).reverse());
    }, () => setError('Could not load support messages. Check your connection.'));
  }, [id, user]);
  const send = async () => {
    if (!user || !text.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const ref = doc(db, 'supportChats', id), batch = writeBatch(db);
      if (attempt.current?.text !== text) attempt.current = { text, id: doc(collection(ref, 'messages')).id };
      batch.set(ref, { userId: user.uid, userName: profile?.displayName || 'Customer', status: 'open', lastMessage: text.trim(), lastMessageTime: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      batch.set(doc(ref, 'messages', attempt.current.id), { senderId: user.uid, senderName: profile?.displayName || 'Customer', content: text.trim(), createdAt: serverTimestamp(), read: false });
      await batch.commit(); setText(''); attempt.current = null;
    } catch { setError('Message not sent. Your draft is saved here; try again.'); }
    finally { setBusy(false); }
  };
  return <Screen><Stack.Screen options={{ title: 'SNOWD Support' }} /><Notice text={error} />
    {!messages.length ? <Text style={type.callout}>Tell us what you need help with. Include your order number if this is about a booking.</Text> : messages.map(message => <View key={message.id} style={{ gap: 8, paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: 1 }}><Text style={type.headline}>{message.senderId === 'SNOWD_ADMIN' ? 'SNOWD Support' : 'You'}</Text><Text selectable style={type.body}>{message.content}</Text></View>)}
    <Field label="Message support" value={text} onChangeText={setText} multiline maxLength={4000} editable={!busy} />
    <Button title="Send message" loading={busy} disabled={!text.trim()} onPress={() => void send()} />
  </Screen>;
}
