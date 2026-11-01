"use client";
import IconSwap from "@/components/ui/IconSwap";


import { dateMillis, isOpenOrder, orderNumber } from "@/lib/workOrders";
import { buildTimeline } from "@/lib/messageTimeline";
import { OrderChatEnd, OrderChatPinned, OrderChatWidget } from "@/components/work-orders/OrderChatWidget";
import orderChatStyles from "@/components/work-orders/order-chat.module.css";
import { orderRequest } from "@/components/work-orders/OrderActions";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";

import CancellationPopup from "@/components/CancellationPopup";
import StatusBadge from "@/components/StatusBadge";
import StripeCheckout from "@/components/StripeCheckout";
import SupportChatButton from "@/components/SupportChatButton";
import Notification from "@/components/Notification";
import Modal from "@/components/ui/Modal";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { sendAdminNotif } from "@/lib/adminNotifications";
import {
ChatMessage,
ClaimType,
Job,
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
where,
writeBatch
} from "firebase/firestore";
import {
AlertTriangle,
Archive,
ArchiveRestore,
ArrowLeft,
CheckCheck,
Briefcase,
Camera,
CheckCircle,
Clock,
CreditCard,
DollarSign,
ExternalLink,
MessageSquare,
Mic,
MoreHorizontal,
Paperclip,
Phone,
Send,
Shield,
Square,
Star,
X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams,useRouter } from "next/navigation";
import React,{ useCallback,useEffect,useRef,useState } from "react";
import "./chat.css";
import ConversationLoading from "@/components/ConversationLoading";
import { useArchivedChats } from "@/hooks/useArchivedChats";
import { formatPhone, hasCompletedJobWith, telHref } from "@/lib/contacts";

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
  const router = useRouter();
  const { user, profile } = useAuth();
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const notify = useCallback((message: string, type: "success" | "error" | "info" = "error") => setFeedback({ message, type }), []);
  const [sendError, setSendError] = useState("");
  const [chatLoadError, setChatLoadError] = useState("");
  const [messageLoadError, setMessageLoadError] = useState("");
  const sendingLock = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [linkedJobs, setLinkedJobs] = useState<Job[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [showMobileTasksSheet, setShowMobileTasksSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
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
  const [stripeAccount, setStripeAccount] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Photo upload state
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


  // Cancellation popup state
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelling, setCancelling] = useState(false);


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
  const mapAddress = [job?.address, job?.city, job?.province].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent(mapAddress || "Canada");
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapStaticUrl = mapsApiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${mapQuery}&zoom=15&size=1200x600&scale=2&maptype=roadmap&markers=color:0x2F6FED|${mapQuery}&key=${mapsApiKey}`
    : null;
  const guestUploadUrls = React.useMemo(() => guestUploadPath
    ? (mobileOrigins.length ? mobileOrigins : [mobileOrigin || ""]).filter(Boolean).map((origin) => `${origin}${guestUploadPath}`)
    : [], [guestUploadPath, mobileOrigins, mobileOrigin]);
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

  // Fetch chat, linked work orders, and other user data
  useEffect(() => {
    let unsubscribeJobs: (() => void) | undefined;
    let cancelled = false;

    const fetchChatData = async () => {
      if (!chatId || !user?.uid) return;
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (cancelled) return;

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          // Per-order chats were merged into one chat per contact.
          if (chatData.mergedInto) {
            router.replace(`/dashboard/messages/${chatData.mergedInto}${window.location.hash}`);
            return;
          }
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

          // Rules need an ownership constraint; filtering by chat alone cannot
          // prove that every possible result belongs to the signed-in user.
          const jobsQuery = query(collection(db, "jobs"),
            where(profile?.role === "operator" ? "operatorId" : "clientId", "==", user.uid),
            where("chatId", "==", chatId));
          unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
            const jobs = snapshot.docs
              .map((jobDoc) => ({ id: jobDoc.id, ...jobDoc.data() } as Job))
              .sort((a, b) => dateMillis(a.createdAt) - dateMillis(b.createdAt));
            setChatLoadError("");
            setLinkedJobs(jobs);
            // Payment, cash and review flows act on the newest open order, else the newest order.
            setJob(jobs.filter(isOpenOrder).at(-1) || jobs.at(-1) || null);
          }, (error) => {
            console.error("Work orders listener error:", error);
            setChatLoadError("Visit updates couldn’t load. Reload to try again.");
          });
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
        if (!cancelled) setChatLoadError("This conversation couldn’t load. Reload to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchChatData();

    return () => {
      cancelled = true;
      unsubscribeJobs?.();
    };
  }, [chatId, user?.uid, profile?.role, router]);

  const openJobs = React.useMemo(() => linkedJobs.filter(isOpenOrder), [linkedJobs]);
  const { isArchived, setChatArchived } = useArchivedChats();
  const chatArchived = isArchived(chatId);
  // Numbers are only shared after a completed job between the two of them.
  const callHref = otherUser && hasCompletedJobWith(linkedJobs, otherUser.uid) ? telHref(otherUser.phone) : "";
  const timeline = React.useMemo(() => buildTimeline(messages, linkedJobs), [messages, linkedJobs]);
  const scrollToOrder = (jobId: string) => {
    setShowMobileTasksSheet(false);
    document.getElementById(`order-${jobId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  // Links from work orders land on that order's card (/dashboard/messages/{chat}#order-{job}).
  // Until a newer message arrives, the order card keeps the view instead of the latest message.
  const landedOnOrder = useRef<number | null>(null);
  const landingOnOrder = () => typeof window !== "undefined" && window.location.hash.startsWith("#order-");
  useEffect(() => {
    if (landedOnOrder.current !== null || !landingOnOrder() || loading || !linkedJobs.length || !messages.length) return;
    landedOnOrder.current = messages.length;
    setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" }), 50);
  }, [loading, linkedJobs.length, messages.length]);

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
        setMessageLoadError("");
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
            setMessageLoadError("");
          }, () => setMessageLoadError("Messages couldn’t load. Reload to try again."));
        } else {
          setMessageLoadError("Messages couldn’t load. Reload to try again.");
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
    if (landingOnOrder() && (landedOnOrder.current === null || messages.length <= landedOnOrder.current)) return;
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
      if (trackSendingState && sendingLock.current) return;
      if (trackSendingState) { sendingLock.current = true; setSendingMessage(true); setSendError(""); }

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
        const activeOrder = openJobs.at(-1);
        if (activeOrder) messageData.jobId = activeOrder.id;
        if (metadata !== undefined) messageData.metadata = metadata;

        const chatDocRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatDocRef);
        const chatData = chatSnap.data();
        const otherUid = chatData?.participants?.find(
          (p: string) => p !== user.uid
        );

        const isPersonMessage = ["text", "image", "voice"].includes(type);
        const updateData: Record<string, unknown> = { lastActivityTime: Timestamp.now() };

        if (isPersonMessage) {
          updateData.lastMessage = type === "text" ? content : `[${type.replace("-", " ")}]`;
          updateData.lastMessageTime = Timestamp.now();
        }

        if (otherUid && isPersonMessage) {
          updateData[`unreadCount.${otherUid}`] = increment(1);
        }

        const batch = writeBatch(db);
        batch.set(doc(collection(db, "messages")), messageData);
        batch.update(chatDocRef, updateData);
        await batch.commit();
        if (type === "text") setNewMessage(current => current === content ? "" : current);
        if (type === "text") {
          void sendAdminNotif({
            type: "system",
            title: "New job message",
            message: content,
            senderName: profile?.displayName || "User",
            chatLabel: `Job chat · ${activeOrder?.orderNumber || chatId.slice(0, 8)}`,
            preview: content,
            chatId,
            uid: user.uid,
            meta: { path: "/admin/chats", jobId: activeOrder?.id || "" },
          });
          void user.getIdToken().then((token) => fetch("/api/notifications/message", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ chatId, message: content, senderName: profile?.displayName || "User" }),
          })).catch(() => {});
        }


      } catch (error) {
        console.error("Error sending message:", error);
        if (trackSendingState) setSendError("Message wasn’t sent. Your draft is safe. Try sending again.");
        else notify("Could not send this update. Please try again.");
      } finally {
        if (trackSendingState) { sendingLock.current = false; setSendingMessage(false); }
      }
    },
    [user, chatId, profile?.displayName, openJobs, notify]
  );

  // Operator actions
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
          notify("Photo uploaded successfully.", "success");
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
  }, [showCameraQrModal, guestUploadSessionId, sendMessage, notify]);

  const confirmCancelJob = async () => {
    if (!job?.id) return;
    setCancelling(true);
    try {
      const result = await orderRequest("/api/jobs/cancel", { jobId: job.id });
      if (result.warning) notify(result.warning, "info");
      setShowMobileTasksSheet(false);
      setShowCancelPopup(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to cancel job. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const cancelJob = async () => {
    if (!job?.id) return;
    if (job.status === "in-progress") {
      notify("This job cannot be cancelled after work has started.");
      return;
    }
    setShowCancelPopup(true);
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
      setStripeAccount(data.stripeAccount || null);
      setClientSecret(data.clientSecret);
      setShowCheckout(true);
    } catch (error) {
      console.error("Payment initiation error:", error);
      const message = error instanceof Error ? error.message : "Failed to initiate payment. Please try again.";
      notify(message);
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
        notify("Voice recording is not supported on this device.");
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
      notify("Microphone access was denied or unavailable.");
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
      notify("Please add a description for ratings below 3 stars.");
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
        notify(message);
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
              <UserAvatar photoURL={(otherUser as unknown as Record<string, string>)?.avatar} logoURL={(otherUser as unknown as Record<string, string>)?.logoUrl} role={otherUser.role} displayName={otherUser.displayName} size={28} />
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
                <span className={`inline-flex items-center gap-1 font-semibold ${msg.read ? "text-emerald-600" : "text-[var(--text-muted)]"}`} aria-label={msg.read ? "Read receipt" : "Sent receipt"}>
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />{msg.read ? "Read" : "Sent"}
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
                <span className={`inline-flex items-center gap-1 font-semibold ${msg.read ? "text-emerald-300" : "text-white/65"}`} aria-label={msg.read ? "Read receipt" : "Sent receipt"}>
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />{msg.read ? "Read" : "Sent"}
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
                <p className="text-sm font-semibold text-gray-900">Completion photo</p>
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
                    className="mt-3 w-full btn-cta rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
              logoURL={(otherUser as unknown as Record<string, string>)?.logoUrl}
              role={otherUser.role}
              displayName={otherUser.displayName}
              size={28}
            />
          </Link>
        )}
        <div
          data-sender={isOwn ? "self" : "other"}
          className={`message-surface max-w-[82%] px-4 py-3 rounded-[1.2rem] shadow-[var(--surface-shadow)] sm:max-w-[72%] ${
            isOwn
              ? "bg-[var(--accent)] text-white rounded-br-sm border border-[var(--accent)]"
              : "bg-white text-[var(--text-primary)] rounded-bl-sm border-[3px] border-[var(--border-color)]"
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
          <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isOwn ? "justify-end text-white/65" : "justify-end text-[var(--text-muted)]"}`}>
            <span>{formatTimestamp(msg.createdAt)}</span>
            {showDeliveryState && (
              <span className={`inline-flex items-center gap-1 font-semibold ${msg.read ? "text-emerald-300" : "text-white/65"}`} aria-label={msg.read ? "Read receipt" : "Sent receipt"}>
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />{msg.read ? "Read" : "Sent"}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <ConversationLoading />;
  }


  return (
    <div className="chat-workspace flex w-full min-h-0 gap-0">
      {feedback && <Notification message={feedback.message} type={feedback.type} onClose={() => setFeedback(null)} />}
      {/* Chat Column */}
      <div className="conversation-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-y border-r border-[var(--border-color)] bg-[var(--bg-card-solid)] xl:border-l">
        {/* Chat Header */}
        <div className="conversation-header flex shrink-0 items-center gap-3 border-b border-[var(--border-soft)] bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
          <Link
            href="/dashboard/messages"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Back to messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button type="button" onClick={() => { setRightPanelView("profile"); setShowMobileTasksSheet(true); }} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`View ${otherUser?.displayName || "user"} profile details`}>
            <UserAvatar photoURL={(otherUser as unknown as Record<string, string> | null)?.avatar} logoURL={(otherUser as unknown as Record<string, string> | null)?.logoUrl} role={otherUser?.role} displayName={otherUser?.displayName} size={40} />
            <span className="min-w-0"><span className="block truncate font-semibold">{otherUser?.displayName || "User"}</span><span className="block truncate text-xs text-[var(--text-muted)]">{[otherUser?.city, otherUser?.province].filter(Boolean).join(", ") || "View profile"}</span></span>
          </button>
          {callHref
            ? <a href={callHref} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border-soft)] text-[#14734f] transition hover:bg-[var(--bg-secondary)]" aria-label={`Call ${otherUser?.displayName || "contact"} at ${formatPhone(otherUser?.phone)}`} title={formatPhone(otherUser?.phone)}><Phone className="h-5 w-5" /></a>
            : <span role="img" className="grid h-10 w-10 shrink-0 cursor-not-allowed place-items-center rounded-full border border-[var(--border-soft)] text-[#c3cbd0]" aria-label="Phone number shared after a completed job" title="Phone number shared after a completed job"><Phone className="h-5 w-5" /></span>}
          <button type="button" onClick={() => setChatArchived(chatId, !chatArchived).then(() => notify(chatArchived ? "Chat moved back to Messages." : "Chat archived.", "success"), () => notify("Could not update archive. Try again.", "error"))} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)]" aria-label={chatArchived ? "Unarchive chat" : "Archive chat"} title={chatArchived ? "Unarchive" : "Archive"}>
            {chatArchived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
          </button>
          <SupportChatButton inline />
          <button type="button" onClick={() => { setRightPanelView("updates"); setShowMobileTasksSheet(true); }} className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)]" aria-label="Conversation options">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <OrderChatPinned jobs={openJobs} uid={user?.uid || ""} />

        {(chatLoadError || messageLoadError) && <div role="alert" className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{chatLoadError || messageLoadError} <button type="button" className="min-h-11 font-semibold underline" onClick={() => window.location.reload()}>Reload</button></div>}
        {/* Messages */}
        <div role="log" aria-label="Conversation" className="chat-history min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain bg-[var(--bg-primary)] p-3 sm:p-5">
          {timeline.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-[var(--text-muted)]">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[var(--border-soft)] bg-white shadow-[var(--surface-shadow)]">
                <MessageSquare className="h-7 w-7 text-[var(--ink)]" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Start the conversation</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">Share arrival details, photos, and job updates here.</p>
            </div>
          )}
          {timeline.map((item, index) => {
            if (item.kind === "order-start")
              return <OrderChatWidget key={`start-${item.job.id}`} job={item.job} uid={user?.uid || ""} returnTo={`/dashboard/messages/${chatId}`} onUpdated={(message) => notify(message, "success")} />;
            if (item.kind === "order-end")
              return (
                <React.Fragment key={`end-${item.job.id}`}>
                  <OrderChatEnd job={item.job} />
                        {/* Review Prompt — Auto-shows when job is completed */}
        {item.job.id === job?.id && job?.status === "completed" && !reviewSubmitted && (
          <div className="guided-review">
            <div className="guided-review-heading">
              <span className="guided-review-icon"><Star size={18} aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  How was {otherUser?.displayName || "your shoveler"}?
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Rate your visit.</p>
              </div>
            </div>
            {/* Star Rating */}
            <div className="guided-review-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  aria-label={`Rate ${star} out of 5`}
                  onClick={() => setReviewRating(star)}
                  className="guided-review-star"
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
              <div className="guided-review-form">
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
        {item.job.id === job?.id && job?.status === "completed" && reviewSubmitted && (
          <div className="guided-review guided-review-complete" role="status">
            <span className="guided-success-icon"><CheckCircle size={16} aria-hidden="true" /></span>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Visit complete.</p>
              <p className="text-xs text-[var(--text-secondary)]">Thanks for helping your neighbourhood.</p>
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
              ><IconSwap icon={<X className="w-4 h-4" />}>
                <X className="w-4 h-4" />
                Cancel Job
              </IconSwap></button>
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

                  {item.job.id === job?.id && item.job.status !== "pending" && !isOperator && (
                    <div className="my-3 flex justify-center">
                      <Link href={`/dashboard/jobs/new?previousOrder=${item.job.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--bg-secondary)]">
                        <Briefcase className="h-4 w-4" aria-hidden="true" /> Book again
                      </Link>
                    </div>
                  )}
                </React.Fragment>
              );
            const message = item.message;
            const previous = timeline.slice(0, index).reverse().find((entry) => entry.kind === "message");
            const currentDay = formatMessageDay(message.createdAt);
            const previousDay = previous?.kind === "message" ? formatMessageDay(previous.message.createdAt) : "";
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
                <div className={item.job ? orderChatStyles.section : undefined} data-order={item.job?.id}>
                  {renderMessage(message)}
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="conversation-composer sticky bottom-0 z-20 shrink-0 border-t border-[var(--border-soft)] bg-white/95 px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 shadow-[var(--surface-shadow)] backdrop-blur sm:px-4">
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

          <div className="quick-replies" aria-label="Quick replies">{quickReplies.map(reply => <button key={reply} type="button" onClick={() => { setNewMessage(reply); composerRef.current?.focus(); }}>{reply}</button>)}</div>
          {isRecordingVoice && <p role="status" className="mb-2 text-sm font-semibold text-red-600">Recording… Tap stop to send your voice message.</p>}
          {sendError && <p role="alert" className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</p>}
          <form onSubmit={handleSubmit} className="flex items-end gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-1.5">
            <button type="button" onClick={() => chatAttachInputRef.current?.click()} className="min-h-11 rounded-xl px-2.5 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]" aria-label="Attach photo" title="Attach photo"><Paperclip className="h-5 w-5" /></button>
            <button type="button" onClick={handleOpenCameraUpload} disabled={creatingGuestUploadLink} className="min-h-11 rounded-xl px-2.5 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50" aria-label="Take photo" title="Take photo"><Camera className="h-5 w-5" /></button>
            <textarea
              ref={composerRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              aria-label="Message"
              placeholder="Type a message..."
              rows={1}
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl bg-transparent px-3 py-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            {newMessage.trim() && !isRecordingVoice ? (
              <button
                type="submit"
                disabled={sendingMessage}
                aria-label={sendingMessage ? "Sending message" : "Send message"}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-white transition hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-40"
              ><IconSwap icon={<Send className="w-5 h-5" />}>
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-semibold">
                  {sendingMessage ? "Sending" : "Send"}
                </span>
              </IconSwap></button>
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

      <Modal isOpen={showMobileTasksSheet && !showCashPayment && !showCancelPopup && !quickCommConfirmation && !showMapModal && !showCheckout && !showReportModal && !showCameraQrModal} onClose={() => setShowMobileTasksSheet(false)} title="Conversation details" size="lg">
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
              <section className="mb-4 rounded-2xl border border-[var(--border-color)] bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Work orders</h2>
                  </div>
                  <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-bold text-[var(--text-muted)]">{linkedJobs.length}</span>
                </div>
                <div className="space-y-2">
                  {[...linkedJobs].reverse().map((linkedJob) => (
                    <button
                      key={linkedJob.id}
                      type="button"
                      onClick={() => scrollToOrder(linkedJob.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left ${linkedJob.id === job.id ? "border-[var(--ink)] bg-[var(--bg-secondary)]" : "border-[var(--border-soft)] hover:bg-[var(--bg-secondary)]"}`}
                    >
                      <span className="flex items-center justify-between gap-2 text-xs font-semibold">
                        <span>Order #{orderNumber(linkedJob)}</span>
                        <StatusBadge status={linkedJob.status} />
                      </span>
                      <span className="mt-1 block text-xs capitalize text-[var(--text-muted)]">{linkedJob.serviceTypes?.[0]?.replaceAll("-", " ") || "Snow service"} · ${linkedJob.price} CAD</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {rightPanelView === "profile" && otherUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    photoURL={(otherUser as unknown as Record<string, string>)?.avatar}
                    logoURL={(otherUser as unknown as Record<string, string>)?.logoUrl}
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
                ><IconSwap icon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Full Profile <ExternalLink className="w-3.5 h-3.5" />
                </IconSwap></Link>
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
              ><IconSwap icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Open Full Map <ExternalLink className="w-3.5 h-3.5" />
              </IconSwap></button>
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
                          notify(`Link ${index + 1} copied.`, "success");
                        } catch {
                          notify("Could not copy link.");
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
                    notify("Mobile upload link copied.", "success");
                  } catch {
                    notify("Could not copy link. Use Open Link instead.");
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
          stripeAccount={stripeAccount}
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
