import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Job, OperatorProfile } from "@/lib/types";
import { hasScheduleConflict, dateMillis } from "@/lib/workOrders";
import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import {
  orderUser,
  validId,
  parseSchedule,
  OrderError,
  orderFailure,
  orderEvent,
} from "@/lib/workOrderServer";

export async function POST(request: NextRequest) {
  try {
    const uid = await orderUser(request),
      body = await request.json();
    if (!validId(body.jobId) || !validId(body.requestId))
      throw new OrderError("Invalid work order action.", 400);
    const db = getAdminDb();
    const result = await db.runTransaction(async (tx) => {
      const ref = db.doc(`jobs/${body.jobId}`),
        snap = await tx.get(ref);
      if (!snap.exists) throw new OrderError("Work order not found.", 404);
      const job = { ...snap.data(), id: snap.id } as Job;
      if (![job.clientId, job.operatorId].includes(uid))
        throw new OrderError(
          "This work order belongs to another account.",
          403,
        );
      const receipt = db.doc(`jobs/${job.id}/actions/${body.requestId}`);
      if ((await tx.get(receipt)).exists) return { success: true };
      if ((job.revision || 0) !== body.revision)
        throw new OrderError(
          "This order changed. Review the latest information and try again.",
        );
      if (["cancelled", "completed"].includes(job.status))
        throw new OrderError(
          "This order is closed. Request a new order for new work.",
        );
      // Every scheduling/start decision reads and writes this shared lock. This
      // serializes simultaneous actions on DIFFERENT orders for one operator.
      const lock = db.doc(`operatorWorkLocks/${job.operatorId}`);
      await tx.get(lock);
      const others = (
        await tx.get(
          db.collection("jobs").where("operatorId", "==", job.operatorId),
        )
      ).docs.map((d) => ({ ...d.data(), id: d.id }) as Job);
      const operator = (
        await tx.get(db.doc(`users/${job.operatorId}`))
      ).data() as OperatorProfile;
      const isOperator = uid === job.operatorId,
        now = FieldValue.serverTimestamp();
      const update: Record<string, unknown> = {
        revision: (job.revision || 0) + 1,
        updatedAt: now,
      };
      let title = "";
      const ensureBookable = () => {
        if (
          !operator?.idVerified ||
          (job.paymentMethod !== "cash" && !canAcceptPlatformPayments(operator))
        )
          throw new OrderError(
            "The company must finish verification and payment setup before accepting this order.",
          );
        if (
          job.paymentMethod === "cash" &&
          uid === job.clientId &&
          !job.cashPaymentAcknowledged &&
          body.cashPaymentAcknowledged !== true
        )
          throw new OrderError(
            "Please agree to pay the operator in cash.",
            400,
          );
        if (
          job.paymentMethod === "cash" &&
          uid === job.operatorId &&
          !job.cashPaymentAcknowledged
        )
          throw new OrderError(
            "The customer must first agree to cash payment.",
          );
      };
      const ensureSchedule = (candidate: Job) => {
        if (
          candidate.scheduleMode !== "asap" &&
          candidate.scheduledTime !== "ASAP" &&
          dateMillis(candidate.scheduledDate) &&
          dateMillis(candidate.scheduledDate) <= Date.now()
        )
          throw new OrderError(
            "This requested time has passed. Propose a new time.",
          );
        if (hasScheduleConflict(candidate, others))
          throw new OrderError(
            "This appointment overlaps another confirmed work order. Choose a different time.",
          );
      };
      switch (body.action) {
        case "accept": {
          if (
            job.status !== "pending" ||
            job.scheduleProposal ||
            (job.awaitingResponseFrom || job.operatorId) !== uid
          )
            throw new OrderError(
              "This request is not awaiting your acceptance.",
            );
          ensureBookable();
          ensureSchedule(job);
          Object.assign(update, {
            status: "accepted",
            awaitingResponseFrom: null,
            cashPaymentAcknowledged:
              job.paymentMethod === "cash" ? true : false,
          });
          title = "Booking accepted";
          break;
        }
        case "decline": {
          if (
            job.status !== "pending" ||
            (job.awaitingResponseFrom || job.operatorId) !== uid
          )
            throw new OrderError("This request is not awaiting your response.");
          Object.assign(update, {
            status: "cancelled",
            declinedBy: uid,
            cancelledBy: uid,
            cancelledAt: now,
            awaitingResponseFrom: null,
            scheduleProposal: null,
          });
          title = "Booking declined";
          break;
        }
        case "propose-time": {
          if (!["pending", "accepted"].includes(job.status))
            throw new OrderError(
              "Only requested or upcoming work can be rescheduled.",
            );
          if (
            job.status === "pending" &&
            (job.awaitingResponseFrom || job.operatorId) !== uid
          )
            throw new OrderError("Wait for the other participant to respond.");
          if (job.scheduleProposal)
            throw new OrderError(
              "Respond to the existing time proposal first.",
            );
          if (
            !isOperator &&
            job.paymentMethod === "cash" &&
            !job.cashPaymentAcknowledged
          ) {
            if (body.cashPaymentAcknowledged !== true)
              throw new OrderError(
                "Agree to cash payment before proposing a time.",
                400,
              );
            update.cashPaymentAcknowledged = true;
          }
          const schedule = parseSchedule(body);
          ensureSchedule({ ...job, ...schedule } as unknown as Job);
          const recipientId = isOperator ? job.clientId : job.operatorId;
          Object.assign(update, {
            scheduleProposal: {
              ...schedule,
              id: body.requestId,
              proposedBy: uid,
              recipientId,
            },
            ...(job.status === "pending"
              ? { awaitingResponseFrom: recipientId }
              : {}),
          });
          title = "New time proposed · approval needed";
          break;
        }
        case "approve-time":
        case "decline-time": {
          const proposal = job.scheduleProposal;
          if (
            !proposal ||
            proposal.recipientId !== uid ||
            proposal.id !== body.proposalId
          )
            throw new OrderError(
              "This proposal has changed or is no longer awaiting your response.",
            );
          if (body.action === "approve-time") {
            ensureBookable();
            const {
              scheduleMode,
              scheduledDate,
              scheduledTime,
              scheduleTimezone,
            } = proposal;
            const schedule = {
              scheduleMode,
              scheduledDate,
              scheduledTime,
              scheduleTimezone,
            };
            ensureSchedule({ ...job, ...schedule });
            Object.assign(update, schedule, {
              status: "accepted",
              awaitingResponseFrom: null,
              cashPaymentAcknowledged:
                job.paymentMethod === "cash" ? true : false,
            });
            title = "New appointment approved";
          } else {
            if (job.status === "pending")
              update.awaitingResponseFrom = proposal.proposedBy;
            title = "Time change declined · original request retained";
          }
          update.scheduleProposal = null;
          break;
        }
        case "en-route":
        case "in-progress": {
          if (!isOperator)
            throw new OrderError(
              "Only the assigned operator can process work.",
              403,
            );
          if (job.scheduleProposal)
            throw new OrderError(
              "Resolve the proposed time change before starting work.",
            );
          if (
            !(body.action === "en-route"
              ? job.status === "accepted"
              : ["accepted", "en-route"].includes(job.status))
          )
            throw new OrderError("This work order cannot move to that step.");
          if (
            job.paymentMethod !== "cash" &&
            !["held", "paid"].includes(job.paymentStatus)
          )
            throw new OrderError(
              "The customer must authorize card payment before work starts.",
            );
          if (
            others.some(
              (other) =>
                other.id !== job.id &&
                ["en-route", "in-progress"].includes(other.status),
            )
          )
            throw new OrderError(
              "Finish the order already underway before starting this one.",
            );
          update.status = body.action;
          if (body.action === "in-progress") update.startTime = now;
          title =
            body.action === "en-route"
              ? "Operator is on the way"
              : "Work started";
          break;
        }
        case "photo": {
          if (!isOperator || job.status !== "in-progress")
            throw new OrderError(
              "Start work before submitting completion proof.",
            );
          if (
            typeof body.completionPhotoUrl !== "string" ||
            !/^data:image\/(jpeg|png|webp);base64,/.test(
              body.completionPhotoUrl,
            ) ||
            body.completionPhotoUrl.length > 700000
          )
            throw new OrderError("Choose an image smaller than 500 KB.", 400);
          update.completionPhotoUrl = body.completionPhotoUrl;
          title = "Completion photo submitted";
          break;
        }
        case "complete": {
          if (
            !isOperator ||
            job.status !== "in-progress" ||
            !job.completionPhotoUrl
          )
            throw new OrderError(
              "Start work and submit photo proof before completing the order.",
            );
          if (job.paymentMethod !== "cash" && job.paymentStatus !== "paid")
            throw new OrderError(
              "Card payment must be captured before completing the order.",
            );
          Object.assign(update, { status: "completed", completionTime: now });
          title =
            job.paymentMethod === "cash" && job.paymentStatus !== "paid"
              ? "Work completed · cash payment due"
              : "Work completed";
          break;
        }
        default:
          throw new OrderError("Unknown work order action.", 400);
      }
      tx.set(lock, { updatedAt: now });
      tx.update(ref, update);
      tx.set(receipt, { action: body.action, createdAt: now });
      orderEvent(tx, job, uid, body.requestId, title);
      return { success: true };
    });
    return NextResponse.json(result);
  } catch (error) {
    return orderFailure(error);
  }
}
