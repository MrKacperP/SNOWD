import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { DEFAULT_POLICY } from '@/lib/admin/pricing';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { const data = (await getAdminDb().doc('settings/marketplacePricing').get()).data(); return NextResponse.json({ policy: data ? { commissionPercent: data.commissionPercent, transactionFeeCents: data.transactionFeeCents, discountPercent: data.discountPercent } : DEFAULT_POLICY }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Pricing is unavailable. Please retry.' }, { status: 503 }); }
}
