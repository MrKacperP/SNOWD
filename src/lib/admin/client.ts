import { auth } from '@/lib/firebase';
export async function adminAccountRequest(uid: string, method: 'PATCH' | 'DELETE', body?: Record<string, unknown>) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in again to manage accounts.');
  const response = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not save account.');
}

export async function adminJobRequest(jobId: string, method: 'PATCH' | 'DELETE', body?: Record<string, unknown>) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in again to manage jobs.');
  const response = await fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not save job.');
}
