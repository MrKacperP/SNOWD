import type Stripe from "stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";

export function stripeAccountState(account: Stripe.Account) {
  const fullyReady = !!(account.charges_enabled && account.payouts_enabled && account.details_submitted && !account.requirements?.currently_due?.length);
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    disabledReason: account.requirements?.disabled_reason || null,
    fullyReady,
    stripeAccountStatus: fullyReady ? "connected" : account.requirements?.disabled_reason ? "disabled" : "pending",
  };
}

export async function syncStripeAccount(account: Stripe.Account) {
  const uid = account.metadata?.operatorId;
  if (!uid) throw new Error("Stripe account is missing its operator reference.");
  const db = getAdminDb();
  const ref = db.doc(`users/${uid}`);
  const state = stripeAccountState(account);
  await db.runTransaction(async (transaction) => {
    const profile = await transaction.get(ref);
    if (!profile.exists || profile.data()?.role !== "operator") throw new Error("Operator profile not found.");
    // Ignore events for accounts that have since been replaced.
    if (profile.data()?.stripeConnectAccountId !== account.id) return;
    if (profile.data()?.stripeAccountStatus !== state.stripeAccountStatus || profile.data()?.stripeReady !== state.fullyReady) {
      transaction.update(ref, { stripeAccountStatus: state.stripeAccountStatus, stripeReady: state.fullyReady });
    }
  });
  return state;
}
