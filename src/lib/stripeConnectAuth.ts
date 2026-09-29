import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { isUnavailableStripeAccount, markStripeAccountUnavailable } from "@/lib/stripeAccountState";

export async function requireStripeUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Sign in to manage payments.");
  return getAdminAuth().verifyIdToken(token, true);
}

export async function requireStripeOperator(req: NextRequest, accountId?: string) {
  const user = await requireStripeUser(req);
  const snapshot = await getAdminDb().doc(`users/${user.uid}`).get();
  const profile = snapshot.data();
  if (profile?.role !== "operator") throw new Error("An operator account is required.");
  if (accountId) {
    if (profile.stripeConnectAccountId !== accountId) throw new Error("This Stripe account does not belong to you.");
    const account = await getStripe().accounts.retrieve(accountId).catch(async (error: unknown) => {
      if (isUnavailableStripeAccount(error)) {
        await markStripeAccountUnavailable(user.uid, accountId);
        throw new Error("Your previous Stripe account is unavailable in this payment environment. Select Connect or Continue setup to connect a live payout account.");
      }
      throw error;
    });
    if (account.metadata?.operatorId !== user.uid) throw new Error("This Stripe account does not belong to you.");
  }
  return { uid: user.uid, email: user.email, profile };
}

export async function requireJobPaymentAccess(req: NextRequest, paymentIntentId: string, action?: "capture" | "cancel") {
  if (typeof paymentIntentId !== "string" || !paymentIntentId.startsWith("pi_")) throw new Error("Invalid payment reference.");
  const user = await requireStripeUser(req);
  // Resolve the immutable payment account from server-owned job data, never
  // from the caller or from the operator's potentially reconnected account.
  const jobs = await getAdminDb().collection("jobs").where("stripePaymentIntentId", "==", paymentIntentId).limit(1).get();
  const job = jobs.docs[0]?.data();
  if (!job || ![job.clientId, job.operatorId].includes(user.uid)) {
    throw new Error("You cannot manage this job's payment.");
  }
  const stripeAccount = job.stripePaymentAccountId || undefined;
  const payment = await getStripe().paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount });
  if (payment.metadata.jobId !== jobs.docs[0].id || payment.metadata.clientId !== job.clientId || payment.metadata.operatorId !== job.operatorId) {
    throw new Error("Payment does not match the saved job.");
  }
  if (action === "capture" && (job.status === "cancelled" || !job.completionPhotoUrl)) {
    throw new Error("Photo proof is required before payment can be released for an active job.");
  }
  if (action === "cancel" && (job.status === "completed" || payment.status === "succeeded")) {
    throw new Error("This payment has already been completed. Contact support for a refund.");
  }
  return { payment, stripeAccount };
}
