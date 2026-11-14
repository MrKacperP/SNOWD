export type MarketplacePolicy = { commissionPercent: number; transactionFeeCents: number; discountPercent: number };
export const DEFAULT_POLICY: MarketplacePolicy = { commissionPercent: 30, transactionFeeCents: 0, discountPercent: 0 };
export function validatePolicy(value: MarketplacePolicy) {
  if (!Number.isFinite(value.commissionPercent) || value.commissionPercent < 0 || value.commissionPercent > 50 ||
      !Number.isSafeInteger(value.transactionFeeCents) || value.transactionFeeCents < 0 || value.transactionFeeCents > 10000 ||
      !Number.isFinite(value.discountPercent) || value.discountPercent < 0 || value.discountPercent > 100)
    throw new Error('Commission must be 0–50%, transaction fee $0–100, and fee discount 0–100%.');
  return { commissionPercent: value.commissionPercent, transactionFeeCents: value.transactionFeeCents, discountPercent: value.discountPercent };
}
