"use client";

import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";
import { isStripeAccountReady,stripeConnectFetch } from "@/lib/stripeConnectClient";

import CancellationPopup from "@/components/CancellationPopup";
import ProgressTracker from "@/components/ProgressTracker";
import StatusBadge from "@/components/StatusBadge";
import StripeCheckout from "@/components/StripeCheckout";
import SupportChatButton from "@/components/SupportChatButton";
import Modal from "@/components/ui/Modal";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { sendAdminNotif } from "@/lib/adminNotifications";
import {
ChatMessage,
ClaimType,
Job,
JobStatus,
UserProfile,
} from "@/lib/types";
import { format } from "date-fns";
import {
addDoc,
collection,
doc,
getDoc,
increment,
onSnapshot,
orderBy,
query,
Timestamp,
updateDoc,
where
} from "firebase/firestore";
import {
AlertTriangle,
ArrowLeft,
Briefcase,
Camera,
CheckCircle,
Clock,
CreditCard,
DollarSign,
ExternalLink,
Flag,
MapPin,
MessageSquare,
Mic,
Navigation,
Paperclip,
Play,
Send,
Shield,
Square,
Star,
User,
X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import React,{ useCallback,useEffect,useRef,useState } from "react";
import "./chat.css";

type QuickCommConfirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
};

