import { calculateServicePrice, quoteMarketplace } from "@/lib/marketplacePricing";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  canAcceptPlatformPayments,
  isClientWithinOperatorRadius,
  isOperatorPublic,
} from "@/lib/operatorDiscovery";
import { ClientProfile, OperatorProfile, Job, ServiceType } from "@/lib/types";
import {
  orderUser,
  validId,
  parseSchedule,
  OrderError,
  orderFailure,
  orderEvent,
} from "@/lib/workOrderServer";
import { sendWorkOrderEmail } from "@/lib/emailNotifications";

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
      const requestedServices: ServiceType[] = Array.isArray(body.serviceTypes)
        ? [...new Set<ServiceType>(body.serviceTypes.filter((service: unknown): service is ServiceType =>
            typeof service === "string" && operator.serviceTypes.includes(service as ServiceType),
          ))]
        : [];
      if (!fromOperator && Array.isArray(body.serviceTypes) && requestedServices.length !== body.serviceTypes.length)
        throw new OrderError("Choose valid services offered by this company.", 400);
      const services = previous?.serviceTypes || (requestedServices.length > 0
        ? requestedServices
        : client.propertyDetails?.serviceTypes || ["driveway"]);
      const operatorPrice = calculateServicePrice(
        operator.pricing,
        services,
        size as "small" | "medium" | "large",
      );
      if (!Number.isFinite(operatorPrice) || operatorPrice <= 0)
        throw new OrderError("The company must set a valid service price.");
      const quote = quoteMarketplace(operatorPrice, body.paymentMethod);
      const price = quote.price;
      if (body.expectedPrice === undefined || body.expectedPrice !== (fromOperator ? operatorPrice : price))
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
        serviceTypes: services,
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
        ...quote,
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
      const email = orderEvent(
        tx,
        { ...data, id: ref.id } as unknown as Job,
        uid,
        "created",
        `${size} driveway · ${services.map(service => service.replaceAll("-", " ")).join(", ")} · ${fromOperator
          ? "Booking proposal · customer approval needed"
          : "Request sent · awaiting company"}`,
      );
      const result = {
        jobId: ref.id,
        chatId: chat.id,
        orderNumber: String(number),
        email: { uid: email.recipient, title: email.message, eventId: "created" },
      };
      tx.set(requestRef, result);
      return result;
    });
    if (!result) throw new OrderError("Could not create this booking. Please retry.");
    if (result.email) await sendWorkOrderEmail(result.email.uid, result.jobId, result.email.title, result.email.eventId).catch(error => console.error("Work order email failed", error));
    const { email: _email, ...response } = result;
    return NextResponse.json(response);
  } catch (error) {
    return orderFailure(error);
  }
}
