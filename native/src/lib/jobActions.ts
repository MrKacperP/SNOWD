import * as Location from "expo-location";
import type { Job } from "@/lib/types";
import type { Profile } from "~/context/auth";
import type { Icon } from "~/components/ui";
import { api } from "./api";
import { money } from "./format";
import { completeWithPhoto, orderAction, payForJob, sendOnMyWay } from "./orders";
import { pickPhotoFile } from "./photos";
import { uploadFile } from "./uploads";

type SymbolName = Parameters<typeof Icon>[0]["name"];

export type JobAction = {
  key: string;
  title: string;
  icon?: SymbolName;
  variant?: "primary" | "danger" | "secondary";
  /** Ask before running, for anything that can't be undone. */
  confirm?: { title: string; message: string; label: string; destructive?: boolean };
  /** Ask where the photo comes from first (camera or library). */
  photo?: boolean;
  run: (photoSource?: "camera" | "library") => Promise<unknown>;
  done: string;
};

/** Where the operator is right now, if they allow it, so a nearby confirmation can include an ETA. */
async function currentPosition() {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") ({ status } = await Location.requestForegroundPermissionsAsync());
    if (status !== "granted") return {};
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { operatorLat: position.coords.latitude, operatorLng: position.coords.longitude };
  } catch {
    return {};
  }
}

/**
 * The next step(s) this person can take on a work order, most important first.
 * The same list drives the order screen's bottom bar and the home page, so a job can be moved
 * along from either place.
 */
export function jobActions(job: Job, uid: string, profile?: Profile): JobAction[] {
  const operator = job.operatorId === uid;
  const proposalForMe = job.scheduleProposal?.recipientId === uid;
  const awaitingMe = job.status === "pending" && !job.scheduleProposal && (job.awaitingResponseFrom || job.operatorId) === uid;
  const cardUnpaid = job.paymentMethod !== "cash" && !["held", "paid"].includes(job.paymentStatus);
  const out: JobAction[] = [];

  if (awaitingMe || proposalForMe) {
    out.push({
      key: "accept",
      title: proposalForMe ? "Approve new time" : "Accept request",
      icon: "checkmark",
      run: async () =>
        orderAction(job, proposalForMe ? "approve-time" : "accept", {
          proposalId: job.scheduleProposal?.id,
          cashPaymentAcknowledged: true,
          // Within 1 km of an ASAP job, the customer gets an ETA the moment it's confirmed.
          ...(operator && !proposalForMe ? await currentPosition() : {}),
        }),
      done: "Booking confirmed.",
    });
    out.push({
      key: "decline",
      title: "Decline",
      variant: "danger",
      confirm: { title: "Decline this request?", message: "The customer will be told you’re not available.", label: "Decline", destructive: true },
      run: () => orderAction(job, proposalForMe ? "decline-time" : "decline", { proposalId: job.scheduleProposal?.id }),
      done: "Request declined.",
    });
  }
  if (!operator && job.status === "accepted" && cardUnpaid)
    out.push({ key: "pay", title: `Pay ${money(job.price)}`, icon: "creditcard.fill", run: () => payForJob(job, profile?.displayName), done: "Payment authorized. You’re only charged once the work is done." });
  if (operator && job.status === "accepted")
    out.push({ key: "go", title: "I’m on my way", icon: "car.fill", run: () => sendOnMyWay(job), done: "The customer has your ETA." });
  if (operator && job.status === "en-route")
    out.push({ key: "start", title: "Start clearing", icon: "snowflake", run: () => orderAction(job, "in-progress"), done: "Work started. Snap a photo when it’s clear." });
  if (operator && job.status === "in-progress")
    out.push({
      key: "finish",
      title: "Finish with photo",
      icon: "camera.fill",
      photo: true,
      run: async (source) => {
        const file = await pickPhotoFile(source || "camera");
        if (!file) return false;
        // Full-size photo goes to Storage, so any photo from the phone works.
        const url = await uploadFile(`completion-photos/${job.id}`, file);
        await completeWithPhoto(job, url);
      },
      done: job.paymentMethod === "cash" ? "Work completed. Confirm the cash once you’ve received it." : "Work completed and payment captured.",
    });
  if (operator && job.status === "completed" && job.paymentMethod === "cash" && job.paymentStatus === "pending")
    out.push({ key: "cash", title: "Confirm cash received", icon: "banknote.fill", run: () => api("/api/jobs/confirm-cash", { jobId: job.id }), done: "Cash payment confirmed." });
  return out;
}