// Haversine distance between two coords
function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [showMobileTasksSheet, setShowMobileTasksSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [cashError, setCashError] = useState("");
  const [cashActionBusy, setCashActionBusy] = useState(false);
  const [showCashPayment, setShowCashPayment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [newMessage]);

  // Stripe state
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Photo upload state
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatAttachInputRef = useRef<HTMLInputElement>(null);
  const chatCameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Rehire state
  const [rehiring, setRehiring] = useState(false);
  const [rehireSent, setRehireSent] = useState(false);

  // Cancellation popup state
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Payment gate popup
  const [showPaymentGateModal, setShowPaymentGateModal] = useState(false);

  // Report / claim state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ClaimType>("other");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCameraQrModal, setShowCameraQrModal] = useState(false);
  const [mobileOrigin, setMobileOrigin] = useState<string>("");
  const [mobileOrigins, setMobileOrigins] = useState<string[]>([]);
  const [guestUploadPath, setGuestUploadPath] = useState<string>("");
  const [guestUploadSessionId, setGuestUploadSessionId] = useState<string>("");
  const [selectedGuestUploadUrl, setSelectedGuestUploadUrl] = useState<string>("");
  const [creatingGuestUploadLink, setCreatingGuestUploadLink] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<"updates" | "profile">("updates");
  const [quickCommConfirmation, setQuickCommConfirmation] =
    useState<QuickCommConfirmation | null>(null);

  const isOperator = profile?.role === "operator";
  const clientName = isOperator ? otherUser?.displayName : profile?.displayName;
  const operatorName = isOperator ? profile?.displayName : otherUser?.displayName;
  const mapAddress = [job?.address, job?.city, job?.province].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent(mapAddress || "Canada");
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapStaticUrl = mapsApiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${mapQuery}&zoom=15&size=1200x600&scale=2&maptype=roadmap&markers=color:0x2F6FED|${mapQuery}&key=${mapsApiKey}`
    : null;
  const guestUploadUrls = guestUploadPath
    ? (mobileOrigins.length ? mobileOrigins : [mobileOrigin || ""]).filter(Boolean).map((origin) => `${origin}${guestUploadPath}`)
    : [];
  const primaryGuestUploadUrl = selectedGuestUploadUrl || guestUploadUrls[0] || "";

  useEffect(() => {
    if (!guestUploadUrls.length) {
      setSelectedGuestUploadUrl("");
      return;
    }

    if (!selectedGuestUploadUrl || !guestUploadUrls.includes(selectedGuestUploadUrl)) {
      setSelectedGuestUploadUrl(guestUploadUrls[0]);
    }
  }, [guestUploadUrls, selectedGuestUploadUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    // For normal hosts, keep current origin. For localhost, ask the server for LAN IP.
    if (!isLocalhost) {
      setMobileOrigin(window.location.origin);
      return;
    }

    let isCancelled = false;

    const resolveLanOrigin = async () => {
      try {
        const response = await fetch("/api/network-origin", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to resolve network origin");

        const data = (await response.json()) as { origin?: string; origins?: string[] };
        if (!isCancelled) {
          const origins = Array.isArray(data.origins) && data.origins.length
            ? data.origins
            : [data.origin || window.location.origin];
          setMobileOrigins(origins);
          setMobileOrigin(origins[0] || window.location.origin);
        }
      } catch {
        if (!isCancelled) {
          setMobileOrigins([window.location.origin]);
          setMobileOrigin(window.location.origin);
        }
      }
    };

    resolveLanOrigin();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showCameraQrModal || !guestUploadSessionId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollForPhoto = async () => {
      if (cancelled) return;

      try {
        const response = await fetch("/api/mobile-upload/session/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: guestUploadSessionId }),
        });

        const data = (await response.json()) as { imageDataUrl?: string; pending?: boolean };
        if (data.imageDataUrl) {
          await sendMessage("Sent a photo", "image", { imageUrl: data.imageDataUrl });
          setShowCameraQrModal(false);
          alert("Photo uploaded successfully.");
          return;
        }
      } catch {
        // Keep polling while modal is open.
      }

      timer = setTimeout(pollForPhoto, 1500);
    };

    timer = setTimeout(pollForPhoto, 800);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [showCameraQrModal, guestUploadSessionId]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Compute distance between operator and client address
  const distance = React.useMemo(() => {
    if (!profile || !otherUser) return null;
    const myLat = profile.lat;
    const myLng = profile.lng;
    const otherLat = otherUser.lat;
    const otherLng = otherUser.lng;
    if (myLat && myLng && otherLat && otherLng) {
      return getDistanceKm(myLat, myLng, otherLat, otherLng);
    }
    return null;
  }, [profile, otherUser]);

  // Fetch chat, job, and other user data
  useEffect(() => {
    let unsubscribeJob: (() => void) | undefined;
    let cancelled = false;

    const fetchChatData = async () => {
      if (!chatId || !user?.uid) return;
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (cancelled) return;

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          if (chatData.rehireSent) setRehireSent(true);
          const otherUid = chatData.participants?.find(
            (p: string) => p !== user.uid
          );

          if (otherUid) {
            const userDoc = await getDoc(doc(db, "users", otherUid));
            if (cancelled) return;
            if (userDoc.exists()) {
              setOtherUser(userDoc.data() as UserProfile);
            }
          }

          if (chatData.jobId) {
            unsubscribeJob = onSnapshot(doc(db, "jobs", chatData.jobId), (jobDoc) => {
              if (jobDoc.exists()) {
                setJob({ id: jobDoc.id, ...jobDoc.data() } as Job);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchChatData();

    return () => {
      cancelled = true;
      unsubscribeJob?.();
    };
  }, [chatId, user?.uid]);

  // Real-time messages listener
  useEffect(() => {
    if (!chatId) return;
    let fallbackUnsubscribe: (() => void) | undefined;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ChatMessage[];
        setMessages(msgs);
      },
      (error) => {
        console.error("Messages listener error:", error);
        if (error.code === "failed-precondition") {
          const fallbackQ = query(
            collection(db, "messages"),
            where("chatId", "==", chatId)
          );
          fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
            const msgs = snapshot.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => {
                const aTime = (a as ChatMessage).createdAt;
                const bTime = (b as ChatMessage).createdAt;
                const aDate =
                  aTime && typeof aTime === "object" && "toDate" in aTime
                    ? (aTime as unknown as Timestamp).toDate()
                    : new Date(aTime as unknown as string);
                const bDate =
                  bTime && typeof bTime === "object" && "toDate" in bTime
                    ? (bTime as unknown as Timestamp).toDate()
                    : new Date(bTime as unknown as string);
                return aDate.getTime() - bDate.getTime();
              }) as ChatMessage[];
            setMessages(msgs);
          });
        }
      }
    );

    return () => {
      unsubscribe();
      fallbackUnsubscribe?.();
    };
  }, [chatId]);

  useEffect(() => {
    setRightPanelView("updates");
  }, [chatId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Mark messages as read — runs when new messages arrive while chat is open.
  // Uses a ref to avoid clearing the other user's freshly-incremented counter.
  const pendingMarkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chatId || !user?.uid || messages.length === 0) return;

    // Debounce: batch all marks within 300 ms so rapid incoming messages
    // don't flood Firestore with individual writes.
    if (pendingMarkRef.current) clearTimeout(pendingMarkRef.current);
    pendingMarkRef.current = setTimeout(async () => {
      try {
        // 1. Reset our unread counter
        await updateDoc(doc(db, "chats", chatId), {
          [`unreadCount.${user.uid}`]: 0,
        });

        // 2. Mark each unread (from other) message as read
        const unread = messages.filter(
          (m) => m.senderId !== user.uid && !m.read
        );
        await Promise.all(
          unread.map((msg) =>
            updateDoc(doc(db, "messages", msg.id), { read: true }).catch(() => {})
          )
        );
      } catch {
        // Silently swallow permission errors during sign-out transitions
      }
    }, 300);

    return () => {
      if (pendingMarkRef.current) clearTimeout(pendingMarkRef.current);
    };
  }, [chatId, user?.uid, messages]);

  // Also clear unread immediately when the chat page mounts (before any messages load)
  useEffect(() => {
    if (!chatId || !user?.uid) return;
    updateDoc(doc(db, "chats", chatId), {
      [`unreadCount.${user.uid}`]: 0,
    }).catch(() => {});
  }, [chatId, user?.uid]);

  // Send a message
  const sendMessage = useCallback(
    async (
      content: string,
      type: ChatMessage["type"] = "text",
      metadata?: ChatMessage["metadata"]
    ) => {
      if (!content.trim() && type === "text") return;
      if (!user?.uid || !chatId) return;

      const trackSendingState = type === "text";
      if (trackSendingState) setSendingMessage(true);

      try {
        const messageData: Record<string, unknown> = {
          chatId,
          senderId: user.uid,
          senderName: profile?.displayName || "User",
          type,
          content,
          read: false,
          createdAt: Timestamp.now(),
        };
        if (metadata !== undefined) messageData.metadata = metadata;

        await addDoc(collection(db, "messages"), messageData);

        const chatDocRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatDocRef);
        const chatData = chatSnap.data();
        const otherUid = chatData?.participants?.find(
          (p: string) => p !== user.uid
        );

        if (type === "text") {
          void sendAdminNotif({
            type: "system",
            title: "New job message",
            message: content,
            senderName: profile?.displayName || "User",
            chatLabel: `Job chat · ${chatData?.jobId || chatId.slice(0, 8)}`,
            preview: content,
            chatId,
            uid: user.uid,
            meta: { path: "/admin/chats", jobId: chatData?.jobId || "" },
          });
        }

        const updateData: Record<string, unknown> = {
          lastMessage:
            type === "text" ? content : `[${type.replace("-", " ")}]`,
          lastMessageTime: Timestamp.now(),
        };

        if (otherUid) {
          updateData[`unreadCount.${otherUid}`] = increment(1);
        }

        await updateDoc(chatDocRef, updateData);
        if (type === "text") setNewMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        if (trackSendingState) setSendingMessage(false);
      }
    },
    [user?.uid, chatId, profile?.displayName]
  );

  // Operator actions
  const updateJobStatus = async (newStatus: JobStatus) => {
    if (!job) return;
    try {
      // ── Guard: photo proof required before completing ──────────────────────
      if (newStatus === "completed" && !completionPhoto && !job.completionPhotoUrl) {
        alert("You must submit photo proof before completing the job. Please upload a completion photo first.");
        return;
      }

      // ── Guard: one active job at a time on accept ──────────────────────────
      if (newStatus === "accepted") {
        if (!profile?.idVerified) {
          alert("ID verification is required before accepting a job.");
          return;
        }
        if (job.paymentMethod !== "cash" && !(await isStripeAccountReady(profile.stripeConnectAccountId))) {
          alert("Stripe setup is required for card-paid jobs. Cash jobs can be accepted without Stripe.");
          return;
        }
        const { getDocs: gd, query: q2, collection: col2, where: w2 } = await import("firebase/firestore");
        const activeSnap = await gd(q2(col2(db, "jobs"), w2("operatorId", "==", user?.uid), w2("status", "in", ["accepted", "en-route", "in-progress"])));
        const otherActive = activeSnap.docs.filter(d => d.id !== job.id);
        if (otherActive.length > 0) {
          alert("You already have an active job in progress. Please complete it before accepting another.");
          return;
        }
      }

      // ── Guard: payment must be made before proceeding past accepted (credit/e-transfer) ──
      if ((newStatus === "en-route" || newStatus === "in-progress" || newStatus === "completed") && job.paymentMethod !== "cash" && !["held", "paid"].includes(job.paymentStatus)) {
        setShowPaymentGateModal(true);
        return;
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      if (newStatus === "in-progress") {
        updateData.startTime = Timestamp.now();
      }
      if (newStatus === "completed") {
        updateData.completionTime = Timestamp.now();
        // Verify Stripe payment before completing (unless cash)
        if (job.stripePaymentIntentId) {
          const captureResult = await captureStripePaymentIfNeeded(job);
          if (captureResult.error) {
            alert(`Payment verification failed. ${captureResult.error}`);
            return;
          }
          if (captureResult.captured || job.paymentStatus === "paid" || job.paymentCapturedAt) {
            updateData.paymentStatus = "paid";
          }
        } else if (job.paymentMethod === "cash") {
          await cashPaymentAction("complete");
          return;
        } else {
          alert("A confirmed platform payment is required before completing this job.");
          return;
        }
      }

      await updateDoc(doc(db, "jobs", job.id), updateData);

      const statusLabels: Record<string, string> = {
        accepted: "accepted this job",
        "en-route": "is on the way",
        "in-progress": "has started snow removal",
        completed: "has completed the job",
        cancelled: "has cancelled the job",
      };

      // Send a single status-only message
      await sendMessage(
        `${profile?.displayName} ${statusLabels[newStatus] || `updated status to ${newStatus}`}`,
        "status-update",
        { newStatus }
      );

      if (newStatus === "accepted") {
        // Auto-send payment request to client when operator accepts
        if (job.paymentMethod !== "cash" && (job.paymentStatus === "pending" || job.paymentStatus === "refunded")) {
          await sendMessage(
            `${profile?.displayName} has accepted the job! Please pay $${job.price} CAD to confirm — funds are held securely by snowd.ca until job completion.`,
            "payment-request",
            { amount: job.price }
          );
        }
      }

      setShowMobileTasksSheet(false);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const cancelJob = async () => {
    if (!job?.id) return;
    if (job.status === "in-progress") {
      alert("This job cannot be cancelled after work has started.");
      return;
    }
    setShowCancelPopup(true);
  };

  const confirmCancelJob = async () => {
    if (!job?.id || job.status === "in-progress") return;
    setCancelling(true);
    const userRole = isOperator ? "operator" : "client";
    try {
      if (job.stripePaymentIntentId) {
        const response = await stripeConnectFetch("/api/stripe/cancel-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: job.stripePaymentIntentId }),
        });
        const result = await response.json();
        if (!response.ok || result.status !== "canceled") {
          throw new Error(result.error || "Could not release the payment hold. Please retry.");
        }
      }
      await updateDoc(doc(db, "jobs", job.id), {
        status: "cancelled",
        cancelledAt: Timestamp.now(),
        cancelledBy: user?.uid,
        updatedAt: Timestamp.now(),
      });
      await sendMessage(
        `${profile?.displayName} (${userRole}) has cancelled this job`,
        "status-update",
        { newStatus: "cancelled" }
      );
      setShowMobileTasksSheet(false);
      setShowCancelPopup(false);
    } catch (error) {
      console.error("Error cancelling job:", error);
      alert(error instanceof Error ? error.message : "Failed to cancel job. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // Rehire operator from a completed/cancelled chat
  const rehireOperator = async (cashAccepted = false) => {
    if (!job || !user?.uid || !otherUser?.uid || rehiring || rehireSent) return;
    if (job.paymentMethod === "cash" && job.status === "completed" && job.paymentStatus === "pending") {
      setCashError("Settle this job's cash payment before booking again in this conversation.");
      setShowMobileTasksSheet(true);
      return;
    }
    setRehiring(true);
    try {
      const { addDoc: ad, collection: col, Timestamp: Ts } = await import("firebase/firestore");
      const bookingOperator = isOperator ? profile : otherUser;
      if (!bookingOperator?.idVerified) throw new Error("The operator must verify their ID before receiving jobs.");
      const operatorRequiresCard = canAcceptPlatformPayments(bookingOperator) && (bookingOperator.stripeEnabledJobsOnly ?? true);

      if (!operatorRequiresCard && !cashAccepted) {
        setQuickCommConfirmation({ title: "Book a cash-only job?", confirmLabel: "Agree & request help", message: `Pay $${(job.price || 0).toFixed(2)} directly to the operator after the work. No card will be charged.`, onConfirm: () => rehireOperator(true) });
        return;
      }

      // Create a new job with the same details
      const newJobRef = await ad(col(db, "jobs"), {
        clientId: isOperator ? otherUser.uid : user.uid,
        operatorId: isOperator ? user.uid : otherUser.uid,
        status: "pending",
        serviceTypes: job.serviceTypes || [],
        propertySize: job.propertySize || "medium",
        address: job.address || "",
        city: job.city || "",
        province: job.province || "",
        postalCode: job.postalCode || "",
        specialInstructions: job.specialInstructions || "",
        scheduledDate: Ts.now(),
        scheduledTime: "ASAP",
        estimatedDuration: job.estimatedDuration || 60,
        price: job.price || 0,
        paymentMethod: operatorRequiresCard ? "credit" : "cash",
        requiresCardPayment: operatorRequiresCard,
        cashPaymentAcknowledged: !operatorRequiresCard,
        paymentStatus: "pending",
        chatId: chatId,
        createdAt: Ts.now(),
        updatedAt: Ts.now(),
      });

      // Update chat to reference new job and mark rehire as sent
      await updateDoc(doc(db, "chats", chatId), {
        jobId: newJobRef.id,
        lastMessage: "New job request created",
        lastMessageTime: Ts.now(),
        rehireSent: true,
      });
      setRehireSent(true);

      await sendMessage(
        `${profile?.displayName} has requested a new job! Same service, same location.${operatorRequiresCard ? "" : " Cash only: pay the operator directly after the work. No card will be charged."}`,
        "system"
      );

    } catch (error) {
      console.error("Error rehiring:", error);
      alert("Failed to create new job. Please try again.");
    } finally {
      setRehiring(false);
    }
  };

  // Reopen a cancelled job within 5-minute window
  const reopenJob = async () => {
    if (!job?.id) return;
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        status: "pending",
        cancelledAt: null,
        cancelledBy: null,
        updatedAt: Timestamp.now(),
      });
      await sendMessage(
        `${profile?.displayName} has reopened the job`,
        "status-update",
        { newStatus: "pending" }
      );
    } catch (error) {
      console.error("Error reopening job:", error);
      alert("Failed to reopen job. Please try again.");
    }
  };

  // Check if within 5-min reopen window
  const [reopenTimeLeft, setReopenTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (job?.status !== "cancelled" || !job?.cancelledAt) {
      setReopenTimeLeft(null);
      return;
    }
    const cancelledAt = job.cancelledAt;
    const cancelledDate = cancelledAt instanceof Date
      ? cancelledAt
      : typeof cancelledAt === "object" && cancelledAt !== null && "toDate" in cancelledAt
      ? (cancelledAt as unknown as Timestamp).toDate()
      : new Date(cancelledAt as unknown as string);
    
    const calcRemaining = () => {
      const elapsed = Date.now() - cancelledDate.getTime();
      const remaining = 5 * 60 * 1000 - elapsed; // 5 minutes
      return remaining > 0 ? remaining : 0;
    };

    setReopenTimeLeft(calcRemaining());
    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setReopenTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [job?.status, job?.cancelledAt]);

  const sendEtaUpdate = async (minutes: number) => {
    await sendMessage(`Estimated arrival: ${minutes} minutes`, "eta-update", {
      eta: minutes,
    });
    setShowMobileTasksSheet(false);
  };

  const cashPaymentAction = async (action: "defer" | "complete" | "refund") => {
    if (!job || cashActionBusy) return;
    setCashActionBusy(true); setCashError("");
    try {
      const response = await stripeConnectFetch("/api/jobs/cash-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: job.id, action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update cash payment.");
      setShowCashPayment(false);
      setShowMobileTasksSheet(true);
    } catch (error) {
      setCashError(error instanceof Error ? error.message : "Could not update cash payment.");
      setShowMobileTasksSheet(true);
    } finally { setCashActionBusy(false); }
  };

  const confirmCashReceived = async () => {
    if (!job || confirmingCash) return;
    setConfirmingCash(true); setCashError("");
    try {
      const response = await stripeConnectFetch("/api/jobs/confirm-cash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: job.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not confirm cash received.");
      if (!result.alreadyConfirmed) await sendMessage(`Cash payment of $${job.price} CAD received and confirmed by ${profile?.displayName || "the operator"}. No card was charged.`, "payment", { amount: job.price });
    } catch (error) { setCashError(error instanceof Error ? error.message : "Could not confirm cash received."); }
    finally { setConfirmingCash(false); }
  };

  const requestQuickCommConfirmation = (confirmation: QuickCommConfirmation) => {
    setQuickCommConfirmation(confirmation);
  };

  const captureStripePaymentIfNeeded = async (activeJob: Job) => {
    if (!activeJob.stripePaymentIntentId) {
      return { captured: false, skipped: true };
    }

    if (activeJob.paymentStatus === "paid" || activeJob.paymentCapturedAt) {
      return { captured: false, skipped: true };
    }

    if (activeJob.paymentStatus !== "held") {
      return { captured: false, skipped: false, error: "Payment is not in a hold state yet." };
    }

    try {
      const response = await stripeConnectFetch("/api/stripe/capture-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: activeJob.stripePaymentIntentId }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "succeeded") {
        return { captured: false, skipped: false, error: data.error || "Payment capture has not succeeded." };
      }

      return { captured: true, skipped: false };
    } catch {
      return { captured: false, skipped: false, error: "Unable to capture payment. Please retry." };
    }
  };

  // Stripe payment initiation
  const initiatePayment = async () => {
    if (job?.paymentMethod === "cash") { setShowCashPayment(true); return; }
    if (!job) return;
    setProcessingPayment(true);
    try {
      // Check if operator has a Stripe Connect account
      let operatorStripeAccountId = null;
      if (otherUser && isOperator === false) {
        const opData = otherUser as UserProfile & { stripeConnectAccountId?: string };
        operatorStripeAccountId = opData.stripeConnectAccountId || null;
      }

      const response = await stripeConnectFetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: job.price,
          jobId: job.id,
          clientId: job.clientId,
          operatorId: job.operatorId,
          description: `Snow removal - ${job.serviceTypes?.join(", ")} at ${job.address}`,
          operatorStripeAccountId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to initiate payment");
      }
      if (data.error) throw new Error(data.error);
      setClientSecret(data.clientSecret);
      setShowCheckout(true);
    } catch (error) {
      console.error("Payment initiation error:", error);
      const message = error instanceof Error ? error.message : "Failed to initiate payment. Please try again.";
      alert(message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!job) return;
    try {
      const response = await stripeConnectFetch("/api/stripe/payment-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      });
      const result = await response.json();
      if (!response.ok || !["held", "paid"].includes(result.paymentStatus)) {
        throw new Error(result.error || "Your payment is still processing. Please check again shortly.");
      }
      await sendMessage(
        `Payment of $${job.price} CAD has been securely held by snowd.ca. Funds will be released when the job is completed and verified.`,
        "payment",
        { amount: job.price, paymentIntentId }
      );
      setShowCheckout(false);
      setClientSecret(null);
    } catch (error) {
      console.error("Payment recording error:", error);
      throw error;
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job) return;
    setUploadingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Could not read the photo."));
        reader.readAsDataURL(file);
      });
      await updateDoc(doc(db, "jobs", job.id), {
        completionPhotoUrl: base64,
        updatedAt: Timestamp.now(),
      });
      setCompletionPhoto(base64);
      await sendMessage(
        `${profile?.displayName} submitted completion photo proof.`,
        "completion-photo",
        { completionPhotoUrl: base64 }
      );
    } catch (error) {
      console.error("Photo upload error:", error);
      alert("Could not save photo proof. Please try again.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // Chat photo upload (send image in chat)
  const handleChatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await sendMessage("Sent a photo", "image", { imageUrl: base64 });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Chat photo upload error:", error);
    } finally {
      e.target.value = "";
    }
  };

  const stopVoiceRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const startVoiceRecorder = async () => {
    try {
      if (typeof window === "undefined" || !("MediaRecorder" in window)) {
        alert("Voice recording is not supported on this device.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecordingVoice(false);

        const streamToStop = recordingStreamRef.current;
        if (streamToStop) {
          streamToStop.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
        }

        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) return;

        const durationMs = Math.max(1000, Date.now() - recordingStartedAtRef.current);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const audioUrl = reader.result as string;
          await sendMessage("Sent a voice clip", "voice", { audioUrl, durationMs });
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecordingVoice(true);
    } catch (error) {
      console.error("Voice recorder start error:", error);
      alert("Microphone access was denied or unavailable.");
    }
  };

  // Check if user already submitted a review for this job
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!job?.id || !user?.uid || job.status !== "completed") return;
      try {
        const { getDocs: gd, query: q, collection: col, where: w } = await import("firebase/firestore");
        const reviewsQuery = q(
          col(db, "reviews"),
          w("jobId", "==", job.id),
          w("clientId", "==", isOperator ? otherUser?.uid : user.uid)
        );
        const snap = await gd(reviewsQuery);
        if (!snap.empty) {
          setReviewSubmitted(true);
        }
      } catch {}
    };
    checkExistingReview();
  }, [job?.id, job?.status, user?.uid, isOperator, otherUser?.uid]);

  // Submit a review
  const submitReview = async () => {
    if (!job || !user?.uid || !otherUser?.uid || reviewRating === 0) return;
    
    // Validation: if rating is lower than 3 stars, description is required
    if (reviewRating < 3 && !reviewComment.trim()) {
      alert("Please add a description for ratings below 3 stars.");
      return;
    }
    
    setSubmittingReview(true);

    try {
      await addDoc(collection(db, "reviews"), {
        jobId: job.id,
        reviewerId: user.uid,
        revieweeId: otherUser.uid,
        clientId: isOperator ? otherUser.uid : user.uid,
        operatorId: isOperator ? user.uid : otherUser.uid,
        reviewerRole: profile?.role || "client",
        rating: reviewRating,
        comment: reviewComment,
        createdAt: Timestamp.now(),
      });

      // Update the reviewee's rating/reviewCount
      const revieweeDoc = await getDoc(doc(db, "users", otherUser.uid));
      if (revieweeDoc.exists()) {
        const data = revieweeDoc.data();
        const currentRating = data.rating || 0;
        const currentCount = data.reviewCount || 0;
        const newCount = currentCount + 1;
        const newRating = (currentRating * currentCount + reviewRating) / newCount;

        await updateDoc(doc(db, "users", otherUser.uid), {
          rating: Math.round(newRating * 10) / 10,
          reviewCount: newCount,
        });
      }

      // Send a system message about the review
      await sendMessage(
        `${profile?.displayName} left a ${reviewRating}-star review.`,
        "system"
      );

      setReviewSubmitted(true);
      setReviewRating(0);
      setReviewComment("");
    } catch (error) {
      console.error("Review submission error:", error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingMessage) return;
    sendMessage(newMessage);
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!sendingMessage && !isRecordingVoice && newMessage.trim()) {
        sendMessage(newMessage);
      }
    }
  };

  const handleOpenCameraUpload = () => {
    if (typeof window === "undefined") return;

    const createGuestUploadLink = async (): Promise<string> => {
      if (!chatId) return "";

      try {
        setCreatingGuestUploadLink(true);
        const response = await fetch("/api/mobile-upload/session/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = (await response.json()) as { sessionId?: string; error?: string };
        if (!response.ok || !data.sessionId) {
          throw new Error(data.error || "Failed to create temporary upload link");
        }

        const path = `/mobile-upload?session=${encodeURIComponent(data.sessionId)}`;
        setGuestUploadPath(path);
        setGuestUploadSessionId(data.sessionId);

        const origin = mobileOrigin || window.location.origin;
        return `${origin}${path}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create temporary upload link";
        alert(message);
        return "";
      } finally {
        setCreatingGuestUploadLink(false);
      }
    };

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    void (async () => {
      if (isMobileDevice) {
        chatCameraInputRef.current?.click();
        return;
      }

      const targetUrl = await createGuestUploadLink();
      if (!targetUrl) return;

      setShowCameraQrModal(true);
    })();
  };

  // Report / File Claim
  const submitReport = async () => {
    if (!user?.uid || !otherUser || !reportDescription.trim()) return;
    setSubmittingReport(true);
    try {
      await addDoc(collection(db, "claims"), {
        claimantId: user.uid,
        claimantRole: profile?.role === "operator" ? "operator" : "client",
        againstId: otherUser.uid,
        claimantName: profile?.displayName || "User",
        title: reportType.replace("-", " "),
        jobId: job?.id || "",
        chatId,
        type: reportType,
        description: reportDescription.trim(),
        status: "open",
        photoUrls: [],
        adminNotes: "",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await sendMessage(
        `A report has been filed. Our admin team will review this shortly.`,
        "system"
      );
      setShowReportModal(false);
      setReportDescription("");
    } catch (error) {
      console.error("Error submitting report:", error);
    } finally {
      setSubmittingReport(false);
    }
  };

  const formatTimestamp = (ts: unknown): string => {
    if (!ts) return "";
    try {
      if (ts instanceof Date) return format(ts, "h:mm a");
      if (typeof ts === "object" && ts !== null && "toDate" in ts)
        return format((ts as Timestamp).toDate(), "h:mm a");
      if (typeof ts === "string") return format(new Date(ts), "h:mm a");
      if (typeof ts === "object" && ts !== null && "seconds" in ts)
        return format(new Date((ts as { seconds: number }).seconds * 1000), "h:mm a");
    } catch {}
    return "";
  };

  const getMessageDate = (ts: unknown): Date | null => {
    if (!ts) return null;
    try {
      if (ts instanceof Date) return ts;
      if (typeof ts === "object" && ts !== null && "toDate" in ts) {
        return (ts as Timestamp).toDate();
      }
      if (typeof ts === "string") return new Date(ts);
      if (typeof ts === "object" && ts !== null && "seconds" in ts) {
        return new Date((ts as { seconds: number }).seconds * 1000);
      }
    } catch {}
    return null;
  };

  const formatMessageDay = (ts: unknown): string => {
    const date = getMessageDate(ts);
    if (!date) return "";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  const quickReplies = React.useMemo(() => {
    if (isOperator) {
      return ["On my way now", "I just arrived", "I will send a photo when finished"];
    }

    return ["Thanks for the update", "Please let me know when you arrive", "I will keep an eye out"];
  }, [isOperator]);

  const latestOwnMessageId = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].senderId === user?.uid) return messages[i].id;
    }
    return null;
  }, [messages, user?.uid]);

  // Message rendering
  const renderMessage = (msg: ChatMessage) => {
    const isOwn = msg.senderId === user?.uid;
    const showDeliveryState = isOwn && latestOwnMessageId === msg.id;
    const isSystem =
      msg.type === "system" ||
      msg.type === "eta-update" ||
      msg.type === "payment" ||
      msg.type === "payment-request";

    // Image message
    if (msg.type === "image" && msg.metadata?.imageUrl) {
      return (
        <div
          key={msg.id}
          className={`mb-4 flex ${isOwn ? "justify-end" : "justify-start"} chat-bubble`}
        >
          {!isOwn && otherUser && (
            <Link href={`/dashboard/u/${msg.senderId}`} className="shrink-0 mr-2 self-end">
              <div className="w-7 h-7 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-semibold text-xs hover:ring-2 hover:ring-[var(--accent)]/30 transition">
                {otherUser.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            </Link>
          )}
          <div className={`max-w-[72%] overflow-hidden rounded-[1.4rem] ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`}>
            <img
              src={msg.metadata.imageUrl}
              alt="Shared photo"
              className="max-h-80 w-full cursor-pointer rounded-[1.4rem] object-cover shadow-[var(--surface-shadow)]"
              onClick={() => window.open(msg.metadata!.imageUrl!, "_blank")}
            />
            <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isOwn ? "justify-end text-[var(--text-muted)]" : "text-[var(--text-muted)]"}`}>
              <span>{formatTimestamp(msg.createdAt)}</span>
              {showDeliveryState && (
                <span className={`font-semibold ${msg.read ? "text-emerald-600" : "text-[var(--text-muted)]"}`}>
                  {msg.read ? "Read" : "Sent"}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === "voice" && msg.metadata?.audioUrl) {
      return (
        <div
          key={msg.id}
          className={`mb-4 flex ${isOwn ? "justify-end" : "justify-start"} chat-bubble`}
        >
          <div
            className={`max-w-[78%] rounded-[1.4rem] border px-3 py-2.5 shadow-[var(--surface-shadow)] ${
              isOwn
                ? "border-[var(--ink)] bg-[var(--ink)] text-white rounded-tr-sm"
                : "border-[var(--border-color)] bg-white rounded-tl-sm"
            }`}
          >
            <audio controls preload="metadata" className="w-full h-10">
              <source src={msg.metadata.audioUrl} />
            </audio>
            <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${isOwn ? "text-white/65" : "text-[var(--text-muted)]"}`}>
              <span>{msg.metadata.durationMs ? `${Math.max(1, Math.round(msg.metadata.durationMs / 1000))}s` : "Voice"}</span>
              <span>{formatTimestamp(msg.createdAt)}</span>
              {showDeliveryState && (
                <span className={`font-semibold ${isOwn && msg.read ? "text-emerald-600" : ""}`}>
                  {msg.read ? "Read" : "Sent"}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Progress update widget — clean centered status chip
    if (msg.type === "progress-update" || msg.type === "status-update") {
      const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
        accepted:    { label: "Job Accepted",      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
        "en-route":  { label: "Operator En Route", color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
        "in-progress":{ label: "Work In Progress",  color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
        completed:   { label: "Job Completed",     color: "text-green-700",   bg: "bg-green-50 border-green-200" },
        cancelled:   { label: "Job Cancelled",     color: "text-red-700",     bg: "bg-red-50 border-red-200" },
      };
      const statusValue = msg.metadata?.newStatus || "accepted";
      const meta = statusMeta[statusValue] || statusMeta.accepted;

      return (
        <div key={msg.id} className="my-4 flex justify-center chat-bubble">
          <div className={`${meta.bg} flex items-center gap-2 rounded-full border px-4 py-1.5`}>
            <CheckCircle className={`w-3.5 h-3.5 ${meta.color}`} />
            <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
            <span className="text-[10px] text-gray-400">{formatTimestamp(msg.createdAt)}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "completion-photo") {
      return (
        <div key={msg.id} className="my-4 flex justify-center chat-bubble">
          <div className="w-full max-w-[300px] rounded-[1.4rem] border border-green-100 bg-white p-4 shadow-[var(--surface-shadow)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Completion Photo</p>
                <p className="text-xs text-gray-500">{formatTimestamp(msg.createdAt)}</p>
              </div>
            </div>
            {msg.metadata?.completionPhotoUrl && (
              <img
                src={msg.metadata.completionPhotoUrl}
                alt="Job completion"
                className="w-full rounded-xl cursor-pointer object-cover"
                style={{ maxHeight: 200 }}
                onClick={() => window.open(msg.metadata!.completionPhotoUrl!, "_blank")}
              />
            )}
            <p className="text-xs text-green-700 font-medium mt-2">{msg.content}</p>
          </div>
        </div>
      );
    }

    if (isSystem) {
      const isPay = msg.type === "payment" || msg.type === "payment-request";
      return (
        <div key={msg.id} className="my-3 flex justify-center chat-bubble">
          {isPay ? (
            <div className={`w-full max-w-[300px] rounded-[1.4rem] border bg-white p-4 shadow-[var(--surface-shadow)] ${
              msg.type === "payment" ? "border-green-100" : "border-amber-100"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.type === "payment" ? (
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  </div>
                )}
                <span className={`text-sm font-semibold ${msg.type === "payment" ? "text-green-800" : "text-amber-800"}`}>
                  {msg.type === "payment" ? "Payment Update" : "Payment Request"}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{msg.content}</p>
              {msg.type === "payment-request" && !isOperator && job?.paymentMethod !== "cash" && (job?.paymentStatus === "pending" || job?.paymentStatus === "refunded") && (
                <button
                  onClick={initiatePayment}
                  disabled={processingPayment}
                    className="mt-3 w-full rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
                  >
                  {processingPayment ? "Processing..." : `Pay $${job?.price} CAD Now`}
                </button>
              )}
              <p className="text-[10px] text-gray-400 mt-2 text-right">{formatTimestamp(msg.createdAt)}</p>
            </div>
          ) : (
            <div className="rounded-full bg-[var(--bg-secondary)] px-3 py-1.5">
              <span className="text-xs text-[var(--text-muted)]">
                {msg.type === "eta-update" && <><Clock className="w-3 h-3 inline mr-1" />{msg.content}</>}
                {msg.type !== "eta-update" && msg.content}
              </span>
            </div>
          )}
        </div>
      );
    }
    // Regular text message with clickable avatar
    return (
      <div key={msg.id} className={`mb-2 flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} chat-bubble`}>
        {!isOwn && otherUser && (
          <Link href={`/dashboard/u/${msg.senderId}`} className="hidden shrink-0 sm:block">
            <UserAvatar
              photoURL={(otherUser as unknown as Record<string, string>)?.avatar}
              role={otherUser.role}
              displayName={otherUser.displayName}
              size={28}
            />
          </Link>
        )}
        <div
          className={`max-w-[82%] px-4 py-3 rounded-[1.2rem] shadow-[var(--surface-shadow)] sm:max-w-[72%] ${
            isOwn
              ? "bg-[var(--ink)] text-white rounded-br-sm border border-[var(--ink)]"
              : "bg-white text-[var(--text-primary)] rounded-bl-sm border-[3px] border-[var(--border-color)]"
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
          <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isOwn ? "justify-end text-white/65" : "justify-end text-[var(--text-muted)]"}`}>
            <span>{formatTimestamp(msg.createdAt)}</span>
            {showDeliveryState && (
              <span className={`font-semibold ${isOwn && msg.read ? "text-emerald-600" : ""}`}>
                {msg.read ? "Read" : "Sent"}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-[var(--text-muted)] gap-3">
        <div className="animate-spin-slow">
          <Image src="/logo.png" alt="Loading" width={40} height={40} style={{ width: "auto", height: "auto" }} />
        </div>
        <p>Loading conversation...</p>
      </div>
    );
  }


  return (
    <div className="chat-workspace flex w-full min-h-0 gap-0">
      {/* Chat Column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-y border-r border-[var(--border-color)] bg-[var(--bg-card-solid)] xl:border-l">
        {/* Chat Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border-soft)] bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
          <Link
            href="/dashboard/messages"
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Back to messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button type="button" onClick={() => { setRightPanelView("profile"); setShowMobileTasksSheet(true); }} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`View ${otherUser?.displayName || "user"} profile details`}>
            <span className="hidden sm:block"><UserAvatar photoURL={(otherUser as unknown as Record<string, string> | null)?.avatar} role={otherUser?.role} displayName={otherUser?.displayName} size={44} /></span>
            <span className="min-w-0"><span className="block truncate font-semibold">{otherUser?.displayName || "User"}</span><span className="block truncate text-xs text-[var(--text-muted)]">{[otherUser?.city, otherUser?.province].filter(Boolean).join(", ") || "View profile"}</span></span>
          </button>
          <SupportChatButton inline />
          {job && (
            <div className="hidden lg:block">
              <StatusBadge status={job.status} />
            </div>
          )}
          <button
            onClick={() => setShowReportModal(true)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
            title="Report / File Claim"
            aria-label="Report issue"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>

        {job && (
          <button type="button" onClick={() => { setRightPanelView("updates"); setShowMobileTasksSheet(true); }} className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-secondary)] px-4 py-3 text-left text-sm">
            <span className="min-w-0 break-words"><span className="font-semibold capitalize">{job.status.replaceAll("-", " ")}</span> · ${job.price} CAD{job.paymentMethod === "cash" ? " · Cash only" : " · Card"}{job.eta ? ` · ETA ${job.eta} min` : ""}</span>
            <span className="shrink-0 font-semibold underline underline-offset-4">Job details</span>
          </button>
        )}

        {/* Messages */}
        <div role="log" aria-label="Conversation" className="chat-history min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain bg-[var(--bg-primary)] p-3 sm:p-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-[var(--text-muted)]">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[var(--border-soft)] bg-white shadow-[var(--surface-shadow)]">
                <MessageSquare className="h-7 w-7 text-[var(--ink)]" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Start the conversation</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">Share arrival details, photos, and job updates here.</p>
            </div>
          )}
          {messages.map((message, index) => {
            const currentDay = formatMessageDay(message.createdAt);
            const previousDay = index > 0 ? formatMessageDay(messages[index - 1].createdAt) : "";
            const showDayBreak = currentDay && currentDay !== previousDay;

            return (
              <React.Fragment key={message.id}>
                {showDayBreak && (
                  <div className="sticky top-2 z-10 my-3 flex justify-center">
                    <span className="rounded-full border-[3px] border-[var(--border-soft)] bg-white px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] shadow-[var(--surface-shadow)] backdrop-blur">
                      {currentDay}
                    </span>
                  </div>
                )}
                {renderMessage(message)}
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-[var(--border-soft)] bg-white/95 px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 shadow-[var(--surface-shadow)] backdrop-blur sm:px-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <input
            ref={chatAttachInputRef}
            type="file"
            accept="image/*"
            onChange={handleChatPhotoUpload}
            className="hidden"
          />
          <input
            ref={chatCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChatPhotoUpload}
            className="hidden"
          />

          <details className="chat-tools mb-2">
            <summary className="cursor-pointer rounded-lg px-2 py-2 text-sm font-medium">Photos & quick replies</summary>
            <div className="flex flex-wrap gap-2 py-2">
              <button type="button" onClick={() => chatAttachInputRef.current?.click()} className="rounded-xl border px-3 py-2 text-sm"><Paperclip className="mr-1 inline h-4 w-4" />Attach photo</button>
              <button type="button" onClick={handleOpenCameraUpload} disabled={creatingGuestUploadLink} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"><Camera className="mr-1 inline h-4 w-4" />{creatingGuestUploadLink ? "Opening camera…" : "Take photo"}</button>
              {quickReplies.map(reply => <button key={reply} type="button" onClick={(event) => { setNewMessage(reply); event.currentTarget.closest("details")?.removeAttribute("open"); composerRef.current?.focus(); }} className="rounded-xl border px-3 py-2 text-sm">{reply}</button>)}
            </div>
          </details>
          {isRecordingVoice && <p role="status" className="mb-2 text-sm font-semibold text-red-600">Recording… Tap stop to send your voice message.</p>}
          <form onSubmit={handleSubmit} className="flex items-end gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-1.5">
            <textarea
              ref={composerRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              aria-label="Message"
              placeholder="Type a message..."
              rows={1}
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl bg-transparent px-3 py-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)] focus:bg-white"
            />
            {newMessage.trim() && !isRecordingVoice ? (
              <button
                type="submit"
                disabled={sendingMessage}
                aria-label={sendingMessage ? "Sending message" : "Send message"}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-semibold">
                  {sendingMessage ? "Sending" : "Send"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isRecordingVoice) {
                    stopVoiceRecorder();
                  } else {
                    void startVoiceRecorder();
                  }
                }}
                className={`min-h-11 rounded-xl px-3 transition ${isRecordingVoice ? "bg-red-500 text-white" : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border)]"}`}
                title={isRecordingVoice ? "Stop recording" : "Record voice"}
              >
                {isRecordingVoice ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
          </form>
          <p className="mt-1.5 hidden text-center text-[11px] text-[var(--text-muted)] xl:block">
            Press Enter to send. Shift + Enter adds a line.
          </p>
        </div>
      </div>

      <Modal isOpen={showMobileTasksSheet && !showCashPayment && !showCancelPopup && !quickCommConfirmation && !showMapModal && !showCheckout && !showPaymentGateModal && !showReportModal && !showCameraQrModal} onClose={() => setShowMobileTasksSheet(false)} title="Conversation details" size="lg">
        <div className="chat-details">
            <div className="mb-4 flex items-center gap-2 rounded-xl border-[3px] border-[var(--border-soft)] bg-[var(--bg-secondary)] p-1">
              <button
                type="button"
                onClick={() => { setRightPanelView("updates"); setShowMobileTasksSheet(true); }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  rightPanelView === "updates" ? "bg-white text-[var(--text-primary)] shadow-[var(--surface-shadow)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Updates
              </button>
              <button
                type="button"
                onClick={() => { setRightPanelView("profile"); setShowMobileTasksSheet(true); }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  rightPanelView === "profile" ? "bg-white text-[var(--text-primary)] shadow-[var(--surface-shadow)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Profile
              </button>
            </div>

            {rightPanelView === "updates" && job && (
              <>
        {job?.paymentMethod === "cash" && <section className="mb-4 rounded-2xl bg-[#eaf1ee] p-4 text-sm">
          <h3 className="text-base font-semibold">{job.paymentStatus === "paid" ? "Cash received" : job.paymentStatus === "refunded" ? "Cash refunded" : job.status === "completed" ? "Work complete · cash payment pending" : "Cash payment pending"}</h3>
          <p className="mt-2">{job.paymentStatus === "paid" ? `The operator confirmed $${job.price} CAD in cash. Your receipt is in Payments.` : job.paymentStatus === "refunded" ? "The operator recorded a cash refund. The job remains open until completed or cancelled." : `Pay $${job.price} CAD directly to the operator ${job.status === "completed" ? "now that the work is complete" : "when the work is done"}. This is not a prepaid job.`}</p>
          {isOperator && job.paymentStatus !== "paid" && job.status !== "cancelled" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-900">You are responsible for collecting cash. No advance payment is held through Stripe, so travelling and working before payment is at your own risk. You can complete the work while payment remains pending.</p>}
          {!isOperator && job.paymentStatus !== "paid" && job.status !== "cancelled" && <button onClick={initiatePayment} className="btn-primary mt-4 w-full px-4 py-3">{job.status === "completed" ? "Pay cash · view instructions" : job.cashPaymentDeferredAt ? "View pending cash payment" : "Pay cash after the job"}</button>}
          {isOperator && job.paymentStatus === "paid" && !["completed", "cancelled"].includes(job.status) && <button disabled={cashActionBusy} onClick={() => requestQuickCommConfirmation({ title: "Record cash refund?", message: `Only confirm after returning $${job.price} CAD to the client in cash. This records the refund; it does not transfer money or cancel the job.`, confirmLabel: "Cash returned to client", onConfirm: () => cashPaymentAction("refund") })} className="btn-secondary mt-4 w-full px-4 py-3">Record cash refund</button>}
          {!isOperator && job.paymentStatus === "paid" && !["completed", "cancelled"].includes(job.status) && <button onClick={() => requestQuickCommConfirmation({ title: "Request cash refund?", message: "This asks the operator to return your cash. They must return the money directly and record the refund. The job stays open until cancelled or completed.", confirmLabel: "Send refund request", onConfirm: () => sendMessage(`Please return my $${job.price} CAD cash payment and record the refund. The work is not completed.`, "payment") })} className="btn-secondary mt-4 w-full px-4 py-3">Request cash refund</button>}
          {job.paymentStatus !== "paid" && ["pending", "accepted", "en-route"].includes(job.status) && <button onClick={cancelJob} className="mt-3 w-full rounded-xl px-4 py-3 font-semibold text-red-700">Cancel job</button>}
          {isOperator && ["in-progress", "completed"].includes(job.status) && job.paymentStatus !== "paid" && <button disabled={confirmingCash} onClick={() => requestQuickCommConfirmation({ title: "Confirm cash received?", message: `Confirm only after you have received $${job.price} CAD from the client. This records a cash receipt for both of you.`, confirmLabel: "Yes, cash received", onConfirm: confirmCashReceived })} className="mt-4 w-full rounded-full bg-[#17251e] px-4 py-3 font-semibold text-white disabled:opacity-50">{confirmingCash ? "Confirming…" : "Confirm cash received"}</button>}
          {cashError && <p role="alert" className="mt-3 text-red-700">{cashError}</p>}
        </section>}

                        {/* Review Prompt — Auto-shows when job is completed */}
        {job?.status === "completed" && !reviewSubmitted && (
          <div className="bg-yellow-50 border-x border-[var(--border)] px-4 py-4 border-t border-yellow-200">
            <div className="text-center mb-3">
              <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">
                How was your experience with {otherUser?.displayName || "them"}?
              </p>
              <p className="text-xs text-gray-500">Your review helps the community</p>
            </div>
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  aria-label={`Rate ${star} out of 5`}
                  onClick={() => setReviewRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= reviewRating
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {reviewRating > 0 && (
              <div className="space-y-2">
                <textarea
                  value={reviewComment}
                  aria-label="Review comment"
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={reviewRating < 3 ? "Please describe what went wrong (required)..." : "Add a comment (optional)..."}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none ${
                    reviewRating < 3 ? "border-red-300" : "border-gray-200"
                  }`}
                />
                {reviewRating < 3 && !reviewComment.trim() && (
                  <p className="text-xs text-red-600">* Description required for ratings below 3 stars</p>
                )}
                <button
                  onClick={submitReview}
                  disabled={submittingReview}
                  className="w-full px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold text-sm hover:bg-yellow-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            )}
          </div>
        )}
        {job?.status === "completed" && reviewSubmitted && (
          <div className="bg-green-50 border-x border-[var(--border)] px-4 py-3 border-t border-green-200 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Thank you for your review!</span>
            </div>
          </div>
        )}

        {/* Client cancel button for pending jobs */}
        {!isOperator && ["pending", "accepted", "en-route"].includes(job?.status || "") && job?.paymentStatus !== "paid" && (
          <div className="bg-gray-50 border-x border-gray-100 px-4 py-3 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Cancel this job?</p>
                <p className="text-xs text-gray-600">You can cancel until the operator starts the work.</p>
              </div>
              <button
                onClick={cancelJob}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold text-sm transition flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel Job
              </button>
            </div>
          </div>
        )}

        {/* Client payment banner */}
        {!isOperator && job?.paymentMethod !== "cash" && job?.status === "accepted" && (job?.paymentStatus === "pending" || job?.paymentStatus === "refunded") && (
          <div className="bg-yellow-50 border-x border-yellow-100 px-4 py-3 border-t border-yellow-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Pay ${job.price} CAD to confirm</p>
                  <p className="text-xs text-yellow-600">Funds held securely until job completion</p>
                </div>
              </div>
              <button
                onClick={initiatePayment}
                disabled={processingPayment}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--accent-dark)] transition disabled:opacity-50 flex items-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <Image src="/logo.png" alt="Loading" width={16} height={16} className="animate-spin-slow" style={{ width: "auto", height: "auto" }} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Completed Job — Rehire option (clients only, once) */}
        {job?.status === "completed" && reviewSubmitted && !isOperator && !rehireSent && (
          <div className="bg-[var(--accent)]/5 border-x border-[var(--accent)]/10 px-4 py-3 border-t border-[var(--accent)]/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Job Complete</p>
                <p className="text-xs text-gray-500">Need this service again?</p>
              </div>
              <button
                onClick={() => rehireOperator()}
                disabled={rehiring}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--accent-dark)] transition flex items-center gap-2 disabled:opacity-50"
              >
                <Briefcase className="w-4 h-4" />
                {rehiring ? "Creating..." : "Rehire"}
              </button>
            </div>
          </div>
        )}

        {/* Cancelled Job — Clients can reopen within 5 min, or either side can rehire. Operators cannot reopen. */}
        {job?.status === "cancelled" && (
          <div className="bg-red-50 border-x border-red-100 px-4 py-3 border-t border-red-200">
            {/* Only clients can reopen within 5-minute window */}
            {!isOperator && reopenTimeLeft !== null && reopenTimeLeft > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-red-800">Job Cancelled</p>
                  <p className="text-xs text-red-600">
                    Reopen within {Math.floor(reopenTimeLeft / 60000)}:{String(Math.floor((reopenTimeLeft % 60000) / 1000)).padStart(2, "0")}
                  </p>
                </div>
                <button
                  onClick={reopenJob}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--accent-dark)] transition flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Reopen Job
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-red-800">Job Cancelled</p>
                  {!isOperator && (
                    <p className="text-xs text-red-600">Want to start a new job?</p>
                  )}
                </div>
                {!isOperator && !rehireSent && (
                  <button
                    onClick={() => rehireOperator()}
                    disabled={rehiring}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--accent-dark)] transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Briefcase className="w-4 h-4" />
                    {rehiring ? "Creating..." : "Rehire"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}


                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Work order progress</h3>
            <ProgressTracker
              status={job.status}
              paymentMethod={job.paymentMethod}
              paymentStatus={job.paymentStatus as "pending" | "held" | "paid" | "refunded" | undefined}
            />

            {/* Operator Update Buttons */}
            {isOperator && job.status !== "completed" && job.status !== "cancelled" && (
              <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Update Progress</p>
                {job.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateJobStatus("accepted")}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition shadow-[var(--surface-shadow)]"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => updateJobStatus("cancelled")}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                )}
                {job.status === "accepted" && (
                  <>
                    <button
                      onClick={() => updateJobStatus("en-route")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-bold hover:bg-[var(--accent-dark)] transition shadow-[var(--surface-shadow)]"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Mark En Route
                    </button>
                    <button
                      onClick={cancelJob}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel Job
                    </button>
                  </>
                )}
                {job.status === "en-route" && (
                  <>
                    <button
                      onClick={() => updateJobStatus("in-progress")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-bold hover:bg-[var(--accent-dark)] transition shadow-[var(--surface-shadow)]"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Job
                    </button>
                    <button
                      onClick={() => updateJobStatus("accepted")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Go Back
                    </button>
                    <button
                      onClick={cancelJob}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel Job
                    </button>
                  </>
                )}
                {job.status === "in-progress" && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-bold hover:bg-[var(--accent-dark)] transition shadow-[var(--surface-shadow)] disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" /> {uploadingPhoto ? "Uploading..." : job.completionPhotoUrl || completionPhoto ? "Update Photo Proof" : "Submit Photo Proof"}
                    </button>
                    {(job.completionPhotoUrl || completionPhoto) && (
                      <button
                        disabled={cashActionBusy}
                        onClick={() => job.paymentMethod === "cash" && job.paymentStatus !== "paid" ? requestQuickCommConfirmation({ title: "Complete work with payment pending?", message: `The client will be notified to pay $${job.price} CAD in cash. You remain responsible for collecting it; no Stripe prepayment is held.`, confirmLabel: "Complete work · cash still due", onConfirm: () => updateJobStatus("completed") }) : updateJobStatus("completed")}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition shadow-[var(--surface-shadow)]"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> {job.paymentMethod === "cash" ? "Complete work order" : "Complete & release payment"}
                      </button>
                    )}
                    <button
                      onClick={() => updateJobStatus("en-route")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Go Back
                    </button>
                  </>
                )}
              </div>
            )}

            {isOperator && (job.status === "accepted" || job.status === "en-route") && (
              <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">Send arrival time</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      requestQuickCommConfirmation({
                        title: "Send ETA update?",
                        message: "This will message the client that your estimated arrival is 10 minutes.",
                        confirmLabel: "Send 10m ETA",
                        onConfirm: () => sendEtaUpdate(10),
                      });
                    }}
                    className="flex items-center justify-center gap-1 rounded-xl bg-[var(--bg-secondary)] px-2 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border)]"
                  >
                    10 min
                  </button>
                  <button
                    onClick={() => {
                      requestQuickCommConfirmation({
                        title: "Send ETA update?",
                        message: "This will message the client that your estimated arrival is 20 minutes.",
                        confirmLabel: "Send 20m ETA",
                        onConfirm: () => sendEtaUpdate(20),
                      });
                    }}
                    className="flex items-center justify-center gap-1 rounded-xl bg-[var(--bg-secondary)] px-2 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border)]"
                  >
                    20 min
                  </button>
                  <button
                    onClick={() => {
                      requestQuickCommConfirmation({
                        title: "Send ETA update?",
                        message: "This will message the client that your estimated arrival is 30 minutes.",
                        confirmLabel: "Send 30m ETA",
                        onConfirm: () => sendEtaUpdate(30),
                      });
                    }}
                    className="flex items-center justify-center gap-1 rounded-xl bg-[var(--bg-secondary)] px-2 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border)]"
                  >
                    30 min
                  </button>
                </div>
                {job.paymentMethod !== "cash" && job.status === "accepted" && (job.paymentStatus === "pending" || job.paymentStatus === "refunded") && (
                  <button
                    onClick={() => {
                      requestQuickCommConfirmation({
                        title: "Send payment request?",
                        message: `This will ask the client to pay $${job.price} CAD for this job.`,
                        confirmLabel: "Send Request",
                        onConfirm: async () => {
                          await sendMessage(
                            `${profile?.displayName} is requesting payment of $${job.price} CAD for this job. Tap Pay Now to hold funds securely with snowd.ca.`,
                            "payment-request",
                            { amount: job.price }
                          );
                        },
                      });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Request Payment
                  </button>
                )}
              </div>
            )}

            <dl className="mt-4 space-y-3 border-t border-[var(--border)] pt-4 text-sm">
              <div><dt className="font-semibold">Scheduled</dt><dd>{formatMessageDay(job.scheduledDate) || "Date to be confirmed"}{job.scheduledTime ? ` · ${job.scheduledTime}` : ""}</dd></div>
              {job.specialInstructions && <div><dt className="font-semibold">Special instructions</dt><dd className="whitespace-pre-wrap">{job.specialInstructions}</dd></div>}
              <div><dt className="font-semibold">Property size</dt><dd className="capitalize">{job.propertySize?.replaceAll("-", " ") || "Not specified"}</dd></div>
            </dl>

            {/* Job summary */}
            <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border-[3px] border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {isOperator ? "Job price" : "Price"}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-[var(--accent)]" />
                    <span className="text-lg font-bold text-[var(--ink)]">{job.price}</span>
                    <span className="text-xs text-[var(--text-muted)]">CAD</span>
                  </div>
                </div>
                <div className="rounded-xl border-[3px] border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Payment</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-[var(--ink)]">{job.paymentStatus}</p>
                </div>
                <div className="rounded-xl border-[3px] border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Service</p>
                  <p className="mt-1 break-words text-sm font-semibold capitalize text-[var(--ink)]">
                    {job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ") || "Service"}
                  </p>
                </div>
                <div className="rounded-xl border-[3px] border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Distance</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                    {distance !== null ? `${distance.toFixed(1)} km` : "Unknown"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="mt-2 flex w-full items-center gap-2 rounded-xl border-[3px] border-[var(--border)] bg-white px-3 py-2.5 text-left text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)]"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 break-words">{job.address}, {job.city}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>

                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <button
                    type="button"
                    onClick={() => { setRightPanelView("profile"); setShowMobileTasksSheet(true); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border)]"
                  >
                    <User className="w-3.5 h-3.5" /> View profile details
                  </button>
                </div>
              </>
            )}

            {rightPanelView === "profile" && otherUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    photoURL={(otherUser as unknown as Record<string, string>)?.avatar}
                    role={otherUser.role}
                    displayName={otherUser.displayName}
                    size={48}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">{otherUser.displayName}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{otherUser.role}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="rounded-xl border-[3px] border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Location</p>
                    <p className="text-[var(--ink)]">{otherUser.city}, {otherUser.province}</p>
                  </div>
                  {distance !== null && (
                    <div className="rounded-xl border-[3px] border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Distance</p>
                      <p className="text-[var(--ink)]">{distance.toFixed(1)} km away</p>
                    </div>
                  )}
                  {otherUser.phone && (
                    <div className="rounded-xl border-[3px] border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Phone</p>
                      <p className="text-[var(--ink)]">{otherUser.phone}</p>
                    </div>
                  )}
                </div>
                <Link
                  href={`/dashboard/u/${otherUser.uid}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-semibold hover:bg-[var(--accent-dark)] transition"
                >
                  Open Full Profile <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {rightPanelView === "profile" && !otherUser && (
              <p className="text-sm text-[var(--text-muted)]">Profile info unavailable.</p>
            )}
        </div>
      </Modal>

      <Modal isOpen={showCashPayment && !showCancelPopup} onClose={() => { if (!cashActionBusy) setShowCashPayment(false); }} title="Cash payment" size="sm">
        <p className="text-2xl font-semibold">${job?.price} CAD</p>
        <p className="mt-3 text-sm leading-6">{job?.status === "completed" ? "The work is complete. Pay the operator directly in cash. Payment remains pending until they confirm receipt." : "Pay the operator directly after the work. Confirming below records payment as pending; no money is charged or held."}</p>
        {cashError && <p role="alert" className="mt-3 text-sm text-red-700">{cashError}</p>}
        {job && !["completed", "cancelled"].includes(job.status) && job.paymentStatus !== "paid" && <button disabled={cashActionBusy} onClick={() => cashPaymentAction("defer")} className="btn-primary mt-5 w-full px-4 py-3">{cashActionBusy ? "Saving…" : "Confirm · pay cash after work"}</button>}
        <button disabled={cashActionBusy} onClick={() => { setShowCashPayment(false); setShowMobileTasksSheet(false); }} className="btn-secondary mt-3 w-full px-4 py-3">Return to job</button>
        {job && !["completed", "cancelled"].includes(job.status) && job.paymentStatus !== "paid" && <button disabled={cashActionBusy} onClick={() => { setShowCashPayment(false); cancelJob(); }} className="mt-2 w-full rounded-xl px-4 py-3 font-semibold text-red-700">Cancel job before payment</button>}
      </Modal>

      {/* Cancellation Popup */}
      <CancellationPopup
        isOpen={showCancelPopup}
        onCancel={() => setShowCancelPopup(false)}
        onConfirm={confirmCancelJob}
        loading={cancelling}
        title="Cancel this job?"
        message={`This will cancel the ${job?.serviceTypes?.map(s => s.replace("-", " ")).join(", ") || "snow removal"} job at ${job?.address || "this address"}. ${job?.paymentMethod === "cash" ? "No card will be charged. Any cash already exchanged must be settled directly with the operator." : `Any held payment of $${job?.price || 0} will be released.`}`}
      />

      <Modal isOpen={!!quickCommConfirmation} onClose={() => setQuickCommConfirmation(null)} title={quickCommConfirmation?.title} size="sm">
        <p className="text-sm leading-6 text-[var(--text-muted)]">{quickCommConfirmation?.message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setQuickCommConfirmation(null)} className="btn-secondary px-4 py-3">Cancel</button>
          <button type="button" onClick={async () => {
            const action = quickCommConfirmation?.onConfirm;
            setQuickCommConfirmation(null);
            await action?.();
          }} className="btn-primary px-4 py-3">{quickCommConfirmation?.confirmLabel}</button>
        </div>
      </Modal>

      {/* Report / Claim Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-lg">Report Issue</h3>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500">
              File a report about {otherUser?.displayName}. Our admin team will review this.
            </p>
            <div>
              <label className="text-xs text-gray-500 font-medium">Issue Type</label>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value as ClaimType)}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              >
                <option value="property-damage">Property Damage</option>
                <option value="incomplete-job">Incomplete Job</option>
                <option value="misconduct">Misconduct</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Description</label>
              <textarea
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                rows={4}
                placeholder="Describe the issue in detail..."
              />
            </div>
            <button
              onClick={submitReport}
              disabled={submittingReport || !reportDescription.trim()}
              className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
            >
              {submittingReport ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      )}

      {/* Payment Gate Modal — shown when operator tries to go en-route without client payment */}
      {showPaymentGateModal && job && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentGateModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-[var(--surface-shadow)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Payment Not Yet Received</h3>
                <p className="text-xs text-gray-500">Client hasn&apos;t paid for this job</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              The client needs to pay <span className="font-bold text-gray-900">${job.price} CAD</span> before you can proceed. Send them a payment request so funds are held securely.
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  requestQuickCommConfirmation({
                    title: "Send payment request?",
                    message: `This will ask the client to pay $${job.price} CAD before the job starts.`,
                    confirmLabel: "Send Request",
                    onConfirm: async () => {
                      await sendMessage(
                        `${profile?.displayName} is requesting payment of $${job.price} CAD before starting the job. Please pay to confirm — funds are held securely by snowd.ca until completion.`,
                        "payment-request",
                        { amount: job.price }
                      );
                      setShowPaymentGateModal(false);
                    },
                  });
                }}
                className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--accent-dark)] transition flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Send Payment Request to Client
              </button>
              <button
                onClick={() => setShowPaymentGateModal(false)}
                className="w-full py-2.5 text-gray-500 text-sm font-medium hover:text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showMapModal && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4" onClick={() => setShowMapModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-[var(--surface-shadow)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Job Address</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{mapAddress || "Address unavailable"}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[45dvh] min-h-[160px] bg-[#EFF4FB] overflow-hidden">
              {mapStaticUrl ? (
                <img
                  src={mapStaticUrl}
                  alt="Google Maps address preview"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                  Map preview unavailable
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--border-soft)] flex items-center justify-end">
              <button
                type="button"
                onClick={() => window.open(`https://maps.google.com/?q=${mapQuery}`, "_blank", "noopener,noreferrer")}
                className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-dark)] inline-flex items-center gap-1.5"
              >
                Open Full Map <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraQrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCameraQrModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-[var(--surface-shadow)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--ink)]">Send Photo From Phone</h3>
              <button
                type="button"
                onClick={() => setShowCameraQrModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">Scan on your phone, take one photo, and keep this window open until the upload appears in chat.</p>
            <div className="mt-4 rounded-xl border-[3px] border-[var(--border)] bg-[#F8FAFD] p-3 flex items-center justify-center">
              {primaryGuestUploadUrl ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(primaryGuestUploadUrl)}`}
                  alt="QR code for mobile camera upload"
                  className="w-[240px] h-[240px]"
                />
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Preparing temporary link...</p>
              )}
            </div>
            {guestUploadUrls.length > 1 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Try another link</p>
                {guestUploadUrls.map((url, index) => (
                  <div key={url} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedGuestUploadUrl(url)}
                      className={`flex-1 text-left truncate px-2.5 py-2 rounded-lg border text-xs ${
                        primaryGuestUploadUrl === url
                          ? "border-[var(--accent)] bg-[var(--bg-secondary)] text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--ink)] hover:bg-[#F3F8FF]"
                      }`}
                      title={url}
                    >
                      Link {index + 1}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(url);
                          alert(`Link ${index + 1} copied.`);
                        } catch {
                          alert("Could not copy link.");
                        }
                      }}
                      className="px-2.5 py-2 rounded-lg border-[3px] border-[var(--border)] text-xs text-[var(--accent)] hover:bg-[#F3F8FF]"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              {primaryGuestUploadUrl ? (
                <a
                  href={primaryGuestUploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-dark)]"
                >
                  Open Link
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-[#A8BCEB] text-white text-sm font-semibold cursor-not-allowed"
                >
                  Open Link
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(primaryGuestUploadUrl);
                    alert("Mobile upload link copied.");
                  } catch {
                    alert("Could not copy link. Use Open Link instead.");
                  }
                }}
                disabled={!primaryGuestUploadUrl}
                className="px-3 py-2.5 rounded-xl border-[3px] border-[var(--border)] text-[var(--accent)] text-sm font-semibold hover:bg-[#F3F8FF]"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Checkout Modal */}
      {showCheckout && clientSecret && job && (
        <StripeCheckout
          clientSecret={clientSecret}
          amount={job.price}
          onSuccess={handlePaymentSuccess}
          onCancel={() => {
            setShowCheckout(false);
            setClientSecret(null);
          }}
        />
      )}
    </div>
  );
}
