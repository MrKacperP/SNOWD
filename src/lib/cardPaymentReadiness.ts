import { getStripe } from "@/lib/stripe";
import { stripeAccountState } from "@/lib/stripeAccountState";

// A saved badge can be stale after Stripe restricts or disconnects an account.
export async function verifyCardPaymentReadiness(operatorId: string, accountId?: string) {
  if (!accountId) return false;
  const account = await getStripe().accounts.retrieve(accountId);
  return account.metadata?.operatorId === operatorId && stripeAccountState(account).fullyReady;
}
