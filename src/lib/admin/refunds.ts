import type Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getStripe } from '@/lib/stripe';

/** Reconcile from Stripe, including retries and refunds initiated in Stripe Dashboard. */
export async function syncAdminRefund(paymentIntentId: string, stripeAccount?: string) {
  const stripe = getStripe();
  const payment = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] }, { stripeAccount });
  if (payment.metadata.platform !== 'snowd.ca') return;
  const charge = payment.latest_charge as Stripe.Charge | null;
  if (!charge || typeof charge === 'string' || !charge.amount_refunded) return;
  const jobId = payment.metadata.jobId;
  if (!jobId || jobId.includes('/')) throw new Error('Invalid payment job.');
  const db = getAdminDb(), ref = db.doc(`jobs/${jobId}`);
  await db.runTransaction(async tx => {
    const job = (await tx.get(ref)).data();
    if (!job || job.stripePaymentIntentId !== payment.id || (job.stripePaymentAccountId || undefined) !== stripeAccount || job.clientId !== payment.metadata.clientId || job.operatorId !== payment.metadata.operatorId) throw new Error('Refund does not match the saved job.');
    const full = charge.amount_refunded === payment.amount;
    const changes = { refundedAmount: charge.amount_refunded, refundStatus: full ? 'refunded' : 'partially-refunded', updatedAt: FieldValue.serverTimestamp() };
    tx.update(ref, { ...changes, ...(full ? { paymentStatus: 'refunded' } : {}) });
    tx.set(db.doc(`transactions/${payment.id}`), { ...changes, ...(full ? { status: 'refunded' } : {}) }, { merge: true });
  });
}
