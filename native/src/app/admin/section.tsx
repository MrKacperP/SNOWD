import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Badge, Button, Card, Chip, Field, Loading, Notice, Screen } from '~/components/ui';
import { api, requestId } from '~/lib/api';
import { colors, type } from '~/lib/theme';
import { DEFAULT_POLICY, type MarketplacePolicy } from '@/lib/admin/pricing';

// Records are intentionally read from the authenticated admin API, never a client email allowlist.
type RecordData = { id: string; [key: string]: unknown };
const string = (v: unknown) => typeof v === 'string' ? v : '';
const amount = (v: unknown) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(v || 0));
const titles: Record<string, string> = { verifications: 'Verifications', jobs: 'Work orders', accounts: 'Accounts', support: 'Customer support', payments: 'Payments', pricing: 'Fees & discounts', activity: 'Admin activity' };
const label = (r: RecordData, section: string) => section === 'jobs' ? `Order #${r.orderNumber || r.id}` : section === 'payments' ? `${amount(Number(r.amount || 0) / 100)} · ${r.status || 'Pending'}` : string(r.displayName || r.userName || r.description || r.email) || r.id;

export default function AdminSection() {
  const { section = 'jobs', id } = useLocalSearchParams<{ section: string; id?: string }>();
  // Remount forms when switching records, so stale drafts never land on another account.
  return <Section key={`${section}:${id || ''}`} section={section} id={id} />;
}
function Section({ section, id }: { section: string; id?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<RecordData[]>([]);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [messages, setMessages] = useState<RecordData[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [policy, setPolicy] = useState<MarketplacePolicy>(DEFAULT_POLICY);
  const attempt = useRef<{ key: string; id: string } | null>(null);
  const field = (key: string, value: string) => setDraft(d => ({ ...d, [key]: value }));
  const load = useCallback(async (after?: string) => {
    setLoading(true); setError('');
    if (id === 'new') { setLoading(false); return; }
    try {
      const data = await api<{ items?: RecordData[]; item?: RecordData; messages?: RecordData[]; next?: string; policy?: MarketplacePolicy }>(`/api/admin/console?section=${section}${id ? `&id=${encodeURIComponent(id)}` : ''}${after ? `&after=${encodeURIComponent(after)}` : ''}`);
      if (data.item) {
        setRecord(data.item);
        setDraft(Object.fromEntries(['displayName', 'email', 'phone', 'bio', 'role', 'specialInstructions', 'operatorNotes'].map(k => [k, string(data.item![k])])));
      }
      setMessages(data.messages || []);
      setItems(old => after ? [...old, ...(data.items || [])] : data.items || []);
      setNext(data.next || null);
      if (data.policy) { setPolicy(data.policy); setDraft({ commissionPercent: String(data.policy.commissionPercent), transactionFee: (data.policy.transactionFeeCents / 100).toFixed(2), discountPercent: String(data.policy.discountPercent) }); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load records.'); }
    finally { setLoading(false); }
  }, [section, id]);
  useEffect(() => { void load(); }, [load]);
  const run = async (body: Record<string, unknown>, path = '/api/admin/console', method = 'POST') => {
    if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    const key = JSON.stringify({ path, method, body });
    if (attempt.current?.key !== key) attempt.current = { key, id: requestId() };
    try {
      const data = await api<{ message?: string; warning?: string; id?: string }>(path, { ...body, ...(path === '/api/admin/console' || path === '/api/jobs/action' ? { requestId: attempt.current.id } : {}) }, method);
      attempt.current = null;
      if (body.action === 'support-open' && data.id) { router.push(`/admin/section?section=support&id=${data.id}`); return; }
      if (method === 'DELETE' || body.action === 'create-account') { Alert.alert('Saved', data.message || 'Account deleted. Job and payment records retained.'); router.back(); return; }
      await load();
      setSuccess(data.warning || data.message || 'Saved.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Please retry.'); }
    finally { setBusy(false); }
  };
  const confirm = (title: string, message: string, action: () => void, destructive = false) => Alert.alert(title, message, [{ text: 'Keep unchanged', style: 'cancel' }, { text: title, style: destructive ? 'destructive' : 'default', onPress: action }]);
  const input = (key: string, title: string, multiline = false) => <Field key={key} label={title} value={draft[key] || ''} onChangeText={v => field(key, v)} multiline={multiline} autoCapitalize={key === 'email' ? 'none' : 'sentences'} keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'} editable={!busy} />;
  const open = (r: RecordData) => router.push(`/admin/section?section=${section}&id=${encodeURIComponent(r.id)}`);
  if (loading && !record && !items.length && section !== 'pricing') return <Loading message="Loading admin records…" />;
  return <Screen onRefresh={() => load()}>
    <Stack.Screen options={{ title: titles[section] || 'Manage' }} />
    <Notice text={error} /><Notice text={success} tone="green" />
    {error ? <Button title="Reload records" variant="secondary" onPress={() => void load()} /> : null}
    {section === 'pricing' ? <>
      <Text style={type.title}>Fees & discounts</Text>
      <Text style={type.callout}>Applies to new card bookings. Cash prices and existing orders stay unchanged. Discounts reduce SNOWD’s fee; the operator keeps their quoted amount.</Text>
      <Field label="Commission (%)" value={draft.commissionPercent || ''} keyboardType="decimal-pad" onChangeText={v => field('commissionPercent', v)} />
      <Field label="Transaction fee (CAD)" value={draft.transactionFee || ''} keyboardType="decimal-pad" onChangeText={v => field('transactionFee', v)} />
      <Field label="Discount on platform fees (%)" value={draft.discountPercent || ''} keyboardType="decimal-pad" onChangeText={v => field('discountPercent', v)} />
      <Button title="Save pricing" loading={busy} disabled={loading || !!error || Object.values(draft).some(v => !v.trim())} onPress={() => confirm('Save pricing', 'These fees will apply to future card bookings across SNOWD.', () => void run({ action: 'pricing', previous: { commissionPercent: policy.commissionPercent, transactionFeeCents: policy.transactionFeeCents, discountPercent: policy.discountPercent }, policy: { commissionPercent: Number(draft.commissionPercent), transactionFeeCents: Math.round(Number(draft.transactionFee) * 100), discountPercent: Number(draft.discountPercent) } }))} />
    </> : id === 'new' && section === 'accounts' ? <>
      <Text style={type.title}>Create account</Text>{input('displayName', 'Full name')}{input('email', 'Email')}
      <View style={{ flexDirection: 'row', gap: 8 }}>{['client', 'operator'].map(role => <Chip key={role} label={role === 'client' ? 'Customer' : 'Operator'} selected={(draft.role || 'client') === role} onPress={() => field('role', role)} />)}</View>
      <Text style={type.callout}>The user sets their own password using Forgot password, then completes onboarding. No email is sent from this form.</Text>
      <Button title="Create account" loading={busy} disabled={!draft.displayName?.trim() || !draft.email?.trim()} onPress={() => void run({ action: 'create-account', displayName: draft.displayName, email: draft.email, role: draft.role || 'client' })} />
    </> : record ? <>
      <Text style={type.title}>{label(record, section)}</Text>
      <Text selectable style={type.caption}>{record.id}</Text>
      <Badge label={string(record.status || record.verificationStatus || record.role) || 'Record'} />
      {(section === 'accounts' || section === 'verifications') ? <>
        <Text selectable style={type.callout}>{string(record.email)}</Text>
        {record.idPhotoUrl ? <Image source={{ uri: string(record.idPhotoUrl) }} contentFit="contain" style={{ width: '100%', height: 320, backgroundColor: colors.surface }} accessibilityLabel="Submitted identity document" /> : null}
        {section === 'verifications' ? <>
          {input('note', 'Reason for rejection', true)}
          <Button title="Approve verification" loading={busy} onPress={() => confirm('Approve verification', 'Confirm you reviewed the document and account details.', () => void run({ action: 'verification', id, decision: 'approved' }))} />
          <Button title="Reject verification" variant="danger" disabled={busy || !draft.note?.trim()} onPress={() => confirm('Reject verification', 'The account will receive your reason and can submit a new document.', () => void run({ action: 'verification', id, decision: 'rejected', note: draft.note }), true)} />
        </> : <>
          {input('displayName', 'Full name')}{input('email', 'Email')}{input('phone', 'Phone')}{input('bio', 'About', true)}
          <Button title="Save account details" loading={busy} onPress={() => void run({ displayName: draft.displayName, email: draft.email, phone: draft.phone, bio: draft.bio }, `/api/admin/users/${id}`, 'PATCH')} />
          <Button title="Message as support" variant="secondary" disabled={busy} onPress={() => void run({ action: 'support-open', id })} />
          <Button title={record.disabled ? 'Enable account' : 'Suspend account'} variant="secondary" disabled={busy} onPress={() => confirm(record.disabled ? 'Enable account' : 'Suspend account', 'This changes the user’s ability to sign in.', () => void run({ disabled: !record.disabled }, `/api/admin/users/${id}`, 'PATCH'))} />
          <Button title="Delete account" variant="danger" disabled={busy} onPress={() => confirm('Delete account', 'Permanently delete this login and profile. Job and payment history will be retained.', () => void run({}, `/api/admin/users/${id}`, 'DELETE'), true)} />
        </>}
      </> : null}
      {section === 'jobs' ? <>
        <Text selectable style={type.body}>{string(record.address)}{record.city ? `, ${record.city}` : ''}</Text>
        <Text style={type.callout}>{amount(record.price)} · {string(record.paymentMethod)} · {string(record.paymentStatus)}</Text>
        <Text selectable style={type.caption}>Customer: {string(record.clientId)}{ '\n' }Operator: {string(record.operatorId)}</Text>
        {input('specialInstructions', 'Service instructions', true)}{input('operatorNotes', 'Work order notes', true)}
        <Button title="Save work order" loading={busy} onPress={() => void run({ specialInstructions: draft.specialInstructions, operatorNotes: draft.operatorNotes }, `/api/admin/jobs/${id}`, 'PATCH')} />
        {record.status === 'pending' ? <Button title="Approve job" variant="secondary" disabled={busy} onPress={() => confirm('Approve job', 'Accept this request for the assigned operator. Scheduling and payment requirements will be checked.', () => void run({ jobId: id, action: 'accept', revision: record.revision || 0 }, '/api/jobs/action'))} /> : null}
        {!['completed', 'cancelled'].includes(string(record.status)) ? <Button title="Cancel job" variant="danger" disabled={busy} onPress={() => confirm('Cancel job', 'Stop this service and release any card hold. Captured payments require a separate refund.', () => void run({ jobId: id }, '/api/jobs/cancel'), true)} /> : null}
        {record.stripePaymentIntentId ? <>
          <Text style={type.headline}>Card payment</Text>
          {record.paymentStatus === 'held' ? <Button title="Capture payment" variant="secondary" disabled={busy} onPress={() => confirm('Capture payment', 'Charge the held amount. Completion photo proof is required.', () => void run({ paymentIntentId: record.stripePaymentIntentId }, '/api/stripe/capture-payment'))} /> : null}
          {record.paymentStatus === 'paid' ? <Button title="Refund card payment" variant="danger" disabled={busy} onPress={() => confirm('Refund payment', 'Refund the full card payment, including platform fees, and reverse the operator transfer.', () => void run({ jobId: id }, '/api/admin/refund'), true)} /> : null}
          {record.status === 'cancelled' && record.paymentStatus !== 'paid' && record.paymentStatus !== 'refunded' ? <Button title="Retry releasing card hold" variant="secondary" disabled={busy} onPress={() => void run({ jobId: id }, '/api/jobs/cancel')} /> : null}
        </> : null}
      </> : null}
      {section === 'support' ? <>
        <Text style={type.callout}>{string(record.subject)}</Text>
        <Text style={type.caption}>Latest 100 messages. Pull to refresh.</Text>
        {messages.length === 0 ? <Text style={type.callout}>No messages yet.</Text> : messages.map(m => <View key={m.id} style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 }}><Text style={type.headline}>{m.senderId === 'SNOWD_ADMIN' ? 'SNOWD Support' : string(m.senderName) || 'Customer'}</Text><Text selectable style={type.body}>{string(m.content)}</Text></View>)}
        {input('message', 'Reply as SNOWD Support', true)}
        <Button title="Send support reply" loading={busy} disabled={!draft.message?.trim()} onPress={() => void run({ action: 'support-reply', id, message: draft.message })} />
        <Button title={record.status === 'resolved' ? 'Reopen conversation' : 'Resolve conversation'} variant="secondary" disabled={busy} onPress={() => void run({ action: 'support-status', id, status: record.status === 'resolved' ? 'open' : 'resolved' })} />
      </> : null}
      {section === 'payments' ? <>
        <Text style={type.body}>Operator share: {amount(Number(record.operatorAmount || 0) / 100)}</Text>
        <Text selectable style={type.caption}>Payment: {string(record.stripePaymentIntentId) || 'Cash'}{ '\n' }{string(record.description)}</Text>
        {record.jobId ? <Button title="Manage order & payment" onPress={() => router.push(`/admin/section?section=jobs&id=${encodeURIComponent(string(record.jobId))}`)} /> : null}
      </> : null}
      {section === 'activity' ? <Text selectable style={type.callout}>Actor: {string(record.actorUid)}{ '\n' }Target: {string(record.targetId)}</Text> : null}
    </> : !id ? <>
      <Text style={type.title}>{titles[section]}</Text>
      {section === 'accounts' ? <Button title="Add account" onPress={() => router.push('/admin/section?section=accounts&id=new')} /> : null}
      <Field label="Filter loaded records" value={search} onChangeText={setSearch} />
      <Text style={type.caption}>{items.length} records loaded{next ? ' · more available' : ''}. Pull to refresh.</Text>
      {!loading && !error && !items.length ? <Text style={type.callout}>{section === 'verifications' ? 'No verifications waiting for review.' : 'No records yet.'}</Text> : null}
      {items.filter(r => [r.id, r.displayName, r.email, r.orderNumber, r.status, r.address, r.userName, r.description].some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))).map(r => <Card key={r.id} onPress={() => open(r)}><Text style={type.headline}>{label(r, section)}</Text><Text style={type.callout}>{string(r.email || r.address || r.lastMessage || r.targetId)}</Text><Text style={type.caption}>{string(r.status || r.verificationStatus || r.role)}</Text></Card>)}
      {next ? <Button title="Load more" variant="secondary" loading={loading} onPress={() => void load(next)} /> : null}
    </> : null}
  </Screen>;
}
