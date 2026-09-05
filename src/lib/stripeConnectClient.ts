import { getAuth } from "firebase/auth";

export async function stripeConnectFetch(url: string, init: RequestInit = {}) {
  const token = await getAuth().currentUser?.getIdToken();
  return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token || ""}` } });
}

export async function isStripeAccountReady(accountId?: string): Promise<boolean> {
  if (!accountId) return false;
  const response = await stripeConnectFetch("/api/stripe/account-status", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }),
  });
  const data = await response.json();
  return response.ok && data.fullyReady === true;
}
