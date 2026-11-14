import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Loading, Notice, Screen } from '~/components/ui';
import { useAuth } from '~/context/auth';
import { api } from '~/lib/api';
import { type } from '~/lib/theme';

export default function AdminLayout() {
  const { user, profile } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const owner = user?.email?.toLowerCase() === 'kacperprymicz@gmail.com';
  const activate = useCallback(async () => {
    setBusy(true); setError('');
    try { await api('/api/admin/session', {}); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not activate administrator access.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { if (owner && profile?.role !== 'admin') void activate(); }, [owner, profile?.role, activate]);
  if (profile?.role !== 'admin' || profile.disabled) return <Screen><Text style={type.title}>Administrator access</Text><Notice text={error || (busy ? 'Checking your verified account…' : 'An active administrator account is required.')} />{owner ? <Button title="Check access" loading={busy} onPress={() => void activate()} /> : null}</Screen>;
  if (busy) return <Loading />;
  return <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}><Stack.Screen name="index" options={{ title: 'SNOWD Admin' }} /><Stack.Screen name="section" options={{ title: 'Manage' }} /></Stack>;
}
