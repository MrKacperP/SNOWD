"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Job } from "@/lib/types";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";
import { scheduleText, orderNumber, orderActionNeeded } from "@/lib/workOrders";
import Modal from "@/components/ui/Modal";
import dynamic from "next/dynamic";
const StripeCheckout = dynamic(() => import("@/components/StripeCheckout"), {
  ssr: false,
});
import Link from "next/link";
import PhotoPicker from "./PhotoPicker";
import PhonePhotoTransfer from "./PhonePhotoTransfer";

export async function orderRequest(
  path: string,
  body: Record<string, unknown>,
) {
  const response = await stripeConnectFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The action could not be completed.");
  return data;
}
const button =
  "min-h-12 rounded-xl border border-[var(--border-color)] bg-blue-700 text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 px-4 py-3 text-sm font-semibold disabled:opacity-50";
const dangerButton = `${button} !border-red-700 !bg-red-700 !text-white hover:!bg-red-800`;
export default function OrderActions({
  job,
  onUpdated,
}: {
  job: Job;
  onUpdated?: (message: string) => void;
}) {
  const { user } = useAuth();
  const uid = user?.uid || "",
    operator = uid === job.operatorId,
    closed = ["completed", "cancelled"].includes(job.status);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<
    "complete-cash" | "" | "cancel" | "decline" | "time" | "photo" | "cash" | "refund" | "approve"
  >("");
  const [time, setTime] = useState(""),
    [asap, setAsap] = useState(false),
    [cash, setCash] = useState(false);
  const [secret, setSecret] = useState(""),
    [photo, setPhoto] = useState("");
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const pendingRequest = useRef<{ key: string; id: string } | null>(null);
  const perform = async (
    action: string,
    extra: Record<string, unknown> = {},
  ) => {
    const payload = {
      jobId: job.id,
      revision: job.revision || 0,
      action,
      ...extra,
    };
    const key = JSON.stringify(payload);
    if (pendingRequest.current?.key !== key)
      pendingRequest.current = { key, id: crypto.randomUUID() };
    return orderRequest("/api/jobs/action", {
      ...payload,
      requestId: pendingRequest.current.id,
    });
  };
  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      pendingRequest.current = null;
      setDialog("");
      onUpdated?.(
        `Order #${orderNumber(job)} updated.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const approve = (action: string) => {
    if (
      !operator &&
      job.paymentMethod === "cash" &&
      !job.cashPaymentAcknowledged
    ) {
      setDialog("approve");
      return;
    }
    void run(() => perform(action, { proposalId: job.scheduleProposal?.id }));
  };
  const pay = () =>
    run(async () => {
      const data = await orderRequest("/api/stripe/create-payment-intent", {
        jobId: job.id,
      });
      setSecret(data.clientSecret);
    });
  const complete = (cashReceived = false) =>
    run(async () => {
      if (job.paymentMethod !== "cash")
        await orderRequest("/api/stripe/capture-payment", {
          paymentIntentId: job.stripePaymentIntentId,
        });
      if (cashReceived) await orderRequest("/api/jobs/confirm-cash", { jobId: job.id });
      await perform("complete");
    });
  return (
    <div className="mt-4 space-y-3">
      {orderActionNeeded(job, uid) && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 font-bold text-blue-900">Action needed · {orderActionNeeded(job, uid)}</p>}
      {job.scheduleProposal && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
          <strong>
            {job.scheduleProposal.recipientId === uid
              ? "Your approval needed"
              : "Awaiting approval of new time"}
          </strong>
          <p>{scheduleText(job.scheduleProposal)}</p>
          {job.status === "accepted" && (
            <p>
              The current appointment stays booked until this change is
              approved.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!closed && job.scheduleProposal?.recipientId === uid && (
          <>
            <button
              className={button}
              disabled={busy}
              onClick={() => approve("approve-time")}
            >
              Approve time
            </button>
            <button
              className={dangerButton}
              disabled={busy}
              onClick={() =>
                run(() =>
                  perform("decline-time", {
                    proposalId: job.scheduleProposal?.id,
                  }),
                )
              }
            >
              Decline time
            </button>
          </>
        )}
        {job.status === "pending" &&
          !job.scheduleProposal &&
          (job.awaitingResponseFrom || job.operatorId) === uid && (
            <>
              <button
                className={button}
                disabled={busy}
                onClick={() => approve("accept")}
              >
                {operator ? "Accept" : "Approve booking"}
              </button>
              <button
                className={dangerButton}
                disabled={busy}
                onClick={() => setDialog("decline")}
              >
                Decline
              </button>
            </>
          )}
        {!job.scheduleProposal &&
          (job.status === "accepted" ||
            (job.status === "pending" &&
              (job.awaitingResponseFrom || job.operatorId) === uid)) && (
            <button
              className={button}
              disabled={busy}
              onClick={() => setDialog("time")}
            >
              Propose new time
            </button>
          )}
        {!operator &&
          job.status === "accepted" &&
          job.paymentMethod !== "cash" &&
          !["held", "paid"].includes(job.paymentStatus) && (
            <button
              className={button}
              disabled={busy}
              onClick={pay}
            >
              Pay by card · ${job.price.toFixed(2)}
            </button>
          )}
        {operator && !job.scheduleProposal && job.status === "accepted" && (
          <button
            className={button}
            disabled={
              busy ||
              (job.paymentMethod !== "cash" &&
                !["held", "paid"].includes(job.paymentStatus))
            }
            onClick={() => run(() => perform("en-route"))}
          >
            On my way
          </button>
        )}
        {operator &&
          !job.scheduleProposal &&
          ["accepted", "en-route"].includes(job.status) && (
            <button
              className={button}
              disabled={
                busy ||
                (job.paymentMethod !== "cash" &&
                  !["held", "paid"].includes(job.paymentStatus))
              }
              onClick={() => run(() => perform("in-progress"))}
            >
              Start work
            </button>
          )}
        {operator && job.status === "in-progress" && (
          <>
            <button
              className={button}
              disabled={busy}
              onClick={() => setDialog("photo")}
            >
              {job.completionPhotoUrl
                ? "Update photo proof"
                : "Add completion photo"}
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() =>
                job.completionPhotoUrl ? (job.paymentMethod === "cash" && job.paymentStatus === "pending" ? setDialog("complete-cash") : complete()) : setDialog("photo")
              }
            >
              Complete work
            </button>
          </>
        )}
        {operator &&
          job.paymentMethod === "cash" &&
          ["in-progress", "completed"].includes(job.status) &&
          job.paymentStatus === "pending" && (
            <button
              className={button}
              disabled={busy}
              onClick={() => setDialog("cash")}
            >
              Confirm cash received
            </button>
          )}
        {operator &&
          job.paymentMethod === "cash" &&
          job.paymentStatus === "paid" &&
          job.status !== "completed" && (
            <button
              className={button}
              disabled={busy}
              onClick={() => setDialog("refund")}
            >
              Record cash returned
            </button>
          )}
        {!closed && (
          <button
            className={dangerButton}
            disabled={busy}
            onClick={() => setDialog("cancel")}
          >
            Cancel order
          </button>
        )}
        {closed && (
          <Link
            className={button}
            href={`/dashboard/jobs/new?previousOrder=${encodeURIComponent(job.id)}`}
          >
            {operator ? "Propose another booking" : "Request again"}
          </Link>
        )}
        {job.status === "cancelled" &&
          job.stripePaymentIntentId &&
          job.paymentStatus !== "refunded" && (
            <button
              className={button}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const data = await orderRequest("/api/jobs/cancel", {
                    jobId: job.id,
                  });
                  setNotice(data.warning || "Card hold release checked.");
                })
              }
            >
              Check card hold release
            </button>
          )}
      </div>
      {operator &&
        job.status === "accepted" &&
        job.paymentMethod !== "cash" &&
        !["held", "paid"].includes(job.paymentStatus) && (
          <p className="text-sm">
            Waiting for the customer’s card authorization before work can start.
          </p>
        )}
      {busy && <p role="status">Updating work order…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <Modal
        isOpen={!!dialog}
        onClose={() => {
          if (!busy) setDialog("");
        }}
        title={
          {
            "complete-cash": "Did you receive the cash payment?",
            cancel: "Cancel this order?",
            decline: "Decline this request?",
            time: "Propose a new time",
            photo: "Completion photo",
            cash: "Confirm cash received",
            refund: "Record cash returned",
            approve: "Approve cash booking",
            "": "",
          }[dialog]
        }
      >
        {dialog === "complete-cash" && (
          <div className="space-y-4">
            <p>Have you received ${job.price.toFixed(2)} CAD in cash for this job?</p>
            <button className={button} disabled={busy} onClick={() => complete(true)}>Yes · record payment & complete work</button>
            <button className="min-h-12 rounded-xl border px-4 py-3 font-semibold" disabled={busy} onClick={() => complete()}>Not yet · complete work, keep payment pending</button>
            <p className="text-sm">Unpaid cash jobs stay in Needs attention so you can confirm payment later.</p>
          </div>
        )}
        {dialog === "time" && (
          <div className="space-y-4">
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={asap}
                onChange={(e) => setAsap(e.target.checked)}
              />
              ASAP · no promised appointment time
            </label>
            {!asap && (
              <label className="block">
                New date and time
                <input
                  type="datetime-local"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2 block min-h-12 w-full rounded-xl border p-3"
                />
              </label>
            )}
            {!operator &&
              job.paymentMethod === "cash" &&
              !job.cashPaymentAcknowledged && (
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={cash}
                    onChange={(e) => setCash(e.target.checked)}
                  />
                  I agree to pay ${job.price.toFixed(2)} in cash after work.
                </label>
              )}
            <p className="text-sm">
              Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. The
              other participant must approve.
            </p>
            <button
              className={button}
              disabled={
                busy ||
                (!asap && !time) ||
                (!operator &&
                  job.paymentMethod === "cash" &&
                  !job.cashPaymentAcknowledged &&
                  !cash)
              }
              onClick={() =>
                run(() =>
                  perform("propose-time", {
                    cashPaymentAcknowledged: cash,
                    scheduleMode: asap ? "asap" : "scheduled",
                    scheduledDate: asap ? null : new Date(time).toISOString(),
                    scheduleTimezone:
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                  }),
                )
              }
            >
              Send time proposal
            </button>
          </div>
        )}
        {dialog === "photo" && (
          <div className="space-y-4">
            <p>
              Upload proof of the completed work. Card payment is released when
              you complete the order.
            </p>
            <PhotoPicker photo={photo} onChange={setPhoto} disabled={busy} onBusy={setPreparingPhoto} />
            <PhonePhotoTransfer jobId={job.id} onPhoto={setPhoto} disabled={busy || preparingPhoto} />
            <button
              className={button}
              disabled={busy || preparingPhoto || !photo}
              onClick={() =>
                run(() => perform("photo", { completionPhotoUrl: photo }))
              }
            >
              {busy ? "Saving photo proof…" : "Save photo proof"}
            </button>
          </div>
        )}
        {dialog === "approve" && (
          <div className="space-y-4">
            <p>
              Pay ${job.price.toFixed(2)} CAD directly to the operator after
              work. No card will be charged.
            </p>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={cash}
                onChange={(e) => setCash(e.target.checked)}
              />
              I agree to pay in cash.
            </label>
            <button
              className={button}
              disabled={busy || !cash}
              onClick={() =>
                run(() =>
                  perform(job.scheduleProposal ? "approve-time" : "accept", {
                    proposalId: job.scheduleProposal?.id,
                    cashPaymentAcknowledged: true,
                  }),
                )
              }
            >
              Agree & approve
            </button>
          </div>
        )}
        {["cancel", "decline", "cash", "refund"].includes(dialog) && (
          <div className="space-y-4">
            <p>
              {dialog === "cancel" || dialog === "decline"
                ? "This order will stay in history. New work requires a new booking. Held card payments are released on cancellation; captured payments require support for refunds."
                : dialog === "cash"
                  ? `Confirm only after you have received $${job.price.toFixed(2)} in cash.`
                  : `Confirm only after returning $${job.price.toFixed(2)} directly to the customer.`}
            </p>
            <button
              className={dialog === "cancel" || dialog === "decline" || dialog === "refund" ? dangerButton : button}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (dialog === "decline") await perform("decline");
                  else {
                    const data = await orderRequest(
                      dialog === "cancel"
                        ? "/api/jobs/cancel"
                        : dialog === "cash"
                          ? "/api/jobs/confirm-cash"
                          : "/api/jobs/cash-payment",
                      {
                        jobId: job.id,
                        ...(dialog === "refund" ? { action: "refund" } : {}),
                      },
                    );
                    if (data.warning) setNotice(data.warning);
                  }
                })
              }
            >
              Confirm{" "}
              {dialog === "cancel"
                ? "cancellation"
                : dialog === "decline"
                  ? "decline"
                  : dialog === "cash"
                    ? "cash received"
                    : "cash returned"}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-red-700">
            {error}
          </p>
        )}
      </Modal>
      {secret && (
        <StripeCheckout
          clientSecret={secret}
          amount={job.price}
          onCancel={() => setSecret("")}
          onSuccess={async (paymentIntentId) => {
            await orderRequest("/api/stripe/payment-status", {
              paymentIntentId,
            });
            setSecret("");
          }}
        />
      )}
    </div>
  );
}
