import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdministrator } from '@/lib/admin/server';
import { syncAdminRefund } from '@/lib/admin/refunds';
import { getStripe } from '@/lib/stripe';
import { OrderError, orderFailure, validId } from '@/lib/workOrderServer';

export async function POST(request: NextRequest) {
  try {
    const { uid, db } = await requireAdministrator(request);
    const { jobId } = await request.json();
    if (!validId(jobId)) throw new OrderError('Invalid job.', 400);
    const job = (await db.doc(`jobs/${jobId}`).get()).data();
    if (!job?.stripePaymentIntentId) throw new OrderError('No card payment for this job.', 409);
    const stripe = getStripe(), stripeAccount = job.stripePaymentAccountId || undefined;
    const payment = await stripe.paymentIntents.retrieve(job.stripePaymentIntentId, { expand: ['latest_charge'] }, { stripeAccount });
    if (payment.metadata.jobId !== jobId || payment.metadata.clientId !== job.clientId || payment.metadata.operatorId !== job.operatorId || payment.currency !== 'cad' || payment.amount !== Math.round(job.price * 100)) throw new OrderError('Payment does not match this order.', 409);
    if (payment.status !== 'succeeded') throw new OrderError('Only captured card payments can be refunded.', 409);
    const charge = payment.latest_charge;
    if (!charge || typeof charge === 'string') throw new OrderError('Payment charge unavailable.', 409);
    if (!charge.refunded) {
      // Log intent before contacting Stripe. A retry uses the same Stripe idempotency key.
      await db.doc(`adminActivity/refund-${payment.id}`).set({ actorUid: uid, type: 'Transaction', targetId: jobId, description: 'Requested full card refund', createdAt: FieldValue.serverTimestamp() }, { merge: true });
      const refund = await stripe.refunds.create({ payment_intent: payment.id, ...(payment.application_fee_amount ? { refund_application_fee: true } : {}), ...(!stripeAccount && payment.transfer_data ? { reverse_transfer: true } : {}), metadata: { actorUid: uid, jobId } }, { stripeAccount, idempotencyKey: `admin-full-refund-${payment.id}` });
      if (refund.status !== 'succeeded') return NextResponse.json({ success: true, warning: `Refund ${refund.status || 'pending'}. Stripe will confirm the outcome.` });
    }
    await syncAdminRefund(payment.id, stripeAccount);
    return NextResponse.json({ success: true, message: 'Card payment refunded.' });
  } catch (error) { return orderFailure(error); }
}
