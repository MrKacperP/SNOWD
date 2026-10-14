import { Job } from "@/lib/types";
import { jobDisplayPrice } from "@/lib/marketplacePricing";
import { Banknote, CreditCard } from "lucide-react";

export default function PaymentSummary({ job, operator = false }: { job: Job; operator?: boolean }) {
  const status = job.paymentStatus === "paid" ? "Paid" : job.paymentStatus === "held" ? "Authorized" : job.paymentStatus === "refunded" ? "Refunded" : "Pending";
  return <div className="payment-summary"><span>{job.paymentMethod === "cash" ? <Banknote size={15} /> : <CreditCard size={15} />}{job.paymentMethod === "cash" ? "Cash" : "Card"} · {status}</span><strong>${jobDisplayPrice(job, operator).toFixed(2)} <small>CAD</small></strong><small>{operator ? "Your earnings" : "Total"}</small></div>;
}
