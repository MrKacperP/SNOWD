import { validatePolicy, type MarketplacePolicy } from "./admin/pricing";
/** All calculations use cents. Existing bookings retain their agreed price. */
export function quoteMarketplace(operatorPrice: number, method: string, policy?: MarketplacePolicy) {
  const operatorAmount = Math.round(operatorPrice * 100);
  if (!Number.isSafeInteger(operatorAmount) || operatorAmount <= 0) throw new Error("Invalid service price");
  if (policy && method === "credit") {
    const terms = validatePolicy(policy);
    const grossFee = Math.round(operatorAmount / (1 - terms.commissionPercent / 100)) - operatorAmount + terms.transactionFeeCents;
    const platformFeeAmount = Math.round(grossFee * (1 - terms.discountPercent / 100));
    return { price: (operatorAmount + platformFeeAmount) / 100, operatorAmount, platformFeeAmount, pricingVersion: 3, pricingPolicy: terms };
  }
  const clientAmount = method === "credit" ? Math.round(operatorAmount / 0.7) : operatorAmount;
  return { price: clientAmount / 100, operatorAmount, platformFeeAmount: clientAmount - operatorAmount, pricingVersion: 2 };
}

type EditablePricing = {
  driveway?: { small?: number; medium?: number; large?: number };
  walkway?: number;
  sidewalk?: number;
  backyardPatio?: number;
  porch?: number;
};

export function calculateServicePrice(
  pricing: EditablePricing | null | undefined,
  services: string[] | null | undefined,
  size: "small" | "medium" | "large",
) {
  const selected = services?.length ? services : ["driveway"];
  const total = selected.reduce((sum, service) => {
    if (service === "driveway") return sum + (pricing?.driveway?.[size] || 0);
    if (service === "walkway") return sum + (pricing?.walkway || 0);
    if (service === "sidewalk") return sum + (pricing?.sidewalk || 0);
    if (service === "backyard-patio") return sum + (pricing?.backyardPatio || 0);
    // Front porch and sidewalk share one operator price.
    if (service === "porch") return sum + (pricing?.sidewalk || pricing?.porch || 0);
    return sum;
  }, 0);
  return total || pricing?.driveway?.[size] || 40;
}

export function jobDisplayPrice(job: { price: number; paymentMethod?: string; operatorAmount?: number }, operator: boolean) {
  if (!operator || job.paymentMethod === "cash") return job.price;
  return (job.operatorAmount ?? (Math.round(job.price * 100) - Math.round(job.price * 100 * 0.15))) / 100;
}

export function transactionDisplayAmount(item: { amount: number; paymentMethod?: string; operatorAmount?: number }, operator: boolean) {
  return operator && item.paymentMethod === "credit"
    ? item.operatorAmount ?? item.amount - Math.round(item.amount * 0.15)
    : item.amount;
}
