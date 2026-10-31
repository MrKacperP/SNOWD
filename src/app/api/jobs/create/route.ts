import { parseServiceLocation, sameServiceAddress } from "@/lib/serviceLocations";
import { verifyCardPaymentReadiness } from "@/lib/cardPaymentReadiness";
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
  pairChatId,
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
      // Only customers start bookings; operators cannot propose new ones.
      if (actor?.role !== "client")
        throw new OrderError("Only the customer can request a booking.", 403);
      const clientId = uid;
      const operator = {
        ...(await tx.get(db.doc(`users/${body.operatorId}`))).data(),
        uid: body.operatorId,
      } as OperatorProfile;
      const client = {
        ...(await tx.get(db.doc(`users/${clientId}`))).data(),
        uid: clientId,
      } as ClientProfile;
      let location;
      if (body.serviceLocation) {
        try { location = parseServiceLocation(body.serviceLocation); } catch(error) { throw new OrderError((error as Error).message,400); }
        if (!sameServiceAddress(location,client) && body.serviceAddressConfirmed !== true) throw new OrderError("Confirm service at the selected address instead of your profile home.",400);
      }
      const serviceClient = location ? { ...client, ...location, lat:location.lat, lng:location.lng } : client;
      if (
        operator.role !== "operator" ||
        client.role !== "client" ||
        !isOperatorPublic(operator) ||
        !isClientWithinOperatorRadius(serviceClient, operator)
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
      if (!["cash", "credit"].includes(body.paymentMethod))
        throw new OrderError("Choose cash or card.", 400);
      if (
        body.paymentMethod === "credit" &&
        (!canAcceptPlatformPayments(operator) || !(await verifyCardPaymentReadiness(operator.uid, operator.stripeConnectAccountId).catch(() => false)))
      )
        throw new OrderError(
          "This operator cannot accept card payments right now. Choose cash or find another operator who accepts cards.",
        );
      if (
        body.paymentMethod === "cash" &&
        body.cashPaymentAcknowledged !== true
      )
        throw new OrderError("Please acknowledge payment in cash.", 400);
      const schedule = parseSchedule(body);
      const size =
        location?.propertySize || previous?.propertySize ||
        client.propertyDetails?.propertySize ||
        "medium";
      const requestedServices: ServiceType[] = Array.isArray(body.serviceTypes)
        ? [...new Set<ServiceType>(body.serviceTypes.filter((service: unknown): service is ServiceType =>
            typeof service === "string" && operator.serviceTypes.includes(service as ServiceType),
          ))]
        : [];
      if (Array.isArray(body.serviceTypes) && requestedServices.length !== body.serviceTypes.length)
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
      if (body.expectedPrice === undefined || body.expectedPrice !== price)
        throw new OrderError(
          "The service price changed. Refresh and review the current price before submitting.",
        );
      const counterRef = db.doc("counters/workOrders"),
        counter = await tx.get(counterRef);
      const number = (counter.data()?.value || 1000) + 1;
      // One chat per client/operator pair; each work order is a section inside it.
      const chat = db.doc(`chats/${pairChatId(clientId, operator.uid)}`),
        chatExists = (await tx.get(chat)).exists;
      const ref = db.collection("jobs").doc(),
        now = FieldValue.serverTimestamp();
      const data = {
        clientId,
        operatorId: operator.uid,
        chatId: chat.id,
        orderNumber: String(number),
        revision: 0,
        bookingInitiator: uid,
        awaitingResponseFrom: operator.uid,
        ...(previous ? { previousOrderId: body.previousOrderId } : {}),
        status: "pending",
        serviceTypes: services,
        propertySize: size,
        address: serviceClient.address || "",
        city: serviceClient.city || "",
        province: serviceClient.province || "",
        postalCode: serviceClient.postalCode || "",
        clientLat: serviceClient.lat ?? null,
        clientLng: serviceClient.lng ?? null,
        specialInstructions:
          (location && !sameServiceAddress(location,previous || client) ? "" : previous?.specialInstructions) ||
          (location && !sameServiceAddress(location,client) ? "" : client.propertyDetails?.specialInstructions) ||
          "",
        ...schedule,
        estimatedDuration: previous?.estimatedDuration || 45,
        ...quote,
        paymentMethod: body.paymentMethod,
        requiresCardPayment: body.paymentMethod === "credit",
        cashPaymentAcknowledged: body.paymentMethod === "cash",
        paymentStatus: "pending",
        createdAt: now,
        updatedAt: now,
      };
      tx.set(counterRef, { value: number });
      tx.set(ref, data);
      if (chatExists)
        tx.update(chat, {
          jobId: ref.id,
          jobIds: FieldValue.arrayUnion(ref.id),
          openJobIds: FieldValue.arrayUnion(ref.id),
        });
      else
        tx.set(chat, {
          jobId: ref.id,
          jobIds: [ref.id],
          openJobIds: [ref.id],
          participants: [clientId, operator.uid],
          unreadCount: { [clientId]: 0, [operator.uid]: 0 },
          createdAt: now,
        });
      const email = orderEvent(
        tx,
        { ...data, id: ref.id } as unknown as Job,
        uid,
        "created",
        `${size} driveway · ${services.map(service => service.replaceAll("-", " ")).join(", ")} · Request sent · awaiting company`,
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
