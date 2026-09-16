"use client";
import { completeWithPhoto } from "@/lib/completeWithPhoto";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Check } from "lucide-react";

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
  "motion-safe:transition motion-safe:active:scale-[0.98] min-h-11 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 px-4 py-3 text-sm font-semibold disabled:opacity-50";
const attentionButton = `${button} enabled:!border-[var(--ink)] enabled:!bg-[var(--ink)] enabled:!text-white enabled:hover:!bg-[var(--accent-dark)]`;
const dangerButton = `${button} border-red-200 text-red-700 hover:!border-red-300 hover:!bg-red-50`;
const confirmDangerButton = `${button} !border-red-700 !bg-red-700 !text-white hover:!bg-red-800`;
export default function OrderActions({
  job,
  onUpdated,
  activeOrder,
  bookingUnavailable = false,
  compact = false,
  navigateOnUpdate = true,
}: {
  job: Job;
  activeOrder?: Job;
  bookingUnavailable?: boolean;
  compact?: boolean;
  navigateOnUpdate?: boolean;
  onUpdated?: (message: string) => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.uid || "",
    operator = uid === job.operatorId,
    closed = ["completed", "cancelled"].includes(job.status);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState<
    | "finish-after-cash"
    | "complete-cash"
    | ""
    | "cancel"
    | "decline"
    | "time"
    | "photo"
    | "cash"
    | "refund"
    | "approve"
    | "action-success"
    | "completion-success"
  >("");
  const [time, setTime] = useState(""),
    [asap, setAsap] = useState(false),
    [cash, setCash] = useState(false);
  const [secret, setSecret] = useState(""),
    [photo, setPhoto] = useState("");
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const desktopPhotoFlow = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 768px)").matches;
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
  const openWorkOrder = () => {
    const target = `/dashboard/jobs/${job.id}`;
    if (window.location.pathname !== target) router.push(target);
  };
  const run = async (
    fn: () => Promise<unknown>,
    navigate = navigateOnUpdate,
    nextDialog: typeof dialog = "",
    successMessage = "Work order updated successfully.",
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setSuccess("");
    try {
      await fn();
      pendingRequest.current = null;
      setSuccess(successMessage);
      setDialog(nextDialog);
      if (navigate) {
        openWorkOrder();
        onUpdated?.(`Order #${orderNumber(job)} updated.`);
      }
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
    const message = action === "accept" ? "Booking confirmed successfully." : "New visit time approved successfully.";
    void run(() => perform(action, { proposalId: job.scheduleProposal?.id }), navigateOnUpdate, "action-success", message);
  };
  const pay = () =>
    run(async () => {
      const data = await orderRequest("/api/stripe/create-payment-intent", {
        jobId: job.id,
      });
      setSecret(data.clientSecret);
    }, false);
  const complete = (cashReceived = false) =>
    run(async () => {
      if (job.paymentMethod !== "cash")
        await orderRequest("/api/stripe/capture-payment", {
          paymentIntentId: job.stripePaymentIntentId,
        });
      if (cashReceived)
        await orderRequest("/api/jobs/confirm-cash", { jobId: job.id });
      await perform("complete");
    });
  const actionNeeded = orderActionNeeded(job, uid);
  const submitCompletionPhoto = (selectedPhoto: string) => {
    setPhoto(selectedPhoto);
    void run(
      () => completeWithPhoto(job, selectedPhoto),
      false,
      job.paymentMethod === "cash" ? "complete-cash" : "completion-success",
      "Work completed",
    );
  };
  const shareJourney = async () => {
    if (!navigator.geolocation) throw new Error("Location sharing is not supported on this device.");
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      });
    }).catch((error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) throw new Error("Allow location access to send your arrival time.");
      if (error.code === error.TIMEOUT) throw new Error("Your location took too long to load. Move somewhere with a clearer signal and try again.");
      throw new Error("Your current location could not be found. Check location services and try again.");
    });
    return perform("en-route", {
      operatorLat: position.coords.latitude,
      operatorLng: position.coords.longitude,
      operatorLocationAccuracy: position.coords.accuracy,
    });
  };
  return (
    <div className="mt-4 space-y-3">
      {success && dialog !== "action-success" && (
        <p className="guided-success" role="status">
          <span className="guided-success-icon"><Check size={16} aria-hidden="true" /></span>
          {success}
        </p>
      )}
      {actionNeeded && job.status !== "cancelled" && (
        <p className="text-sm font-semibold text-[var(--ink)]">
          Next step: {actionNeeded}
        </p>
      )}
      {!actionNeeded && job.status === "pending" && !job.scheduleProposal && (
        <p className="text-sm text-[var(--text-secondary)]">
          Waiting for {operator ? "the customer" : "the service provider"} to
          respond. You’ll see the update here.
        </p>
      )}
      {job.scheduleProposal && (
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-sm">
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
      <div className="flex flex-wrap gap-2 [&>button]:first-of-type:shadow-[0_8px_22px_rgba(23,60,44,0.14)]">
        {!closed && job.scheduleProposal?.recipientId === uid && (
          <>
            <button
              className={actionNeeded ? attentionButton : button}
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
                  navigateOnUpdate,
                  "action-success",
                  "The proposed time was declined. The original visit remains unchanged.",
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
                className={actionNeeded ? attentionButton : button}
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
        {!operator &&
          job.status === "accepted" &&
          job.paymentMethod !== "cash" &&
          !["held", "paid"].includes(job.paymentStatus) && (
            <button
              className={actionNeeded ? attentionButton : button}
              disabled={busy}
              onClick={pay}
            >
              Authorize card · ${job.price.toFixed(2)}
            </button>
          )}
        {operator && !job.scheduleProposal && job.status === "accepted" && (
          <button
            className={attentionButton}
            disabled={
              busy ||
              (job.paymentMethod !== "cash" &&
                !["held", "paid"].includes(job.paymentStatus))
            }
            onClick={() => run(shareJourney, navigateOnUpdate, "action-success", "You are now marked on the way. The customer received your ETA.")}
          >
            On my way
          </button>
        )}
        {operator &&
          !job.scheduleProposal &&
          job.status === "en-route" && (
            <>
            <button
              className={job.status === "en-route" ? attentionButton : button}
              disabled={
                busy ||
                (job.paymentMethod !== "cash" &&
                  !["held", "paid"].includes(job.paymentStatus))
              }
              onClick={() => run(() => perform("in-progress"), navigateOnUpdate, "action-success", "Work started successfully. Add photo proof when the clearing is complete.")}
            >
              Start work
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() => run(() => perform("return-to-confirmed"), navigateOnUpdate, "action-success", "The visit is back to confirmed. The shared ETA and location were removed.")}
            >
              Go back to confirmed
            </button>
            </>
          )}
        {operator && job.status === "in-progress" && (
          <>
            {!job.completionPhotoUrl && <button
              className={!job.completionPhotoUrl ? attentionButton : button}
              disabled={busy}
              onClick={() => setDialog("photo")}
            >
              {job.completionPhotoUrl
                ? "Update photo proof"
                : "Add photo & complete work"}
            </button>}
            {job.completionPhotoUrl && <button
              className={attentionButton}
              disabled={busy || !job.completionPhotoUrl}
              onClick={() =>
                job.completionPhotoUrl
                  ? job.paymentMethod === "cash" &&
                    job.paymentStatus === "pending"
                    ? setDialog("complete-cash")
                    : complete()
                  : setDialog("photo")
              }
            >
              Complete work
            </button>}
          </>
        )}
        {operator &&
          job.paymentMethod === "cash" &&
          (job.status === "completed" || (job.status === "cancelled" && job.paymentStatus === "refunded")) &&
          ["pending", "refunded"].includes(job.paymentStatus) && (
            <button
              className={job.status === "completed" ? attentionButton : button}
              disabled={busy}
              onClick={() => setDialog("cash")}
            >
              {job.paymentStatus === "refunded" ? "Record cash received again" : "Confirm cash received"}
            </button>
          )}
        {closed && activeOrder && <Link className={button} href={`/dashboard/jobs/${activeOrder.id}`}>View current open work order</Link>}
        {closed && !activeOrder && !bookingUnavailable && (
          <Link
            className={button}
            href={`/dashboard/jobs/new?previousOrder=${encodeURIComponent(job.id)}`}
          >
            {operator ? "Propose another booking" : "Request again"}
          </Link>
        )}
      </div>
      {!compact && (!closed || (operator && job.paymentMethod === "cash" && job.paymentStatus === "paid") || (job.status === "cancelled" && job.stripePaymentIntentId && job.paymentStatus !== "refunded")) && <section className="rounded-xl border border-[var(--border-color)] p-3" aria-labelledby={`more-options-${job.id}`}>
        <h3 id={`more-options-${job.id}`} className="py-2 text-sm font-semibold">More options</h3>
        <div className="flex flex-wrap gap-2 pt-1">
        {operator &&
          job.paymentMethod === "cash" &&
          job.status === "in-progress" &&
          ["pending", "refunded"].includes(job.paymentStatus) && (
            <button
              className={button}
              disabled={busy}
              onClick={() => setDialog("cash")}
            >
              {job.paymentStatus === "refunded" ? "Record cash received again" : "Confirm cash received"}
            </button>
          )}

        {operator &&
          !job.scheduleProposal &&
          job.status === "accepted" && (
            <button
              className={button}
              disabled={
                busy ||
                (job.paymentMethod !== "cash" &&
                  !["held", "paid"].includes(job.paymentStatus))
              }
              onClick={() => run(() => perform("in-progress"), navigateOnUpdate, "action-success", "Work started successfully. Add photo proof when the clearing is complete.")}
            >
              Start work
            </button>
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
        {operator &&
          job.paymentMethod === "cash" &&
          job.paymentStatus === "paid" && (
            <button
              className={button}
              disabled={busy}
              onClick={() => setDialog("refund")}
            >
              Record cash returned
            </button>
          )}
        {["pending", "accepted"].includes(job.status) && (
          <button
            className={dangerButton}
            disabled={busy}
            onClick={() => setDialog("cancel")}
          >
            Cancel order
          </button>
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
        {operator && job.status === "in-progress" && job.completionPhotoUrl && (            <button
              className={!job.completionPhotoUrl ? attentionButton : button}
              disabled={busy}
              onClick={() => setDialog("photo")}
            >
              {job.completionPhotoUrl
                ? "Update photo proof"
                : "Add photo & complete work"}
            </button>
)}
        </div>
        {["en-route", "in-progress"].includes(job.status) && <p className="w-full text-sm text-[var(--text-secondary)]">Need to cancel after departure? Call support at <a className="font-semibold underline" href="tel:+14379223895">437-922-3895</a>.</p>}
      </section>}
      {!compact && operator &&
        job.status === "accepted" &&
        job.paymentMethod !== "cash" &&
        !["held", "paid"].includes(job.paymentStatus) && (
          <p className="text-sm">
            Waiting for the customer’s card authorization before work can start.
          </p>
        )}
      {!compact && job.status === "in-progress" && (
        <p className="text-sm text-[var(--text-secondary)]">
          {operator
            ? job.completionPhotoUrl ? "Photo saved. Finish completing this order below." : "Take a photo of the cleared areas, then finish the visit."
            : "Your provider is working. Completion proof will be available in this order when uploaded."}
        </p>
      )}
      {!compact && !operator && job.status === "accepted" && (
        <p className="text-sm text-[var(--text-secondary)]">
          {job.paymentMethod !== "cash" && !["held", "paid"].includes(job.paymentStatus)
            ? "Authorize your card before the provider starts. The payment is captured when work is completed."
            : "Your visit is confirmed. The provider will update this order when they are on the way."}
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
            "finish-after-cash": "Cash received · finish your work order",
            "complete-cash": "Did you receive the cash payment?",
            cancel: "Cancel this order?",
            decline: "Decline this request?",
            time: "Propose a new time",
            photo: "Completion photo",
            cash: "Confirm cash received",
            refund: "Record cash returned",
            approve: "Approve cash booking",
            "action-success": "Update complete",
            "completion-success": "Job completed",
            "": "",
          }[dialog]
        }
        variant={dialog === "cancel" || dialog === "decline" || dialog === "refund" ? "danger" : "default"}
      >
        {dialog === "action-success" && (
          <div className="space-y-4 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Check size={28} aria-hidden="true" /></span>
            <p className="text-base font-semibold">{success}</p>
            <button className={attentionButton} onClick={() => { setDialog(""); setSuccess(""); }}>Back to work order</button>
          </div>
        )}
        {dialog === "finish-after-cash" && <div className="space-y-4">
          <p>Payment is recorded. Complete the work order now so it no longer stays in progress.</p>
          <button className={attentionButton} disabled={busy} onClick={() => job.completionPhotoUrl ? complete() : setDialog("photo")}>{job.completionPhotoUrl ? "Complete work" : "Add photo & complete work"}</button>
        </div>}
        {dialog === "complete-cash" && (
          <div className="space-y-4">
            <p>
              Have you received ${job.price.toFixed(2)} CAD in cash for this
              job?
            </p>
            <button
              className={button}
              disabled={busy}
              onClick={() => run(
                () => orderRequest("/api/jobs/confirm-cash", { jobId: job.id }),
                false,
                "completion-success",
                "Cash payment recorded",
              )}
            >
              Yes · record payment
            </button>
            <button
              className="min-h-11 rounded-lg border px-4 py-3 font-semibold"
              disabled={busy}
              onClick={() => setDialog("completion-success")}
            >
              Not yet · keep payment pending
            </button>
            <p className="text-sm">
              Unpaid cash jobs stay in Needs attention so you can confirm
              payment later.
            </p>
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
              Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Choose a future time. The
              other participant must approve.
            </p>
            <button
              className={button}
              disabled={
                busy ||
                (!asap && (!time || !Number.isFinite(new Date(time).getTime()) || new Date(time).getTime() <= Date.now())) ||
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
                  navigateOnUpdate,
                  "action-success",
                  "The new visit time was sent for approval.",
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
              {desktopPhotoFlow ? "Scan the QR code with your phone to add the completion photo." : "Choose the completion photo from your gallery."}
              {" "}Uploading completion proof automatically completes this work order.
              For card orders, the authorized payment is captured at completion.
            </p>
            {desktopPhotoFlow ? (
              <PhonePhotoTransfer jobId={job.id} onPhoto={submitCompletionPhoto} disabled={busy} autoStart />
            ) : (
              <PhotoPicker photo={photo} onChange={submitCompletionPhoto} disabled={busy} onBusy={setPreparingPhoto} showCamera={false} />
            )}
            {(busy || preparingPhoto) && <p role="status">Uploading photo and completing work…</p>}
          </div>
        )}
        {dialog === "completion-success" && (
          <div className="space-y-4 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Check size={28} aria-hidden="true" /></span>
            <div><p className="text-lg font-semibold">This work order is complete.</p><p className="mt-2 text-sm text-[var(--text-secondary)]">The completion photo has been saved{job.paymentMethod === "cash" && job.paymentStatus !== "paid" ? ". You can record the cash payment later from Needs attention." : " and payment is complete."}</p></div>
            <button className={attentionButton} onClick={() => router.push("/dashboard")}>Close work order & return home</button>
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
                  navigateOnUpdate,
                  "action-success",
                  "Cash booking approved successfully.",
                )
              }
            >
              Agree & approve
            </button>
          </div>
        )}
        {["cancel", "decline", "cash", "refund"].includes(dialog) && (
          <div className="space-y-4">
            {busy && dialog === "cancel" && <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50 p-3 text-center" role="status"><div className="mx-auto mb-2 h-1.5 w-full overflow-hidden rounded-full bg-red-100"><span className="block h-full w-1/2 animate-[cancel-sweep_700ms_ease-in-out_infinite] rounded-full bg-red-600" /></div><p className="text-sm font-semibold text-red-800">Cancelling work order…</p></div>}
            <p>
              {dialog === "cancel" || dialog === "decline"
                ? "This order will stay in history. New work requires a new booking. Held card payments are released on cancellation; captured payments require support for refunds."
                : dialog === "cash"
                  ? `Confirm only after you have received $${job.price.toFixed(2)} in cash.`
                  : `Confirm only after returning $${job.price.toFixed(2)} directly to the customer.`}
            </p>
            <button
              className={
                dialog === "cancel" ||
                dialog === "decline" ||
                dialog === "refund"
                  ? confirmDangerButton
                  : button
              }
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
                }, dialog !== "cash", dialog === "cash" && job.status === "in-progress" ? "finish-after-cash" : "action-success", dialog === "cancel" ? "The work order was cancelled successfully." : dialog === "decline" ? "The booking request was declined." : dialog === "cash" ? "Cash payment recorded successfully." : "Cash return recorded successfully.")
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
        {dialog !== "completion-success" && dialog !== "action-success" && <button type="button" className={`${button} mt-4`} disabled={busy}
          onClick={() => setDialog("")}>Back to order</button>
        }
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
            openWorkOrder();
            onUpdated?.(`Order #${orderNumber(job)} payment updated.`);
          }}
        />
      )}
    </div>
  );
}
