import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  canAcceptPlatformPayments,
  isClientWithinOperatorRadius,
  isOperatorPublic,
} from "@/lib/operatorDiscovery";
import { ClientProfile, OperatorProfile, Job } from "@/lib/types";
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
    if (!validId(body.requestId) || !validId(body.operatorId))
      throw new OrderError("Invalid booking request.", 400);
    const db = getAdminDb();
    const result = await db.runTransaction(async (tx) => {
      const requestRef = db.doc(`bookingRequests/${uid}-${body.requestId}`);
      const prior = await tx.get(requestRef);
      if (prior.exists) return prior.data();
      const actor = (await tx.get(db.doc(`users/${uid}`))).data();
      const fromOperator = actor?.role === "operator";
      const clientId = fromOperator ? body.clientId : uid;
      if (
        !validId(clientId) ||
        (fromOperator && body.operatorId !== uid) ||
        (!fromOperator && actor?.role !== "client")
      )
        throw new OrderError("You cannot request this booking.", 403);
      const operator = {
        ...(await tx.get(db.doc(`users/${body.operatorId}`))).data(),
        uid: body.operatorId,
      } as OperatorProfile;
      const client = {
        ...(await tx.get(db.doc(`users/${clientId}`))).data(),
        uid: clientId,
      } as ClientProfile;
      if (
        operator.role !== "operator" ||
        client.role !== "client" ||
        !isOperatorPublic(operator) ||
        !isClientWithinOperatorRadius(client, operator)
      )
        throw new OrderError(
          "This company is no longer available for this property.",
        );
      let previous: Job | undefined;
      if (body.previousOrderId) {
        if (!validId(body.previousOrderId))
          throw new OrderError("Invalid previous order.", 400);
        previous = (
          await tx.get(db.doc(`jobs/${body.previousOrderId}`))
        ).data() as Job | undefined;
        if (
          !previous ||
          previous.clientId !== clientId ||
          previous.operatorId !== operator.uid
        )
          throw new OrderError(
            "The previous order does not belong to these participants.",
            403,
          );
      }
      if (fromOperator && !previous)
        throw new OrderError(
          "Choose a previous customer order to send a proposal.",
          403,
        );
      if (!["cash", "credit"].includes(body.paymentMethod))
        throw new OrderError("Choose cash or card.", 400);
      if (
        body.paymentMethod === "credit" &&
        !canAcceptPlatformPayments(operator)
      )
        throw new OrderError(
          "This company cannot currently accept card payments.",
        );
      if (
        !fromOperator &&
        body.paymentMethod === "cash" &&
        body.cashPaymentAcknowledged !== true
      )
        throw new OrderError("Please acknowledge payment in cash.", 400);
      const schedule = parseSchedule(body);
      const size =
        previous?.propertySize ||
        client.propertyDetails?.propertySize ||
        "medium";
      const price =
        operator.pricing?.driveway?.[size as "small" | "medium" | "large"] ||
        40;
      if (!Number.isFinite(price) || price <= 0)
        throw new OrderError("The company must set a valid service price.");
      if (body.expectedPrice !== undefined && body.expectedPrice !== price)
        throw new OrderError(
          "The service price changed. Refresh and review the current price before submitting.",
        );
      const counterRef = db.doc("counters/workOrders"),
        counter = await tx.get(counterRef);
      const number = (counter.data()?.value || 1000) + 1;
      const ref = db.collection("jobs").doc(),
        chat = db.collection("chats").doc(),
        now = FieldValue.serverTimestamp();
      const data = {
        clientId,
        operatorId: operator.uid,
        chatId: chat.id,
        orderNumber: String(number),
        revision: 0,
        bookingInitiator: uid,
        awaitingResponseFrom: fromOperator ? clientId : operator.uid,
        ...(previous ? { previousOrderId: body.previousOrderId } : {}),
        status: "pending",
        serviceTypes: previous?.serviceTypes ||
          client.propertyDetails?.serviceTypes || ["driveway"],
        propertySize: size,
        address: client.address || "",
        city: client.city || "",
        province: client.province || "",
        postalCode: client.postalCode || "",
        clientLat: client.lat ?? null,
        clientLng: client.lng ?? null,
        specialInstructions:
          previous?.specialInstructions ||
          client.propertyDetails?.specialInstructions ||
          "",
        ...schedule,
        estimatedDuration: previous?.estimatedDuration || 45,
        price,
        paymentMethod: body.paymentMethod,
        requiresCardPayment: body.paymentMethod === "credit",
        cashPaymentAcknowledged: !fromOperator && body.paymentMethod === "cash",
        paymentStatus: "pending",
        createdAt: now,
        updatedAt: now,
      };
      tx.set(counterRef, { value: number });
      tx.set(ref, data);
      tx.set(chat, {
        jobId: ref.id,
        participants: [clientId, operator.uid],
        unreadCount: { [clientId]: 0, [operator.uid]: 0 },
        createdAt: now,
      });
      orderEvent(
        tx,
        { ...data, id: ref.id } as unknown as Job,
        uid,
        "created",
        fromOperator
          ? "Booking proposal · customer approval needed"
          : "Request sent · awaiting company",
      );
      const result = {
        jobId: ref.id,
        chatId: chat.id,
        orderNumber: String(number),
      };
      tx.set(requestRef, result);
      return result;
    });
    return NextResponse.json(result);
  } catch (error) {
    return orderFailure(error);
  }
}
