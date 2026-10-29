import type { Job, Transaction } from "@/lib/types";
import { transactionDisplayAmount } from "@/lib/marketplacePricing";
import { dateMillis } from "@/lib/workOrders";

export function activitySummary(jobs: Job[], transactions: Transaction[], since: number, until: number) {
  const inPeriod = (value: unknown) => {
    const time = dateMillis(value);
    return time > 0 && time >= since && time <= until;
  };
  const requests = jobs.filter(job => inPeriod(job.createdAt));
  const completed = jobs.filter(job => job.status === "completed" && inPeriod(job.completionTime));
  const paid = transactions.filter(item => item.status === "paid" && inPeriod(item.completedAt || item.createdAt));
  return {
    requests: requests.length,
    completed: completed.length,
    active: jobs.filter(job => ["accepted", "en-route", "in-progress"].includes(job.status)).length,
    paidCents: paid.reduce((sum, item) => sum + transactionDisplayAmount(item, true), 0),
    paidCount: paid.length,
  };
}
