"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ChatMessage,
  Chat,
  Job,
  UserProfile,
  JobStatus,
  ClaimType,
} from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ProgressTracker from "@/components/ProgressTracker";
import StripeCheckout from "@/components/StripeCheckout";
import Image from "next/image";
import UserAvatar from "@/components/UserAvatar";
import {
  Send,
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  Navigation,
  Play,
  CreditCard,
  ChevronDown,
  Camera,
  Shield,
  X,
  Compass,
  Star,
  User,
  Flag,
  AlertTriangle,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import CancellationPopup from "@/components/CancellationPopup";

type ChatWithOtherUser = Chat & {
  otherUser?: UserProfile;
};

const formatChatTime = (ts: unknown): string => {
  if (!ts) return "";

  try {
    if (ts instanceof Date) return format(ts, "MMM d");
    if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      return format((ts as Timestamp).toDate(), "MMM d");
    }
    if (typeof ts === "string") return format(new Date(ts), "MMM d");
  } catch {
    return "";
  }

  return "";
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
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stripe state
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Photo upload state
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatPhotoInputRef = useRef<HTMLInputElement>(null);

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
  const [pendingStatus, setPendingStatus] = useState<JobStatus | null>(null);

  // Report / claim state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ClaimType>("other");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCameraQrModal, setShowCameraQrModal] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<"updates" | "profile">("updates");
  const [chatList, setChatList] = useState<ChatWithOtherUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatListLoading, setChatListLoading] = useState(true);

  const isOperator = profile?.role === "operator";
  const mobileCameraMode = searchParams.get("mobileCamera") === "1";
  const mapAddress = [job?.address, job?.city, job?.province].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent(mapAddress || "Canada");
  const mapLink = `https://maps.google.com/?q=${mapQuery}`;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapStaticUrl = mapsApiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${mapQuery}&zoom=15&size=1200x600&scale=2&maptype=roadmap&markers=color:0x2F6FED|${mapQuery}&key=${mapsApiKey}`
    : null;
  const mobileCameraUrl = `https://snowd.ca/dashboard/messages/${chatId}?mobileCamera=1`;

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
    const fetchChatData = async () => {
      if (!chatId || !user?.uid) return;
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          if (chatData.rehireSent) setRehireSent(true);
          const otherUid = chatData.participants?.find(
            (p: string) => p !== user.uid
          );

          if (otherUid) {
            const userDoc = await getDoc(doc(db, "users", otherUid));
            if (userDoc.exists()) {
              setOtherUser(userDoc.data() as UserProfile);
            }
          }

          if (chatData.jobId) {
            const unsubJob = onSnapshot(doc(db, "jobs", chatData.jobId), (jobDoc) => {
              if (jobDoc.exists()) {
                setJob({ id: jobDoc.id, ...jobDoc.data() } as Job);
              }
            });
            return () => unsubJob();
          }
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChatData();
  }, [chatId, user?.uid]);

  // Real-time messages listener
  useEffect(() => {
    if (!chatId) return;
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
          onSnapshot(fallbackQ, (snapshot) => {
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

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    setRightPanelView("updates");
  }, [chatId]);

  // Left-side conversations list for full Telegram-style layout.
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatWithOtherUser);

        list.sort((a, b) => {
          const aTime = a.lastMessageTime;
          const bTime = b.lastMessageTime;
          if (!aTime) return 1;
          if (!bTime) return -1;

          const aDate =
            aTime instanceof Date
              ? aTime
              : typeof aTime === "object" && "toDate" in aTime
              ? (aTime as Timestamp).toDate()
              : new Date(aTime as string);

          const bDate =
            bTime instanceof Date
              ? bTime
              : typeof bTime === "object" && "toDate" in bTime
              ? (bTime as Timestamp).toDate()
              : new Date(bTime as string);

          return bDate.getTime() - aDate.getTime();
        });

        const enriched = await Promise.all(
          list.map(async (chat) => {
            const otherUid = chat.participants.find((p) => p !== user.uid);
            if (!otherUid) return chat;

            try {
              const otherUserDoc = await getDoc(doc(db, "users", otherUid));
              if (otherUserDoc.exists()) {
                return {
                  ...chat,
                  otherUser: otherUserDoc.data() as UserProfile,
                };
              }
            } catch {
              // Keep chat row even if profile fetch fails.
            }

            return chat;
          })
        );

        setChatList(enriched);
        setChatListLoading(false);
      },
      () => setChatListLoading(false)
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredChatList = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return chatList;

    return chatList.filter((chat) => {
      const name = chat.otherUser?.displayName?.toLowerCase() || "";
      const preview = chat.lastMessage?.toLowerCase() || "";
      return name.includes(term) || preview.includes(term);
    });
  }, [chatList, searchTerm]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        const { getDocs: gd, query: q2, collection: col2, where: w2 } = await import("firebase/firestore");
        const activeSnap = await gd(q2(col2(db, "jobs"), w2("operatorId", "==", user?.uid), w2("status", "in", ["accepted", "en-route", "in-progress"])));
        const otherActive = activeSnap.docs.filter(d => d.id !== job.id);
        if (otherActive.length > 0) {
          alert("You already have an active job in progress. Please complete it before accepting another.");
          return;
        }
      }

      // ── Guard: payment must be made before proceeding past accepted (credit/e-transfer) ──
      if ((newStatus === "en-route" || newStatus === "in-progress" || newStatus === "completed") && job.paymentMethod !== "cash" && job.paymentStatus === "pending") {
        setPendingStatus(newStatus);
        setShowPaymentGateModal(true);
        return;
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      if (newStatus === "in-progress") {
        updateData.startTime = Timestamp.now();
        // Hold payment when job starts
        if (job.paymentStatus === "pending" && job.stripePaymentIntentId) {
          updateData.paymentStatus = "held";
        }
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
        } else if (job.paymentMethod === "cash" || !job.stripePaymentIntentId) {
          // Cash / e-transfer jobs — mark as paid directly
          updateData.paymentStatus = "paid";
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
        if (job.paymentMethod !== "cash" && job.paymentStatus === "pending") {
          await sendMessage(
            `${profile?.displayName} has accepted the job! Please pay $${job.price} CAD to confirm — funds are held securely by snowd.ca until job completion.`,
            "payment-request",
            { amount: job.price }
          );
        }
      }

      setShowActions(false);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const cancelJob = async () => {
    if (!job?.id) return;
    setShowCancelPopup(true);
  };

  const confirmCancelJob = async () => {
    if (!job?.id) return;
    setCancelling(true);
    const userRole = isOperator ? "operator" : "client";
    try {
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
      setShowActions(false);
      setShowCancelPopup(false);
    } catch (error) {
      console.error("Error cancelling job:", error);
      alert("Failed to cancel job. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // Rehire operator from a completed/cancelled chat
  const rehireOperator = async () => {
    if (!job || !user?.uid || !otherUser?.uid || rehiring || rehireSent) return;
    setRehiring(true);
    try {
      const { addDoc: ad, collection: col, Timestamp: Ts } = await import("firebase/firestore");
      const operatorStripeReady = Boolean(
        (otherUser as UserProfile & { stripeConnectAccountId?: string }).stripeConnectAccountId
      );
      const operatorRequiresCard =
        operatorStripeReady &&
        ((otherUser as UserProfile & { stripeEnabledJobsOnly?: boolean }).stripeEnabledJobsOnly ?? true);

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
        `${profile?.displayName} has requested a new job! Same service, same location.`,
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
    setShowActions(false);
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
      const response = await fetch("/api/stripe/capture-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: activeJob.stripePaymentIntentId }),
      });
      const data = await response.json();
      if (data.error) {
        return { captured: false, skipped: false, error: data.error as string };
      }

      await updateDoc(doc(db, "jobs", activeJob.id), {
        paymentStatus: "paid",
        paymentCapturedAt: Timestamp.now(),
        paymentCaptureAttempts: increment(1),
        updatedAt: Timestamp.now(),
      });

      return { captured: true, skipped: false };
    } catch {
      return { captured: false, skipped: false, error: "Unable to capture payment. Please retry." };
    }
  };

  // Stripe payment initiation
  const initiatePayment = async () => {
    if (!job) return;
    setProcessingPayment(true);
    try {
      // Check if operator has a Stripe Connect account
      let operatorStripeAccountId = null;
      if (otherUser && isOperator === false) {
        const opData = otherUser as UserProfile & { stripeConnectAccountId?: string };
        operatorStripeAccountId = opData.stripeConnectAccountId || null;
      }

      const response = await fetch("/api/stripe/create-payment-intent", {
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
      await updateDoc(doc(db, "jobs", job.id), {
        paymentStatus: "held",
        paymentMethod: "credit",
        stripePaymentIntentId: paymentIntentId,
        updatedAt: Timestamp.now(),
      });
      await sendMessage(
        `Payment of $${job.price} CAD has been securely held by snowd.ca. Funds will be released when the job is completed and verified.`,
        "payment",
        { amount: job.price, paymentIntentId }
      );
      setShowCheckout(false);
      setClientSecret(null);
    } catch (error) {
      console.error("Payment recording error:", error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setCompletionPhoto(base64);
        
        // Update job with photo and mark as completed
        await updateDoc(doc(db, "jobs", job.id), {
          completionPhotoUrl: base64,
          status: "completed",
          completionTime: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        // If payment was held via Stripe, capture it idempotently.
        if (job.stripePaymentIntentId) {
          const captureResult = await captureStripePaymentIfNeeded(job);
          if (captureResult.error) {
            console.error("Payment capture error:", captureResult.error);
          }
        } else if (!job.stripePaymentIntentId) {
          // Cash / e-transfer job — mark as paid directly
          await updateDoc(doc(db, "jobs", job.id), { paymentStatus: "paid" });
        }
        
        await sendMessage(
          `${profile?.displayName} submitted a completion photo for verification.`,
          "completion-photo",
          { completionPhotoUrl: base64 }
        );
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Photo upload error:", error);
      setUploadingPhoto(false);
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
    }
  };

  const confirmCompletionAndRelease = async () => {
    if (!job) return;
    try {
      const captureResult = await captureStripePaymentIfNeeded(job);
      if (captureResult.error) throw new Error(captureResult.error);

      await updateDoc(doc(db, "jobs", job.id), {
        paymentStatus: "paid",
        status: "completed",
        completionTime: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await sendMessage(
        `Payment of $${job.price} CAD has been released. Job completed successfully!`,
        "payment",
        { amount: job.price }
      );
    } catch (error) {
      console.error("Payment release error:", error);
      alert("Failed to release payment. Please try again.");
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

  const handleOpenCameraUpload = () => {
    if (typeof window === "undefined") return;
    const opened = window.open(mobileCameraUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = mobileCameraUrl;
    }
  };

  // Report / File Claim
  const submitReport = async () => {
    if (!user?.uid || !otherUser || !reportDescription.trim()) return;
    setSubmittingReport(true);
    try {
      await addDoc(collection(db, "claims"), {
        reporterId: user.uid,
        reportedId: otherUser.uid,
        jobId: job?.id || "",
        chatId,
        type: reportType,
        description: reportDescription.trim(),
        status: "open",
        photoUrls: [],
        adminNotes: "",
        createdAt: Timestamp.now(),
      });
      await sendMessage(
        `A report has been filed. Our admin team will review this shortly.`,
        "system"
      );
      setReportSubmitted(true);
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
          className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 chat-bubble`}
        >
          {!isOwn && otherUser && (
            <Link href={`/dashboard/u/${msg.senderId}`} className="shrink-0 mr-2 self-end">
              <div className="w-7 h-7 bg-[#2F6FED] rounded-full flex items-center justify-center text-white font-semibold text-xs hover:ring-2 hover:ring-[#2F6FED]/30 transition">
                {otherUser.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            </Link>
          )}
          <div
            className={`max-w-[70%] rounded-2xl overflow-hidden ${
              isOwn ? "rounded-br-md" : "rounded-bl-md"
            }`}
          >
            <img
              src={msg.metadata.imageUrl}
              alt="Shared photo"
              className="w-full max-h-80 object-cover cursor-pointer rounded-2xl"
              onClick={() => window.open(msg.metadata!.imageUrl!, "_blank")}
            />
            <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isOwn ? "justify-end text-[#6B7C8F]" : "text-[#6B7C8F]"}`}>
              <span>{formatTimestamp(msg.createdAt)}</span>
              {showDeliveryState && (
                <span className={`font-semibold ${msg.read ? "text-emerald-600" : "text-[#6B7C8F]"}`}>
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
        <div key={msg.id} className="flex justify-center my-4 chat-bubble">
          <div className={`${meta.bg} border rounded-full px-4 py-1.5 flex items-center gap-2`}>
            <CheckCircle className={`w-3.5 h-3.5 ${meta.color}`} />
            <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
            <span className="text-[10px] text-gray-400">{formatTimestamp(msg.createdAt)}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "completion-photo") {
      return (
        <div key={msg.id} className="flex justify-center my-4 chat-bubble">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 max-w-[280px] w-full">
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
        <div key={msg.id} className="flex justify-center my-3 chat-bubble">
          {isPay ? (
            <div className={`bg-white rounded-2xl shadow-sm border p-4 max-w-[280px] w-full ${
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
              {msg.type === "payment-request" && !isOperator && job?.paymentStatus === "pending" && (
                <button
                  onClick={initiatePayment}
                  disabled={processingPayment}
                  className="mt-3 w-full px-4 py-2.5 bg-[#2F6FED] text-white rounded-xl text-sm font-semibold hover:bg-[#2158C7] transition disabled:opacity-50"
                >
                  {processingPayment ? "Processing..." : `Pay $${job?.price} CAD Now`}
                </button>
              )}
              <p className="text-[10px] text-gray-400 mt-2 text-right">{formatTimestamp(msg.createdAt)}</p>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-gray-100 rounded-full">
              <span className="text-xs text-gray-500">
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
      <div
        key={msg.id}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1 chat-bubble`}
      >
        <div
          className={`max-w-[72%] px-3.5 py-2 rounded-2xl shadow-sm ${
            isOwn
              ? "bg-[#DCF8C6] text-[#102030] rounded-tr-sm border border-[#CDECB7]"
              : "bg-white text-gray-900 rounded-tl-sm border border-[#E2E8F0]"
          }`}
        >
          <p className="text-sm leading-relaxed">{msg.content}</p>
          <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isOwn ? "justify-end text-[#60737f]" : "justify-end text-gray-400"}`}>
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
      <div className="flex flex-col items-center justify-center h-96 text-[#6B7C8F] gap-3">
        <div className="animate-spin-slow">
          <Image src="/logo.png" alt="Loading" width={40} height={40} style={{ width: "auto", height: "auto" }} />
        </div>
        <p>Loading conversation...</p>
      </div>
    );
  }

  const otherUserId = otherUser?.uid || (messages.find((m) => m.senderId !== user?.uid)?.senderId);

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] gap-0 md:gap-4 md:items-stretch overflow-hidden min-h-0">
      {/* Left Column — Conversations */}
      <aside className="hidden md:flex flex-col w-[320px] shrink-0 min-h-0 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        <div className="px-3 py-3 border-b border-[#E2E8F0] bg-[#F4F4F5]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full bg-white border border-[#DCE3EC] rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatListLoading ? (
            <div className="p-4 text-sm text-slate-500">Loading chats...</div>
          ) : filteredChatList.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No conversations found.</div>
          ) : (
            <ul className="divide-y divide-[#EDF2F7]">
              {filteredChatList.map((chat) => {
                const unread = chat.unreadCount?.[user?.uid || ""] || 0;
                const title = chat.otherUser?.displayName || "User";
                const isActive = chat.id === chatId;

                return (
                  <li key={chat.id}>
                    <Link
                      href={`/dashboard/messages/${chat.id}`}
                      className={`block px-3 py-2.5 transition ${
                        isActive ? "bg-[#4A9BD6] text-white" : "hover:bg-[#F8FBFF]"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold shrink-0 border ${
                          isActive
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-[#EAF2FF] text-[#2F6FED] border-[#D8E7FF]"
                        }`}>
                          {title.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-slate-900"}`}>
                              {title}
                            </p>
                            <p className={`text-[11px] shrink-0 ${isActive ? "text-white/85" : "text-slate-400"}`}>
                              {formatChatTime(chat.lastMessageTime)}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`text-xs truncate ${isActive ? "text-white/90" : unread > 0 ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                              {chat.lastMessage || "No messages yet"}
                            </p>
                            {unread > 0 && (
                              <span className={`h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center ${isActive ? "bg-white text-[#2F6FED]" : "bg-[#3B82F6] text-white"}`}>
                                {unread > 9 ? "9+" : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card-solid)] shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        {/* Chat Header */}
        <div className="bg-[#F4F4F5] px-4 py-3 flex items-center gap-3 shrink-0 border-b border-[#DFE4EA]">
          <Link
            href="/dashboard/messages"
            className="p-1.5 text-[#6B7C8F] hover:text-[#0B1F33] rounded-lg hover:bg-[#EEF4FF]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {/* Desktop: open profile panel. Mobile: route to profile page. */}
          <button
            type="button"
            onClick={() => setRightPanelView("profile")}
            className="hidden md:flex w-10 h-10 bg-[#2F6FED] rounded-full items-center justify-center text-white font-semibold hover:ring-2 hover:ring-[#2F6FED]/30 transition cursor-pointer shadow-sm"
            title="Show profile details"
          >
            {otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
          </button>
          <Link href={`/dashboard/u/${otherUserId || ""}`} className="md:hidden">
            <div className="w-10 h-10 bg-[#2F6FED] rounded-full flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-[#2F6FED]/30 transition cursor-pointer shadow-sm">
              {otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setRightPanelView("profile")}
              className="hidden md:block hover:underline underline-offset-2"
            >
              <p className="font-semibold text-[#0B1F33] truncate">
                {otherUser?.displayName || "User"}
              </p>
            </button>
            <Link href={`/dashboard/u/${otherUserId || ""}`} className="md:hidden hover:underline underline-offset-2">
              <p className="font-semibold text-[#0B1F33] truncate">
                {otherUser?.displayName || "User"}
              </p>
            </Link>
            <p className="text-xs text-[#6B7C8F] flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {otherUser?.city}, {otherUser?.province}
              {distance !== null && (
                <span className="flex items-center gap-0.5 ml-2 text-[#2F6FED] font-semibold">
                  <Compass className="w-3 h-3" />
                  {distance.toFixed(1)} km away
                </span>
              )}
            </p>
          </div>
          {job && (
            <div className="hidden sm:block">
              <StatusBadge status={job.status} />
            </div>
          )}
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            title="Report / File Claim"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>

        {/* Address bar for operator — show client address */}
        {isOperator && job && (
          <div className="bg-[#F8FAFD] border-b border-[var(--border-soft)] px-4 py-2.5 flex items-center gap-2 text-xs">
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
              title="Open in Google Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-[#2F6FED] shrink-0" />
            </a>
            <span className="text-[#0B1F33] font-medium truncate">{job.address}</span>
            <span className="text-[#6B7C8F]">{job.city}, {job.province}</span>
            {distance !== null && (
              <span className="ml-auto shrink-0 px-2.5 py-0.5 bg-[#E8F0FF] text-[#2F6FED] rounded-full font-semibold">
                {distance.toFixed(1)} km
              </span>
            )}
          </div>
        )}

        {/* Client address bar — for client to see their own address */}
        {!isOperator && job && (
          <div className="bg-[#F8FAFD] border-b border-[var(--border-soft)] px-4 py-2.5 flex items-center gap-2 text-xs">
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
              title="Open in Google Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-[#2F6FED] shrink-0" />
            </a>
            <span className="text-[#0B1F33] font-medium truncate">{job.address}</span>
            <span className="text-[#6B7C8F]">{job.city}, {job.province}</span>
          </div>
        )}

        {/* Job Info Bar */}
        {job && (
          <div className="bg-[#F7FAFF] border-b border-[#DCE8FF] px-4 py-3">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-3 items-stretch">
              <div className="rounded-xl bg-white border border-[#E6EEF6] px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-wide text-[#6B7C8F] font-semibold">Service Details</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {job.serviceTypes?.map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-[#2F6FED]/10 text-[#2F6FED] rounded-full text-xs font-semibold capitalize">
                      {s.replace("-", " ")}
                    </span>
                  ))}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    job.propertySize === "small" ? "bg-emerald-50 text-emerald-700" :
                    job.propertySize === "medium" ? "bg-amber-50 text-amber-700" :
                    job.propertySize === "large" ? "bg-orange-50 text-orange-700" :
                    "bg-purple-50 text-purple-700"
                  }`}>
                    {job.propertySize === "small" && "🏠 Small Lot"}
                    {job.propertySize === "medium" && "🏡 Medium Lot"}
                    {job.propertySize === "large" && "🏘️ Large Lot"}
                    {job.propertySize === "commercial" && "🏢 Commercial"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-[#E6EEF6] px-3.5 py-3 flex flex-col justify-between">
                <p className="text-[11px] uppercase tracking-wide text-[#6B7C8F] font-semibold">Price & Payment</p>
                <div className="mt-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#2F6FED]" />
                    <span className="text-xl font-extrabold text-[#0B1F33] leading-none">{job.price}</span>
                    <span className="text-xs text-[#6B7C8F] font-semibold mt-1">CAD</span>
                  </div>
                </div>
                <div className="mt-2.5">
                  {job.paymentStatus === "held" && (
                    <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                      <Shield className="w-3 h-3" /> Held
                    </span>
                  )}
                  {job.paymentStatus === "paid" && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      ✓ Paid
                    </span>
                  )}
                  {job.paymentStatus === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                      Awaiting Payment
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact progress tracker on mobile */}
        {job && (
          <div className="md:hidden px-4 py-2 bg-white border-b border-[var(--border-soft)]">
            <ProgressTracker
              status={job.status}
              paymentStatus={job.paymentStatus as "pending" | "held" | "paid" | "refunded" | undefined}
              compact
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 bg-[radial-gradient(circle_at_20%_20%,rgba(175,217,163,0.35),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(159,206,255,0.25),transparent_35%),linear-gradient(180deg,#EAF4DD_0%,#E7F1DA_45%,#E2EED5_100%)] space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-[#6B7C8F]">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-[var(--border-soft)] mb-3">
                <CheckCircle className="w-7 h-7 text-[#2F6FED]" />
              </div>
              <p className="font-medium text-sm text-gray-700">Conversation started</p>
              <p className="text-xs text-gray-500 mt-1">Messages will appear here</p>
            </div>
          )}
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Review Prompt — Auto-shows when job is completed */}
        {job?.status === "completed" && !reviewSubmitted && (
          <div className="bg-yellow-50 border-x border-[#E6EEF6] px-4 py-4 border-t border-yellow-200">
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
          <div className="bg-green-50 border-x border-[#E6EEF6] px-4 py-3 border-t border-green-200 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Thank you for your review!</span>
            </div>
          </div>
        )}

        {/* Operator Quick Actions */}
        {isOperator && showActions && job && job.status !== "completed" && job.status !== "cancelled" && (
          <div className="bg-white border-x border-[#E6EEF6] border-t border-gray-100 px-4 py-3 md:hidden">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2.5">Job Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {job.status === "pending" && (
                <button
                  onClick={() => updateJobStatus("accepted")}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Accept Job
                </button>
              )}
              {job.status === "accepted" && (
                <button
                  onClick={() => updateJobStatus("en-route")}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#2F6FED] text-white rounded-xl text-sm font-semibold hover:bg-[#2158C7] transition shadow-sm"
                >
                  <Navigation className="w-4 h-4" /> I&apos;m On My Way
                </button>
              )}
              {job.status === "en-route" && (
                <>
                  <button
                    onClick={() => updateJobStatus("in-progress")}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#2F6FED] text-white rounded-xl text-sm font-semibold hover:bg-[#2158C7] transition shadow-sm"
                  >
                    <Play className="w-4 h-4" /> Start Job
                  </button>
                  <button
                    onClick={() => updateJobStatus("accepted")}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </button>
                </>
              )}
              {job.status === "in-progress" && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#2F6FED] text-white rounded-xl text-sm font-semibold hover:bg-[#2158C7] transition shadow-sm disabled:opacity-50 col-span-2"
                  >
                    <Camera className="w-4 h-4" />
                    {uploadingPhoto ? "Uploading Photo..." : "Submit Photo Proof & Complete"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => updateJobStatus("en-route")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition col-span-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Go Back to En Route
                  </button>
                </>
              )}

              {(job.status === "accepted" || job.status === "en-route") && (
                <>
                  <div className="col-span-2 border-t border-gray-100 my-1" />
                  <p className="col-span-2 text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Send ETA</p>
                  <button onClick={() => sendEtaUpdate(10)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#2F6FED]/8 text-[#2F6FED] rounded-xl text-xs font-semibold hover:bg-[#2F6FED]/15 transition">
                    <Clock className="w-3.5 h-3.5" /> 10 min
                  </button>
                  <button onClick={() => sendEtaUpdate(20)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#2F6FED]/8 text-[#2F6FED] rounded-xl text-xs font-semibold hover:bg-[#2F6FED]/15 transition">
                    <Clock className="w-3.5 h-3.5" /> 20 min
                  </button>
                  <button onClick={() => sendEtaUpdate(30)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#2F6FED]/8 text-[#2F6FED] rounded-xl text-xs font-semibold hover:bg-[#2F6FED]/15 transition">
                    <Clock className="w-3.5 h-3.5" /> 30 min
                  </button>
                </>
              )}

              {job.status === "accepted" && job.paymentStatus === "pending" && (
                <button
                  onClick={async () => {
                    await sendMessage(
                      `${profile?.displayName} is requesting payment of $${job.price} CAD for this job. Tap Pay Now to hold funds securely with snowd.ca.`,
                      "payment-request",
                      { amount: job.price }
                    );
                    setShowActions(false);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
                >
                  <CreditCard className="w-4 h-4" /> Request Payment
                </button>
              )}

              <div className="col-span-2 border-t border-gray-100 mt-1 pt-2">
                <button
                  onClick={cancelJob}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition"
                >
                  <X className="w-4 h-4" /> Cancel Job
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client cancel button for pending jobs */}
        {!isOperator && job?.status === "pending" && (
          <div className="bg-gray-50 border-x border-gray-100 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Job Request Pending</p>
                <p className="text-xs text-gray-600">Waiting for operator to accept</p>
              </div>
              <button
                onClick={cancelJob}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold text-sm transition flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel Request
              </button>
            </div>
          </div>
        )}

        {/* Client payment banner */}
        {!isOperator && job?.status === "accepted" && job?.paymentStatus === "pending" && (
          <div className="bg-yellow-50 border-x border-yellow-100 px-4 py-3 border-t border-yellow-200">
            <div className="flex items-center justify-between">
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
                className="px-4 py-2 bg-[#2F6FED] text-white rounded-lg font-semibold text-sm hover:bg-[#2158C7] transition disabled:opacity-50 flex items-center gap-2"
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
          <div className="bg-[#2F6FED]/5 border-x border-[#2F6FED]/10 px-4 py-3 border-t border-[#2F6FED]/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Job Complete</p>
                <p className="text-xs text-gray-500">Need this service again?</p>
              </div>
              <button
                onClick={rehireOperator}
                disabled={rehiring}
                className="px-4 py-2 bg-[#2F6FED] text-white rounded-lg font-semibold text-sm hover:bg-[#2158C7] transition flex items-center gap-2 disabled:opacity-50"
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Job Cancelled</p>
                  <p className="text-xs text-red-600">
                    Reopen within {Math.floor(reopenTimeLeft / 60000)}:{String(Math.floor((reopenTimeLeft % 60000) / 1000)).padStart(2, "0")}
                  </p>
                </div>
                <button
                  onClick={reopenJob}
                  className="px-4 py-2 bg-[#2F6FED] text-white rounded-lg font-semibold text-sm hover:bg-[#2158C7] transition flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Reopen Job
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Job Cancelled</p>
                  {!isOperator && (
                    <p className="text-xs text-red-600">Want to start a new job?</p>
                  )}
                </div>
                {!isOperator && !rehireSent && (
                  <button
                    onClick={rehireOperator}
                    disabled={rehiring}
                    className="px-4 py-2 bg-[#2F6FED] text-white rounded-lg font-semibold text-sm hover:bg-[#2158C7] transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Briefcase className="w-4 h-4" />
                    {rehiring ? "Creating..." : "Rehire"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message Input */}
        <div className="bg-[#F4F4F5] px-3 sm:px-4 py-3 shrink-0 border-t border-[#DFE4EA]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-2xl border border-[#D7DDE5] bg-white p-2">
            {isOperator && (
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className={`p-2 rounded-lg transition ${
                  showActions
                    ? "bg-[#D6E8F5] text-[#2F6FED]"
                    : "text-[#6B7C8F] hover:text-[#0B1F33] hover:bg-[#EEF4FF]"
                }`}
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${showActions ? "rotate-180" : ""}`} />
              </button>
            )}
            {/* Photo upload button */}
            <button
              type="button"
                onClick={handleOpenCameraUpload}
              className="p-2 text-[#6B7C8F] hover:text-[#2F6FED] hover:bg-[#EEF4FF] rounded-lg transition"
              title="Send photo"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={chatPhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleChatPhotoUpload}
              className="hidden"
            />
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-white rounded-xl outline-none focus:ring-2 focus:ring-[#2F6FED]/30 text-sm border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className="px-4 py-2.5 bg-[#2F6FED] text-white rounded-xl hover:bg-[#2158C7] transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-semibold">
                {sendingMessage ? "Sending" : "Send"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Desktop Right Panel — dynamic: updates by default, profile on demand */}
        {(job || otherUser) && (
        <div className="hidden md:flex flex-col w-80 shrink-0 h-full min-h-0">
          <div className="bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] p-5 h-full overflow-y-auto min-h-0">
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#F4F8FF] p-1 border border-[#E3ECFA]">
              <button
                type="button"
                onClick={() => setRightPanelView("updates")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  rightPanelView === "updates" ? "bg-white text-[#2F6FED] shadow-sm" : "text-[#6B7C8F] hover:text-[#0B1F33]"
                }`}
              >
                Updates
              </button>
              <button
                type="button"
                onClick={() => setRightPanelView("profile")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  rightPanelView === "profile" ? "bg-white text-[#2F6FED] shadow-sm" : "text-[#6B7C8F] hover:text-[#0B1F33]"
                }`}
              >
                Profile
              </button>
            </div>

            {rightPanelView === "updates" && job && (
              <>
                <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-4">Job Progress</h3>
            <ProgressTracker
              status={job.status}
              paymentStatus={job.paymentStatus as "pending" | "held" | "paid" | "refunded" | undefined}
            />

            {/* Operator Update Buttons */}
            {isOperator && job.status !== "completed" && job.status !== "cancelled" && (
              <div className="mt-4 pt-3 border-t border-[#E6EEF6] space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Update Progress</p>
                {job.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateJobStatus("accepted")}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition shadow-sm"
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
                  <button
                    onClick={() => updateJobStatus("en-route")}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#2F6FED] text-white rounded-xl text-xs font-bold hover:bg-[#2158C7] transition shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Mark En Route
                  </button>
                )}
                {job.status === "en-route" && (
                  <>
                    <button
                      onClick={() => updateJobStatus("in-progress")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#2F6FED] text-white rounded-xl text-xs font-bold hover:bg-[#2158C7] transition shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Job
                    </button>
                    <button
                      onClick={() => updateJobStatus("accepted")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Go Back
                    </button>
                  </>
                )}
                {job.status === "in-progress" && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#2F6FED] text-white rounded-xl text-xs font-bold hover:bg-[#2158C7] transition shadow-sm disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" /> {uploadingPhoto ? "Uploading..." : "Photo Proof & Complete"}
                    </button>
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
              <div className="mt-4 pt-3 border-t border-[#E6EEF6] space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Quick Comms</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => sendEtaUpdate(10)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2F6FED]/8 text-[#2F6FED] rounded-xl text-xs font-semibold hover:bg-[#2F6FED]/15 transition"
                  >
                    10m
                  </button>
                  <button
                    onClick={() => sendEtaUpdate(20)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2F6FED]/8 text-[#2F6FED] rounded-xl text-xs font-semibold hover:bg-[#2F6FED]/15 transition"
                  >
                    20m
                  </button>
                  <button
                    onClick={() => sendEtaUpdate(30)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2F6FED]/8 text-[#2F6FED] rounded-xl text-xs font-semibold hover:bg-[#2F6FED]/15 transition"
                  >
                    30m
                  </button>
                </div>
                {job.status === "accepted" && job.paymentStatus === "pending" && (
                  <button
                    onClick={async () => {
                      await sendMessage(
                        `${profile?.displayName} is requesting payment of $${job.price} CAD for this job. Tap Pay Now to hold funds securely with snowd.ca.`,
                        "payment-request",
                        { amount: job.price }
                      );
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Request Payment
                  </button>
                )}
              </div>
            )}

            {/* Job summary */}
            <div className="mt-5 pt-4 border-t border-[#E6EEF6] space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7C8F]">Service</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                  {job.serviceTypes?.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-[#2F6FED]/10 text-[#2F6FED] rounded-full text-xs font-semibold capitalize">{s.replace("-", " ")}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7C8F]">Property</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  job.propertySize === "small" ? "bg-emerald-50 text-emerald-700" :
                  job.propertySize === "medium" ? "bg-amber-50 text-amber-700" :
                  job.propertySize === "large" ? "bg-orange-50 text-orange-700" :
                  "bg-purple-50 text-purple-700"
                }`}>
                  {job.propertySize === "small" && "🏠 Small Lot"}
                  {job.propertySize === "medium" && "🏡 Medium Lot"}
                  {job.propertySize === "large" && "🏘️ Large Lot"}
                  {job.propertySize === "commercial" && "🏢 Commercial"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7C8F]">Price</span>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-[#2F6FED]" />
                  <span className="font-bold text-lg text-[#0B1F33]">{job.price}</span>
                  <span className="text-xs text-[#6B7C8F]">CAD</span>
                </div>
              </div>
              {distance !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7C8F]">Distance</span>
                  <span className="font-medium text-[#0B1F33]">{distance.toFixed(1)} km</span>
                </div>
              )}
              <div className="pt-1.5">
                <div className="rounded-xl overflow-hidden border border-[#E6EEF6] bg-white">
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="w-full text-left text-xs text-[#6B7C8F] flex items-start gap-1.5 hover:text-[#2F6FED] transition px-2.5 py-2"
                  >
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-2">{job.address}, {job.city}</span>
                  </button>
                  <div className="h-32 bg-[#EFF4FB] border-t border-[#E6EEF6] overflow-hidden">
                    {mapStaticUrl ? (
                      <img
                        src={mapStaticUrl}
                        alt="Map preview"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#6B7C8F]">
                        Map preview unavailable
                      </div>
                    )}
                  </div>
                </div>
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-[11px] font-semibold text-[#2F6FED] inline-flex items-center gap-1 hover:text-[#2158C7]"
                >
                  Open in Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

                <div className="mt-4 pt-3 border-t border-[#E6EEF6]">
                  <button
                    type="button"
                    onClick={() => setRightPanelView("profile")}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#F3F7FF] text-[#2F6FED] rounded-xl text-xs font-semibold hover:bg-[#EAF1FF] transition"
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
                    <p className="text-sm font-semibold text-[#0B1F33] truncate">{otherUser.displayName}</p>
                    <p className="text-xs text-[#6B7C8F] capitalize">{otherUser.role}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="rounded-xl border border-[#E6EEF6] bg-[#FAFCFF] px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-[#6B7C8F]">Location</p>
                    <p className="text-[#0B1F33]">{otherUser.city}, {otherUser.province}</p>
                  </div>
                  {distance !== null && (
                    <div className="rounded-xl border border-[#E6EEF6] bg-[#FAFCFF] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-[#6B7C8F]">Distance</p>
                      <p className="text-[#0B1F33]">{distance.toFixed(1)} km away</p>
                    </div>
                  )}
                  {otherUser.phone && (
                    <div className="rounded-xl border border-[#E6EEF6] bg-[#FAFCFF] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-[#6B7C8F]">Phone</p>
                      <p className="text-[#0B1F33]">{otherUser.phone}</p>
                    </div>
                  )}
                </div>
                <Link
                  href={`/dashboard/u/${otherUser.uid}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-[#2F6FED] text-white rounded-xl text-xs font-semibold hover:bg-[#2158C7] transition"
                >
                  Open Full Profile <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {rightPanelView === "profile" && !otherUser && (
              <p className="text-sm text-[#6B7C8F]">Profile info unavailable.</p>
            )}
          </div>
        </div>
      )}


      {/* Cancellation Popup */}
      <CancellationPopup
        isOpen={showCancelPopup}
        onCancel={() => setShowCancelPopup(false)}
        onConfirm={confirmCancelJob}
        loading={cancelling}
        title="Cancel this job?"
        message={`This will cancel the ${job?.serviceTypes?.map(s => s.replace("-", " ")).join(", ") || "snow removal"} job at ${job?.address || "this address"}. Any held payment of $${job?.price || 0} will be refunded.`}
      />

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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                onClick={async () => {
                  await sendMessage(
                    `${profile?.displayName} is requesting payment of $${job.price} CAD before starting the job. Please pay to confirm — funds are held securely by snowd.ca until completion.`,
                    "payment-request",
                    { amount: job.price }
                  );
                  setShowPaymentGateModal(false);
                  setPendingStatus(null);
                }}
                className="w-full py-3 bg-[#2F6FED] text-white rounded-xl font-semibold text-sm hover:bg-[#2158C7] transition flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Send Payment Request to Client
              </button>
              <button
                onClick={() => { setShowPaymentGateModal(false); setPendingStatus(null); }}
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
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0B1F33]">Job Address</p>
                <p className="text-xs text-[#6B7C8F] truncate">{mapAddress || "Address unavailable"}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[50vh] min-h-[320px] bg-[#EFF4FB] overflow-hidden">
              {mapStaticUrl ? (
                <img
                  src={mapStaticUrl}
                  alt="Google Maps address preview"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[#6B7C8F]">
                  Map preview unavailable
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--border-soft)] flex items-center justify-end">
              <button
                type="button"
                onClick={() => window.open(`https://maps.google.com/?q=${mapQuery}`, "_blank", "noopener,noreferrer")}
                className="px-3 py-2 rounded-lg bg-[#2F6FED] text-white text-sm font-semibold hover:bg-[#2158C7] inline-flex items-center gap-1.5"
              >
                Open Full Map <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraQrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCameraQrModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0B1F33]">Send Photo From Phone</h3>
              <button
                type="button"
                onClick={() => setShowCameraQrModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#6B7C8F] mt-1.5">Scan the QR code on your phone, open the chat page, then tap Open Camera and submit.</p>
            <div className="mt-4 rounded-xl border border-[#E6EEF6] bg-[#F8FAFD] p-3 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileCameraUrl)}`}
                alt="QR code for mobile camera upload"
                className="w-[220px] h-[220px]"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <a
                href={mobileCameraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-[#2F6FED] text-white text-sm font-semibold hover:bg-[#2158C7]"
              >
                Open Link
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(mobileCameraUrl);
                    alert("Mobile upload link copied.");
                  } catch {
                    alert("Could not copy link. Use Open Link instead.");
                  }
                }}
                className="px-3 py-2.5 rounded-xl border border-[#DCE8FF] text-[#2F6FED] text-sm font-semibold hover:bg-[#F3F8FF]"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {mobileCameraMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 w-[min(92vw,420px)]">
          <div className="bg-white border border-[#DCE8FF] shadow-[0_10px_30px_rgba(47,111,237,0.18)] rounded-2xl p-3.5">
            <p className="text-xs text-[#6B7C8F]">Mobile upload mode</p>
            <p className="text-sm text-[#0B1F33] font-medium mt-0.5">Use your phone camera to send a chat photo.</p>
            <button
              type="button"
              onClick={() => chatPhotoInputRef.current?.click()}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#2F6FED] text-white text-sm font-semibold hover:bg-[#2158C7]"
            >
              <Camera className="w-4 h-4" /> Open Camera
            </button>
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
