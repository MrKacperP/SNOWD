"use client";
import { useState } from 'react';
import Link from 'next/link';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AdminCard } from '@/components/admin/AdminUI';
export default function SettingsPage() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function save() {
    if (password !== confirm) { setNotice('New passwords do not match.'); return; }
    setBusy(true); setNotice('');
    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('Sign in again.');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, password);
      setCurrent(''); setPassword(''); setConfirm(''); setNotice('Password updated.');
    } catch { setNotice('Password could not be updated. Check your current password and sign-in method.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4"><AdminCard className="p-5"><h2 className="text-xl">Your security</h2><p className="text-sm text-[var(--text-muted)] mt-2">Update the password for your administrator account.</p><form className="space-y-4 mt-4 max-w-lg" onSubmit={e => { e.preventDefault(); void save(); }}>{[{ label: 'Current password', value: current, set: setCurrent, auto: 'current-password' }, { label: 'New password', value: password, set: setPassword, auto: 'new-password' }, { label: 'Confirm new password', value: confirm, set: setConfirm, auto: 'new-password' }].map(field => <label className="block text-sm" key={field.label}>{field.label}<input type="password" required minLength={field.auto === 'new-password' ? 8 : 1} autoComplete={field.auto} value={field.value} onChange={e => field.set(e.target.value)} className="w-full border p-3 mt-1 rounded-xl" /></label>)}<button disabled={busy} className="admin-primary">{busy ? 'Updating…' : 'Update password'}</button>{notice && <p role="status">{notice}</p>}</form></AdminCard><AdminCard className="p-5 space-y-3"><h2 className="text-xl">Workspace management</h2><div className="flex flex-wrap gap-3"><Link className="admin-secondary" href="/admin/employees">Manage staff access</Link><Link className="admin-secondary" href="/admin/activity">Review audit history</Link><Link className="admin-secondary" href="/admin/notifications">Notification inbox</Link><Link className="admin-secondary" href="/dashboard/settings">Your profile settings</Link></div></AdminCard></div>;
}
