import { Job } from "@/lib/types";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";

// Save proof before capturing payment, so a payment failure is recoverable.
export async function completeWithPhoto(job: Job, completionPhotoUrl: string) {
  async function post(path: string, body: Record<string, unknown>) {
    const response = await stripeConnectFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not complete work. Please retry from the work order.");
    return result;
  }
  const result = await post("/api/jobs/action", { jobId: job.id, revision: job.revision || 0, requestId: crypto.randomUUID(), action: "photo", completionPhotoUrl });
  if (job.paymentMethod !== "cash" && job.paymentStatus !== "paid") {
    await post("/api/stripe/capture-payment", { paymentIntentId: job.stripePaymentIntentId });
    await post("/api/jobs/action", { jobId: job.id, revision: result.revision, requestId: crypto.randomUUID(), action: "complete" });
  }
}
