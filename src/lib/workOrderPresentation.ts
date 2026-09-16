import type { Job } from "@/lib/types";
import { orderActionNeeded, orderLabel } from "@/lib/workOrders";

export type WorkOrderTone = "neutral" | "attention" | "progress" | "success" | "danger";

export interface WorkOrderPresentation {
  title: string;
  status: string;
  description: string;
  nextAction: string;
  tone: WorkOrderTone;
  progress: 1 | 2 | 3 | 4;
  paymentMessage: string;
}

export function workOrderPresentation(job: Job, uid: string): WorkOrderPresentation {
  const operator = job.operatorId === uid;
  const action = orderActionNeeded(job, uid);
  const waitingForCard = job.status === "accepted" && job.paymentMethod !== "cash" && !["held", "paid"].includes(job.paymentStatus);
  const paymentMessage = job.paymentMethod === "cash"
    ? job.paymentStatus === "paid" ? "Cash received" : "Cash after the job"
    : job.paymentStatus === "held" ? "Card authorized · charged after completion"
    : job.paymentStatus === "paid" ? "Card payment successful"
    : job.paymentStatus === "refunded" ? "Card hold released"
    : "Card authorization needed";

  if (job.status === "completed") return {
    title: "All clear.", status: orderLabel(job), tone: "success", progress: 4,
    description: job.paymentStatus === "paid" ? "The work and payment are complete." : "The work is complete. Check the payment step below.",
    nextAction: action, paymentMessage,
  };
  if (job.status === "cancelled") return {
    title: job.declinedBy ? "Request declined." : "Visit cancelled.", status: orderLabel(job), tone: "danger", progress: 1,
    description: "You can request another visit whenever you need help.", nextAction: "", paymentMessage,
  };
  if (job.scheduleProposal) return {
    title: job.scheduleProposal.recipientId === uid ? "Review the new time." : "Time change sent.",
    status: orderLabel(job), tone: job.scheduleProposal.recipientId === uid ? "attention" : "neutral", progress: job.status === "pending" ? 1 : 2,
    description: job.scheduleProposal.recipientId === uid ? "Choose whether the proposed time works for you." : "The current time stays booked until the change is approved.",
    nextAction: action, paymentMessage,
  };
  if (job.status === "pending") return {
    title: action ? "New request." : "Help requested.", status: orderLabel(job), tone: action ? "attention" : "neutral", progress: 1,
    description: action ? "Check the visit and respond below." : "You’ll see the confirmation here.", nextAction: action, paymentMessage,
  };
  if (job.status === "accepted") return {
    title: waitingForCard ? "Payment authorization needed." : "Visit confirmed.", status: orderLabel(job), tone: action ? "attention" : "neutral", progress: 2,
    description: waitingForCard ? (operator ? "The customer needs to authorize their card before work starts." : "Authorize the card now. It is charged after photo proof.") : (operator ? "Let the customer know when you leave." : "Your shoveler will update you when they leave."),
    nextAction: action || (operator && !waitingForCard ? "Start the trip" : ""), paymentMessage,
  };
  if (job.status === "en-route") return {
    title: operator ? "Ready to start?" : "Help is on the way.", status: orderLabel(job), tone: "progress", progress: 3,
    description: operator ? "Start work when you reach the property." : "Message your shoveler if they need arrival details.",
    nextAction: operator ? "Start work" : "", paymentMessage,
  };
  return {
    title: operator ? "One last photo." : "Snow is being cleared.", status: orderLabel(job), tone: "progress", progress: 3,
    description: operator ? "Photograph the cleared areas to finish the visit." : "You’ll receive a completion photo when the work is done.",
    nextAction: operator ? "Add photo & complete" : "", paymentMessage,
  };
}

