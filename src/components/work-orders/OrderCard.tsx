"use client";
import Link from "next/link";
import { Job } from "@/lib/types";
import { orderLabel, orderNumber, scheduleText } from "@/lib/workOrders";
import OrderActions from "./OrderActions";
export default function OrderCard({
  job,
  name,
  detail = false,
  conflict = false,
  onUpdated,
}: {
  job: Job;
  name: string;
  detail?: boolean;
  conflict?: boolean;
  onUpdated?: (message: string) => void;
}) {
  return (
    <article className="surface-card rounded-3xl border border-[var(--border-color)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            Order #{orderNumber(job)}
          </p>
          <h2 className="mt-1 break-words text-xl font-bold">{name}</h2>
        </div>
        <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold">
          {orderLabel(job)}
        </span>
      </div>
      <p className="mt-3 font-medium">
        {job.status === "pending" ? "Requested: " : ""}
        {scheduleText(job)}
      </p>
      <p className="mt-2 break-words text-[var(--text-secondary)]">
        {job.address}
      </p>
      <p className="mt-1 capitalize">
        {job.serviceTypes?.map((s) => s.replaceAll("-", " ")).join(" · ") ||
          "Snow removal"}
      </p>
      <p className="mt-2 text-sm">
        ${Number(job.price || 0).toFixed(2)} CAD ·{" "}
        {job.paymentMethod === "cash" ? "Cash" : "Card"} ·{" "}
        {job.paymentStatus === "held"
          ? "Authorized"
          : job.paymentStatus === "paid"
            ? "Paid"
            : job.paymentStatus === "refunded"
              ? "Refunded / released"
              : "Payment pending"}
      </p>
      {conflict && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
        >
          This requested time overlaps a confirmed work order. Propose a
          different time before accepting.
        </p>
      )}
      <OrderActions job={job} onUpdated={onUpdated} />
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border-color)] pt-3 text-sm font-semibold">
        {!detail && (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={`/dashboard/jobs/${job.id}`}
          >
            View work order
          </Link>
        )}
        {job.chatId && (
          <Link
            className="inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-4 py-3 text-white hover:bg-blue-800"
            href={`/dashboard/messages/${job.chatId}`}
          >
            Open messages →
          </Link>
        )}
        {job.previousOrderId && (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={`/dashboard/jobs/${job.previousOrderId}`}
          >
            Previous order
          </Link>
        )}
      </div>
    </article>
  );
}
