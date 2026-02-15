"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ChatMessage,
  Job,
  UserProfile,
  JobStatus,
  ClaimType,
} from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ProgressTracker from "@/components/ProgressTracker";
import StripeCheckout from "@/components/StripeCheckout";
import Image from "next/image";
import {
  Send,
  ArrowLeft,
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
  Flag,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import CelebrationOverlay from "@/components/CelebrationOverlay";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Celebration overlay
  const [celebration, setCelebration] = useState<{ show: boolean; type: "booking" | "completion" | "accepted" | "payment" }>({ show: false, type: "booking" });

  // Report / claim state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ClaimType>("other");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const isOperator = profile?.role === "operator";

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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!chatId || !user?.uid || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (m) => m.senderId !== user.uid && !m.read
    );

    unreadMessages.forEach(async (msg) => {
      try {
        await updateDoc(doc(db, "messages", msg.id), { read: true });
      } catch {}
    });

    if (unreadMessages.length > 0) {
      updateDoc(doc(db, "chats", chatId), {
        [`unreadCount.${user.uid}`]: 0,
      }).catch(() => {});
    }
  }, [chatId, user?.uid, messages]);

  // Send a message
  const sendMessage = useCallback(
    async (
      content: string,
      type: ChatMessage["type"] = "text",
      metadata?: ChatMessage["metadata"]
    ) => {
      if (!content.trim() && type === "text") return;
      if (!user?.uid || !chatId) return;

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
          const currentUnread = chatData?.unreadCount?.[otherUid] || 0;
          updateData[`unreadCount.${otherUid}`] = currentUnread + 1;
        }

        await updateDoc(chatDocRef, updateData);
        if (type === "text") setNewMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    },
    [user?.uid, chatId, profile?.displayName]
  );

  // Operator actions
  const updateJobStatus = async (newStatus: JobStatus) => {
    if (!job) return;
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      if (newStatus === "in-progress") {
        updateData.startTime = Timestamp.now();
        // Hold payment when job starts
        if (job.paymentStatus === "pending" && job.stripePaymentIntentId) {
          // Payment already exists but wasn't captured - just update status
          updateData.paymentStatus = "held";
        }
      }
      if (newStatus === "completed") updateData.completionTime = Timestamp.now();

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

      // Trigger celebration animation
      if (newStatus === "accepted") {
        setCelebration({ show: true, type: "accepted" });
      } else if (newStatus === "completed") {
        setCelebration({ show: true, type: "completion" });
      }

      setShowActions(false);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const cancelJob = async () => {
    if (!job?.id) return;
    const userRole = isOperator ? "operator" : "client";
    if (!confirm(`Are you sure you want to cancel this job?`)) return;
    
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
    } catch (error) {
      console.error("Error cancelling job:", error);
      alert("Failed to cancel job. Please try again.");
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
    const cancelledDate = cancelledAt && typeof cancelledAt === "object" && "toDate" in (cancelledAt as object)
      ? (cancelledAt as Timestamp).toDate()
      : new Date(cancelledAt as string);
    
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
      if (data.error) throw new Error(data.error);
      setClientSecret(data.clientSecret);
      setShowCheckout(true);
    } catch (error) {
      console.error("Payment initiation error:", error);
      alert("Failed to initiate payment. Please try again.");
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
      setCelebration({ show: true, type: "payment" });
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
        
        // If payment was held, capture it now
        if (job.stripePaymentIntentId && job.paymentStatus === "held") {
          try {
            const response = await fetch("/api/stripe/capture-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentIntentId: job.stripePaymentIntentId }),
            });
            const data = await response.json();
            if (!data.error) {
              await updateDoc(doc(db, "jobs", job.id), {
                paymentStatus: "paid",
              });
            }
          } catch (error) {
            console.error("Payment capture error:", error);
          }
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
    if (!job?.stripePaymentIntentId) return;
    try {
      const response = await fetch("/api/stripe/capture-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: job.stripePaymentIntentId }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

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
    sendMessage(newMessage);
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

  // Message rendering
  const renderMessage = (msg: ChatMessage) => {
    const isOwn = msg.senderId === user?.uid;
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
              <div className="w-7 h-7 bg-[#4361EE] rounded-full flex items-center justify-center text-white font-semibold text-xs hover:ring-2 hover:ring-[#4361EE]/30 transition">
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
            <p className={`text-xs mt-1 ${isOwn ? "text-[#6B7C8F] text-right" : "text-[#6B7C8F]"}`}>
              {formatTimestamp(msg.createdAt)}
            </p>
          </div>
        </div>
      );
    }

    // Progress update widget - show only the status change
    if (msg.type === "progress-update" || msg.type === "status-update") {
      const statusColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
        accepted: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "text-green-600" },
        "en-route": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "text-purple-600" },
        "in-progress": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "text-orange-600" },
        completed: { bg: "bg-[#4361EE]/10", border: "border-[#4361EE]/20", text: "text-[#4361EE]", icon: "text-[#4361EE]" },
        cancelled: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "text-red-600" },
      };
      const statusValue = msg.metadata?.newStatus || "accepted";
      const colors = statusColors[statusValue] || statusColors.accepted;
      
      return (
        <div key={msg.id} className="flex justify-center my-3 chat-bubble">
          <div className={`${colors.bg} border ${colors.border} rounded-xl px-4 py-2.5 max-w-sm`}>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
              <span className={`text-sm font-medium ${colors.text}`}>{msg.content}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">{formatTimestamp(msg.createdAt)}</p>
          </div>
        </div>
      );
    }

    if (msg.type === "completion-photo") {
      return (
        <div key={msg.id} className="flex justify-center my-3 chat-bubble">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Completion Photo</span>
            </div>
            {msg.metadata?.completionPhotoUrl && (
              <img
                src={msg.metadata.completionPhotoUrl}
                alt="Job completion"
                className="w-full rounded-lg mb-2 cursor-pointer"
                onClick={() => window.open(msg.metadata!.completionPhotoUrl!, "_blank")}
              />
            )}
            <p className="text-xs text-green-600">{msg.content}</p>
            <p className="text-xs text-gray-500 mt-2 text-center">{formatTimestamp(msg.createdAt)}</p>
          </div>
        </div>
      );
    }

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center my-3 chat-bubble">
          <div
            className={`px-4 py-2 rounded-full text-sm max-w-xs text-center ${
              msg.type === "eta-update"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : msg.type === "payment"
                ? "bg-green-50 text-green-700 border border-green-200"
                : msg.type === "payment-request"
                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {msg.type === "eta-update" && (
              <div className="flex items-center gap-2 justify-center">
                <Clock className="w-4 h-4" />
                <span>{msg.content}</span>
              </div>
            )}
            {msg.type === "payment" && (
              <div className="flex items-center gap-2 justify-center">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">{msg.content}</span>
              </div>
            )}
            {msg.type === "payment-request" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-semibold">{msg.content}</span>
                </div>
                {!isOperator && job?.paymentStatus === "pending" && (
                  <button
                    onClick={initiatePayment}
                    disabled={processingPayment}
                    className="mt-1 px-4 py-1.5 bg-[#4361EE] text-white rounded-lg text-xs font-semibold hover:bg-[#3651D4] transition"
                  >
                    {processingPayment ? "Processing..." : "Pay Now"}
                  </button>
                )}
              </div>
            )}
            {msg.type === "system" && msg.content}
          </div>
        </div>
      );
    }

    // Regular text message with clickable avatar
    return (
      <div
        key={msg.id}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 chat-bubble`}
      >
        {/* Other user avatar - clickable to profile */}
        {!isOwn && otherUser && (
          <Link
            href={`/dashboard/u/${msg.senderId}`}
            className="shrink-0 mr-2 self-end"
          >
            <div className="w-7 h-7 bg-[#4361EE] rounded-full flex items-center justify-center text-white font-semibold text-xs hover:ring-2 hover:ring-[#4361EE]/30 transition">
              {otherUser.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </Link>
        )}
        <div
          className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
            isOwn
              ? "bg-[#4361EE] text-white rounded-br-md"
              : "bg-white border border-[#E6EEF6] text-[#0B1F33] rounded-bl-md"
          }`}
        >
          {!isOwn && (
            <p className="text-xs font-medium text-[#4361EE] mb-0.5">
              {msg.senderName}
            </p>
          )}
          <p className="text-sm leading-relaxed">{msg.content}</p>
          <p className={`text-xs mt-1 ${isOwn ? "text-[#4361EE]/30" : "text-[#6B7C8F]"}`}>
            {formatTimestamp(msg.createdAt)}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-[#6B7C8F] gap-3">
        <div className="animate-spin-slow">
          <Image src="/logo.svg" alt="Loading" width={40} height={40} />
        </div>
        <p>Loading conversation...</p>
      </div>
    );
  }

  const otherUserId = otherUser?.uid || (messages.find((m) => m.senderId !== user?.uid)?.senderId);

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] gap-0 md:gap-4">
      <CelebrationOverlay
        type={celebration.type}
        show={celebration.show}
        onComplete={() => setCelebration({ ...celebration, show: false })}
      />
      {/* Chat Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white rounded-t-2xl border border-[#E6EEF6] px-4 py-3 flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/messages"
            className="p-1.5 text-[#6B7C8F] hover:text-[#0B1F33] rounded-lg hover:bg-[#F7FAFC]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {/* Clickable avatar → public profile */}
          <Link href={`/dashboard/u/${otherUserId || ""}`}>
            <div className="w-10 h-10 bg-[#4361EE] rounded-full flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-[#4361EE]/30 transition cursor-pointer">
              {otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/dashboard/u/${otherUserId || ""}`} className="hover:underline">
              <p className="font-semibold text-[#0B1F33] truncate">
                {otherUser?.displayName || "User"}
              </p>
            </Link>
            <p className="text-xs text-[#6B7C8F] flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {otherUser?.city}, {otherUser?.province}
              {distance !== null && (
                <span className="flex items-center gap-0.5 ml-2 text-[#4361EE] font-medium">
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
          <div className="bg-[#F7FAFC] border-x border-[#E6EEF6] px-4 py-2 flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#4361EE] shrink-0" />
            <span className="text-[#0B1F33] font-medium truncate">{job.address}</span>
            <span className="text-[#6B7C8F]">{job.city}, {job.province}</span>
            {distance !== null && (
              <span className="ml-auto shrink-0 px-2 py-0.5 bg-[#E8EDFD] text-[#4361EE] rounded-full font-semibold">
                {distance.toFixed(1)} km
              </span>
            )}
          </div>
        )}

        {/* Client address bar — for client to see their own address */}
        {!isOperator && job && (
          <div className="bg-[#F7FAFC] border-x border-[#E6EEF6] px-4 py-2 flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#4361EE] shrink-0" />
            <span className="text-[#0B1F33] font-medium truncate">{job.address}</span>
            <span className="text-[#6B7C8F]">{job.city}, {job.province}</span>
          </div>
        )}

        {/* Job Info Bar */}
        {job && (
          <div className="bg-[#4361EE]/5 border-x border-[#4361EE]/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Service types as pills */}
                <div className="flex flex-wrap gap-1.5">
                  {job.serviceTypes?.map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-[#4361EE]/10 text-[#4361EE] rounded-full text-xs font-semibold capitalize">
                      {s.replace("-", " ")}
                    </span>
                  ))}
                </div>

                {/* Property size badge with icon */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  job.propertySize === "small" ? "bg-emerald-50 text-emerald-700" :
                  job.propertySize === "medium" ? "bg-amber-50 text-amber-700" :
                  job.propertySize === "large" ? "bg-orange-50 text-orange-700" :
                  "bg-purple-50 text-purple-700"
                }`}>
                  {job.propertySize === "small" && "🏠"}
                  {job.propertySize === "medium" && "🏡"}
                  {job.propertySize === "large" && "🏘️"}
                  {job.propertySize === "commercial" && "🏢"}
                  {job.propertySize === "small" && "Small Lot"}
                  {job.propertySize === "medium" && "Medium Lot"}
                  {job.propertySize === "large" && "Large Lot"}
                  {job.propertySize === "commercial" && "Commercial"}
                </span>
              </div>

              {/* Price display */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded-lg px-3 py-1.5 border border-[#E6EEF6] shadow-sm">
                  <DollarSign className="w-4 h-4 text-[#4361EE]" />
                  <span className="text-lg font-bold text-[#0B1F33]">{job.price}</span>
                  <span className="text-xs text-[#6B7C8F] font-medium">CAD</span>
                </div>
                {job.paymentStatus === "held" && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                    <Shield className="w-3 h-3 inline mr-0.5" />
                    Held
                  </span>
                )}
                {job.paymentStatus === "paid" && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    ✓ Paid
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compact progress tracker on mobile */}
        {job && (
          <div className="md:hidden border-x border-[#E6EEF6] px-4 py-2 bg-white border-b border-[#E6EEF6]">
            <ProgressTracker
              status={job.status}
              paymentStatus={job.paymentStatus as "pending" | "held" | "paid" | "refunded" | undefined}
              compact
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#F7FAFC] border-x border-[#E6EEF6] space-y-1">
          {messages.length === 0 && (
            <div className="text-center py-8 text-[#6B7C8F]">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Review Prompt — Auto-shows when job is completed */}
        {job?.status === "completed" && !reviewSubmitted && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-x border-[#E6EEF6] px-4 py-4 border-t border-yellow-200">
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
        {isOperator && showActions && (
          <div className="bg-white border-x border-[#E6EEF6] px-4 py-3 border-t border-[#E6EEF6]">
            <div className="grid grid-cols-2 gap-2">
              {job?.status === "pending" && (
                <button
                  onClick={() => updateJobStatus("accepted")}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition"
                >
                  <CheckCircle className="w-4 h-4" /> Accept Job
                </button>
              )}
              {job?.status === "accepted" && (
                <button
                  onClick={() => updateJobStatus("en-route")}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition"
                >
                  <Navigation className="w-4 h-4" /> On My Way
                </button>
              )}
              {job?.status === "en-route" && (
                <>
                  <button
                    onClick={() => updateJobStatus("in-progress")}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition"
                  >
                    <Play className="w-4 h-4" /> Start Job
                  </button>
                  <button
                    onClick={() => updateJobStatus("accepted")}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </button>
                </>
              )}
              {job?.status === "in-progress" && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    {uploadingPhoto ? "Uploading..." : "Submit Photo Proof"}
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
                    onClick={() => updateJobStatus("completed")}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition"
                  >
                    <CheckCircle className="w-4 h-4" /> Complete Job
                  </button>
                  <button
                    onClick={() => updateJobStatus("en-route")}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </button>
                </>
              )}

              {(job?.status === "accepted" || job?.status === "en-route") && (
                <>
                  <button onClick={() => sendEtaUpdate(10)} className="flex items-center gap-2 px-3 py-2 bg-[#4361EE]/10 text-[#4361EE] rounded-lg text-sm font-medium hover:bg-[#4361EE]/15 transition">
                    <Clock className="w-4 h-4" /> ETA: 10 min
                  </button>
                  <button onClick={() => sendEtaUpdate(20)} className="flex items-center gap-2 px-3 py-2 bg-[#4361EE]/10 text-[#4361EE] rounded-lg text-sm font-medium hover:bg-[#4361EE]/15 transition">
                    <Clock className="w-4 h-4" /> ETA: 20 min
                  </button>
                  <button onClick={() => sendEtaUpdate(30)} className="flex items-center gap-2 px-3 py-2 bg-[#4361EE]/10 text-[#4361EE] rounded-lg text-sm font-medium hover:bg-[#4361EE]/15 transition">
                    <Clock className="w-4 h-4" /> ETA: 30 min
                  </button>
                </>
              )}

              {job?.status === "accepted" && job?.paymentStatus === "pending" && (
                <button
                  onClick={async () => {
                    await sendMessage(
                      `${profile?.displayName} is requesting payment of $${job.price} CAD for this job. Tap Pay Now to hold funds securely with snowd.ca.`,
                      "payment-request",
                      { amount: job.price }
                    );
                    setShowActions(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100 transition"
                >
                  <CreditCard className="w-4 h-4" /> Request Payment
                </button>
              )}

              {job?.status !== "completed" && job?.status !== "cancelled" && (
                <button
                  onClick={cancelJob}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                >
                  <X className="w-4 h-4" /> Cancel Job
                </button>
              )}
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
                className="px-4 py-2 bg-[#4361EE] text-white rounded-lg font-semibold text-sm hover:bg-[#1a6dd4] transition disabled:opacity-50 flex items-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <Image src="/logo.svg" alt="Loading" width={16} height={16} className="animate-spin-slow" />
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

        {/* Cancelled Job — Reopen or Contact Support */}
        {job?.status === "cancelled" && (
          <div className="bg-red-50 border-x border-red-100 px-4 py-3 border-t border-red-200">
            {reopenTimeLeft !== null && reopenTimeLeft > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Job Cancelled</p>
                  <p className="text-xs text-red-600">
                    Reopen within {Math.floor(reopenTimeLeft / 60000)}:{String(Math.floor((reopenTimeLeft % 60000) / 1000)).padStart(2, "0")}
                  </p>
                </div>
                <button
                  onClick={reopenJob}
                  className="px-4 py-2 bg-[#4361EE] text-white rounded-lg font-semibold text-sm hover:bg-[#1a6dd4] transition flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Reopen Job
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Job Cancelled</p>
                  <p className="text-xs text-red-600">Reopen window expired</p>
                </div>
                <Link
                  href="/dashboard/messages"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Contact Support
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Message Input */}
        <div className="bg-white rounded-b-2xl border border-[#E6EEF6] px-4 py-3 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {isOperator && (
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className={`p-2 rounded-lg transition ${
                  showActions
                    ? "bg-[#E8EDFD] text-[#4361EE]"
                    : "text-[#6B7C8F] hover:text-[#0B1F33] hover:bg-[#F7FAFC]"
                }`}
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${showActions ? "rotate-180" : ""}`} />
              </button>
            )}
            {/* Photo upload button */}
            <button
              type="button"
              onClick={() => chatPhotoInputRef.current?.click()}
              className="p-2 text-[#6B7C8F] hover:text-[#4361EE] hover:bg-[#F7FAFC] rounded-lg transition"
              title="Send photo"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={chatPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleChatPhotoUpload}
              className="hidden"
            />
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-[#F7FAFC] rounded-xl outline-none focus:ring-2 focus:ring-[#4361EE] text-sm border border-[#E6EEF6]"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2.5 bg-[#4361EE] text-white rounded-xl hover:bg-[#1a6dd4] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Desktop Right Panel — Progress Tracker */}
      {job && (
        <div className="hidden md:flex flex-col w-80 shrink-0 space-y-4">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-[#E6EEF6] dark:border-[#1e2d3d] p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-4">Job Progress</h3>
            <ProgressTracker
              status={job.status}
              paymentStatus={job.paymentStatus as "pending" | "held" | "paid" | "refunded" | undefined}
            />

            {/* Operator Update Buttons */}
            {isOperator && job.status !== "completed" && job.status !== "cancelled" && (
              <div className="mt-4 pt-3 border-t border-[#E6EEF6] dark:border-[#1e2d3d] space-y-2">
                <p className="text-xs font-semibold text-[#6B7C8F] uppercase tracking-wide mb-2">Update Progress</p>
                {job.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateJobStatus("accepted")}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => updateJobStatus("cancelled")}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                )}
                {job.status === "accepted" && (
                  <button
                    onClick={() => updateJobStatus("en-route")}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Mark En Route
                  </button>
                )}
                {job.status === "en-route" && (
                  <>
                    <button
                      onClick={() => updateJobStatus("in-progress")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-xs font-semibold hover:bg-orange-100 dark:hover:bg-orange-900/50 transition"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Job
                    </button>
                    <button
                      onClick={() => updateJobStatus("accepted")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/50 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Go Back
                    </button>
                  </>
                )}
                {job.status === "in-progress" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#4361EE]/10 dark:bg-[#4361EE]/20 text-[#4361EE] dark:text-[#4361EE]/70 rounded-lg text-xs font-semibold hover:bg-[#4361EE]/15 dark:hover:bg-[#4361EE]/30 transition disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5" /> Photo Proof
                      </button>
                      <button
                        onClick={() => updateJobStatus("completed")}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Complete
                      </button>
                    </div>
                    <button
                      onClick={() => updateJobStatus("en-route")}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/50 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Go Back
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Job summary */}
            <div className="mt-5 pt-4 border-t border-[#E6EEF6] dark:border-[#1e2d3d] space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7C8F]">Service</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {job.serviceTypes?.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-[#4361EE]/10 text-[#4361EE] rounded-full text-xs font-semibold capitalize">{s.replace("-", " ")}</span>
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
                  <DollarSign className="w-4 h-4 text-[#4361EE]" />
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
              <div className="pt-2">
                <p className="text-xs text-[#6B7C8F] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.address}, {job.city}
                </p>
              </div>
            </div>

            {/* View Other User Profile */}
            {otherUser && (
              <div className="mt-4 pt-3 border-t border-[#E6EEF6] dark:border-[#1e2d3d]">
                <Link
                  href={`/dashboard/u/${otherUser.uid}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F7FAFC] dark:hover:bg-[#1a2332] transition group"
                >
                  <div className="w-10 h-10 bg-[#4361EE] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {otherUser.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0B1F33] group-hover:text-[#4361EE] transition truncate">{otherUser.displayName}</p>
                    <p className="text-xs text-[#6B7C8F]">
                      {otherUser.city}, {otherUser.province}
                      {distance !== null && ` • ${distance.toFixed(1)} km away`}
                    </p>
                  </div>
                  <Star className="w-4 h-4 text-[#6B7C8F] group-hover:text-[#4361EE] transition" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}


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
