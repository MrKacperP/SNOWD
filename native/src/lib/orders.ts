import { initPaymentSheet, initStripe, presentPaymentSheet } from "@stripe/stripe-react-native";
import * as Location from "expo-location";
import type { Job } from "@/lib/types";
import { api, requestId } from "./api";

/** Runs a work-order action through the same server route the website uses. */
export function orderAction(job: Job, action: string, extra: Record<string, unknown> = {}) {
  return api<{ revision?: number }>("/api/jobs/action", { jobId: job.id, revision: job.revision || 0, requestId: requestId(), action, ...extra });
}

export async function sendOnMyWay(job: Job) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("Allow location access to send your arrival time.");
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return orderAction(job, "en-route", {
    operatorLat: position.coords.latitude,
    operatorLng: position.coords.longitude,
    operatorLocationAccuracy: position.coords.accuracy ?? 50,
  });
}

/** Saves proof first, then captures a card payment, the same order the website uses. */
export async function completeWithPhoto(job: Job, completionPhotoUrl: string) {
  const result = await orderAction(job, "photo", { completionPhotoUrl });
  if (job.paymentMethod !== "cash" && job.paymentStatus !== "paid") {
    await api("/api/stripe/capture-payment", { paymentIntentId: job.stripePaymentIntentId });
    await api("/api/jobs/action", { jobId: job.id, revision: result.revision, requestId: requestId(), action: "complete" });
  }
}

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const merchantIdentifier = process.env.EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID || "";

/**
 * Native Stripe checkout with Apple Pay (when a merchant ID is configured) and cards.
 * Returns false if the customer closed the sheet.
 */
export async function payForJob(job: Job, customerName?: string) {
  const data = await api<{ clientSecret: string; paymentIntentId: string; stripeAccount?: string | null }>("/api/stripe/create-payment-intent", { jobId: job.id });
  // Some operators take payments on their own connected account.
  await initStripe({ publishableKey, merchantIdentifier: merchantIdentifier || undefined, urlScheme: "snowd", ...(data.stripeAccount ? { stripeAccountId: data.stripeAccount } : {}) });
  try {
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: "SNOWD",
      paymentIntentClientSecret: data.clientSecret,
      returnURL: "snowd://stripe-redirect",
      defaultBillingDetails: customerName ? { name: customerName, address: { country: "CA" } } : undefined,
      ...(merchantIdentifier ? { applePay: { merchantCountryCode: "CA" } } : {}),
      googlePay: { merchantCountryCode: "CA", currencyCode: "CAD", testEnv: publishableKey.startsWith("pk_test") },
    });
    if (initError) throw new Error(initError.message);
    const { error } = await presentPaymentSheet();
    if (error) {
      if (error.code === "Canceled") return false;
      throw new Error(error.message);
    }
    await api("/api/stripe/payment-status", { paymentIntentId: data.paymentIntentId });
    return true;
  } finally {
    if (data.stripeAccount) await initStripe({ publishableKey, merchantIdentifier: merchantIdentifier || undefined, urlScheme: "snowd" });
  }
}
