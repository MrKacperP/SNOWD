"use client";

import { isStripeAccountReady, stripeConnectFetch } from "@/lib/stripeConnectClient";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job, OperatorProfile, UserProfile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ProgressTracker from "@/components/ProgressTracker";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import CancellationPopup from "@/components/CancellationPopup";
import { WeatherCard, useWeather } from "@/context/WeatherContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Snowflake,
  CheckCircle2,
  Star,
  DollarSign,
  Clock,
  BarChart3,
  MapPin,
  Calendar,
  User,
  Check,
  X,
  TrendingUp,
  CalendarDays,
  ClipboardList,
  MessageCircle,
  ExternalLink,
  Shield,
  ArrowRight,
  Camera,
  CreditCard,
  FileText,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Bell,
  BadgeCheck,
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday } from "date-fns";

const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  try {
    const d = date instanceof Date ? date : new Date(date as string);
    return d instanceof Date && !isNaN(d.getTime());
  } catch {
    return false;
  }
};

function OperatorMiniCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="surface-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-[var(--text-primary)]">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] text-xs">◀</button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] text-xs">▶</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="py-1 text-[var(--text-muted)] font-medium">{d}</div>)}
        {days.map((day, i) => (
          <div key={i} className={`py-1.5 rounded-lg text-xs ${
            isToday(day) ? "bg-[var(--ink)] text-white font-bold" :
            isSameMonth(day, currentMonth) ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}>
            {format(day, "d")}
          </div>
        ))}
      </div>
      <Link href="/dashboard/calendar" className="mt-2 block text-center text-xs font-medium text-[var(--text-primary)] hover:underline">View Full Calendar</Link>
    </div>
  );
}

export default function OperatorDashboard() {
  const { profile } = useAuth();
  const { weather, loading: weatherLoading } = useWeather();
  const operatorProfile = profile as OperatorProfile;
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(operatorProfile?.isAvailable ?? true);
  const [celebration, setCelebration] = useState<{ show: boolean; type: "accepted" | "completion" }>({ show: false, type: "accepted" });
  const [declineJobId, setDeclineJobId] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    fullyReady?: boolean;
  } | null>(null);
  const [notifications, setNotifications] = useState<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: unknown;
  }[]>([]);
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  // Check Stripe status
  useEffect(() => {
    const checkStripe = async () => {
      const accountId = (operatorProfile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId;
      if (!accountId) return;
      try {
        const res = await stripeConnectFetch("/api/stripe/account-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });
        const data = await res.json();
        if (!data.error) setStripeStatus(data);
      } catch {}
    };
    checkStripe();
  }, [operatorProfile]);

  // Listen for notifications
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as typeof notifications[0]));
      setNotifications(notifs);
      // Show banner if there are unread notifications
      if (notifs.some((n) => !n.read)) {
        setShowNotifBanner(true);
      }
    }, (error) => {
      // Index may still be building — suppress error and retry silently
      if (error.code === "failed-precondition") {
        console.warn("Notifications index not ready yet, will retry when available.");
      } else {
        console.error("Notifications listener error:", error);
      }
    });
    return () => unsub();
  }, [profile?.uid]);

  // Compute setup steps for dynamic widget
  const setupSteps = React.useMemo(() => {
    if (!operatorProfile) return [];
    const extProfile = operatorProfile as OperatorProfile & {
      stripeConnectAccountId?: string;
      idPhotoUrl?: string;
      accountApproved?: boolean;
      verificationStatus?: string;
      bio?: string;
      portfolioPhotos?: string[];
      tagline?: string;
      logoUrl?: string;
    };

    const steps: { key: string; label: string; done: boolean; icon: React.ReactNode; href: string; description: string }[] = [
      {
        key: "id",
        label: "Upload Government ID",
        done: !!extProfile.idPhotoUrl,
        icon: <Camera className="w-4 h-4" />,
        href: "/dashboard/settings?tab=verification",
        description: "Required for account verification",
      },
      {
        key: "approval",
        label: "Account Verification",
        done: !!extProfile.idVerified,
        icon: <Shield className="w-4 h-4" />,
        href: "/dashboard/settings?tab=verification",
        description: extProfile.verificationStatus === "approved"
          ? "Verified & approved"
          : extProfile.verificationStatus === "rejected"
          ? "Verification rejected — re-submit ID"
          : extProfile.verificationStatus === "pending" || (extProfile.idPhotoUrl && !extProfile.accountApproved)
          ? "Pending admin review"
          : !extProfile.idPhotoUrl
          ? "Upload ID first"
          : "Verified & approved",
      },
      {
        key: "stripe",
        label: "Set Up Stripe Payments",
        done: !!(stripeStatus?.fullyReady || (stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled)),
        icon: <CreditCard className="w-4 h-4" />,
        href: "/dashboard/settings?tab=payment",
        description: extProfile.stripeConnectAccountId
          ? stripeStatus?.fullyReady ? "Ready to receive payments" : "Finish Stripe setup"
          : "Connect your bank account",
      },
      {
        key: "bio",
        label: "Complete Your Profile",
        done: !!(extProfile.bio && extProfile.bio.length > 10),
        icon: <FileText className="w-4 h-4" />,
        href: "/dashboard/profile",
        description: "Add a detailed bio for clients",
      },
      {
        key: "branding",
        label: "Add Business Branding",
        done: !!((extProfile.portfolioPhotos && extProfile.portfolioPhotos.length > 0) || extProfile.logoUrl),
        icon: <Briefcase className="w-4 h-4" />,
        href: "/dashboard/settings?tab=branding",
        description: "Logo & portfolio photos",
      },
    ];
    return steps;
  }, [operatorProfile, stripeStatus]);

  const completedSetupCount = setupSteps.filter((s) => s.done).length;
  const totalSetupSteps = setupSteps.length;
  const allSetupComplete = completedSetupCount === totalSetupSteps;
  const nextOperatorSetupStep = setupSteps.find((step) => !step.done);
  const setupPercent = totalSetupSteps ? Math.round((completedSetupCount / totalSetupSteps) * 100) : 100;
  const isAccountPublic = !!(operatorProfile as OperatorProfile & { idVerified?: boolean })?.idVerified;

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile?.uid) return;
      try {
        const allQuery = query(
          collection(db, "jobs"),
          where("operatorId", "==", profile.uid)
        );
        const snap = await getDocs(allQuery);
        const allJobs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate,
            startTime: data.startTime?.toDate?.() || data.startTime,
            completionTime: data.completionTime?.toDate?.() || data.completionTime,
          } as Job;
        });

        const pending = allJobs
          .filter((j) => j.status === "pending")
          .sort((a, b) => {
            const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bT - aT;
          });
        setPendingJobs(pending);

        const active = allJobs
          .filter((j) => ["accepted", "en-route", "in-progress"].includes(j.status))
          .sort((a, b) => {
            const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bT - aT;
          });
        setActiveJobs(active);

        const completed = allJobs
          .filter((j) => j.status === "completed")
          .sort((a, b) => {
            const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bT - aT;
          })
          .slice(0, 5);
        setCompletedJobs(completed);

        const clientIds = [...new Set(allJobs.map((j) => j.clientId))];
        const names: Record<string, string> = {};
        await Promise.all(
          clientIds.map(async (cid) => {
            try {
              const userDoc = await getDoc(doc(db, "users", cid));
              if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                names[cid] = data.displayName || "Client";
              }
            } catch {}
          })
        );
        setClientNames(names);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [profile?.uid]);

  const toggleAvailability = async () => {
    if (!profile?.uid) return;
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    try {
      await updateDoc(doc(db, "users", profile.uid), { isAvailable: newVal });
    } catch {
      setIsAvailable(!newVal);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const requestedJob = pendingJobs.find((job) => job.id === jobId);
      if (!requestedJob || !operatorProfile?.idVerified || (requestedJob.paymentMethod !== "cash" && !(await isStripeAccountReady(operatorProfile.stripeConnectAccountId)))) {
        alert("Verify your ID to accept cash jobs. Complete Stripe setup before accepting platform payments.");
        return;
      }
      // Enforce one active job at a time
      const inProgressJob = activeJobs.find((j) => ["in-progress", "en-route"].includes(j.status));
      if (inProgressJob) {
        alert("You already have an active job in progress. Please complete it before accepting a new one.");
        setActionLoading(null);
        return;
      }
      const acceptedJob = activeJobs.find((j) => j.status === "accepted");
      if (acceptedJob) {
        alert("You already have an accepted job. Please complete or start it before accepting another.");
        setActionLoading(null);
        return;
      }

      await updateDoc(doc(db, "jobs", jobId), {
        status: "accepted",
        updatedAt: new Date(),
      });

      // Send system message to notify client
      const job = pendingJobs.find((j) => j.id === jobId);
      if (job?.chatId) {
        const { addDoc, collection: fbCollection, Timestamp } = await import("firebase/firestore");
        const systemMessage = `${operatorProfile?.displayName || "Operator"} accepted your job!`;

        await addDoc(fbCollection(db, "messages"), {
          chatId: job.chatId,
          senderId: "system",
          senderName: "System",
          type: "status-update",
          content: systemMessage,
          read: false,
          createdAt: Timestamp.now(),
        });

        // Auto-send payment request to client
        if (job.paymentMethod !== "cash" && job.paymentStatus === "pending") {
          const paymentMessage = `${operatorProfile?.displayName || "Operator"} has accepted the job! Please pay $${job.price} CAD to confirm — funds are held securely by snowd.ca until job completion.`;
          await addDoc(fbCollection(db, "messages"), {
            chatId: job.chatId,
            senderId: "system",
            senderName: "System",
            type: "payment-request",
            content: paymentMessage,
            read: false,
            createdAt: Timestamp.now(),
            metadata: { amount: job.price },
          });
        }

        // Update chat lastMessage
        await updateDoc(doc(db, "chats", job.chatId), {
          lastMessage: systemMessage,
          lastMessageTime: Timestamp.now(),
          [`unreadCount.${job.clientId}`]: (job as unknown as Record<string, unknown>).unreadClient
            ? Number((job as unknown as Record<string, unknown>).unreadClient) + 1
            : 1,
        });
      }

      if (job) {
        setPendingJobs(pendingJobs.filter((j) => j.id !== jobId));
        setActiveJobs([{ ...job, status: "accepted" as const }, ...activeJobs]);
      }
      setCelebration({ show: true, type: "accepted" });
    } catch {
      alert("Failed to accept job.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineJob = async (jobId: string) => {
    setDeclineJobId(jobId);
  };

  const confirmDeclineJob = async () => {
    if (!declineJobId) return;
    setDeclining(true);
    try {
      await updateDoc(doc(db, "jobs", declineJobId), {
        status: "cancelled",
        cancelledBy: profile?.uid,
        updatedAt: new Date(),
      });
      setPendingJobs(pendingJobs.filter((j) => j.id !== declineJobId));
    } catch {
      alert("Failed to decline job.");
    } finally {
      setDeclining(false);
      setDeclineJobId(null);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.price || 0), 0);
  const firstName = operatorProfile?.displayName?.split(" ")[0] || "there";
  const locationLabel =
    [operatorProfile?.city, operatorProfile?.province].filter(Boolean).join(", ") || "Your service area";
  const primaryOperatorAction = nextOperatorSetupStep
    ? {
        href: nextOperatorSetupStep.href,
        label: nextOperatorSetupStep.label,
        icon: nextOperatorSetupStep.icon,
      }
    : {
        href: "/dashboard/jobs",
        label: pendingJobs.length > 0 ? "Review Job Requests" : "View Job Board",
        icon: <Briefcase className="h-5 w-5" />,
      };

  return (
    <div className="mx-auto max-w-[1240px] space-y-4">
      <CelebrationOverlay
        type={celebration.type}
        show={celebration.show}
        onComplete={() => setCelebration({ ...celebration, show: false })}
      />
      <CancellationPopup
        isOpen={!!declineJobId}
        onConfirm={confirmDeclineJob}
        onCancel={() => setDeclineJobId(null)}
        title="Decline this job?"
        message="The client will be notified that their request was declined. This cannot be undone."
        confirmLabel="Yes, Decline"
        cancelLabel="Keep It"
        loading={declining}
      />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-panel overflow-hidden text-[var(--text-primary)]"
      >
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="p-5 md:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {isAccountPublic ? (
                <BadgeCheck className="h-4 w-4 text-[var(--accent-mint)]" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[#7a4b00]" />
              )}
              {isAccountPublic ? "Profile live" : "Finish setup"}
            </div>
            <h1 className="mt-4 text-3xl md:text-[2.25rem] font-headline font-extrabold leading-tight">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)] md:text-base">
              This is your operator command center. Finish the essentials first, then keep requests, messages, and payouts moving from one clear place.
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              <MapPin className="h-4 w-4" />
              {locationLabel}
            </p>

            <div className="mt-5 flex items-center gap-2 flex-wrap">
              <Link
                href={primaryOperatorAction.href}
                className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[var(--ink)] px-5 py-2.5 text-sm font-bold leading-tight text-white shadow-[var(--surface-shadow)] ring-1 ring-black/10 transition hover:bg-black hover:shadow-[var(--surface-shadow)] hover:-translate-y-0.5 active:scale-[0.99] md:text-base"
              >
                {primaryOperatorAction.icon}
                {primaryOperatorAction.label}
              </Link>
              {isAccountPublic ? (
                <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#bde4cb] bg-[#eaf7ef] px-3 py-1 text-xs font-semibold text-[var(--accent-mint)]">
                  <BadgeCheck className="w-3.5 h-3.5" /> Public
                </span>
              ) : (
                <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#f5c58f] bg-[var(--accent-sun-soft)] px-3 py-1 text-xs font-semibold text-[#7a4b00]">
                  <AlertCircle className="w-3.5 h-3.5" /> Not Public
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { icon: Clock, label: "Requests", value: pendingJobs.length ? `${pendingJobs.length} pending` : "None pending" },
                { icon: CheckCircle2, label: "Active", value: activeJobs.length ? `${activeJobs.length} active` : "No active job" },
                { icon: DollarSign, label: "Earnings", value: `$${totalEarnings}` },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border-[3px] border-[var(--border-soft)] bg-[var(--bg-secondary)] px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex w-fit items-center gap-3 rounded-xl border-[3px] border-[var(--border-color)] bg-white px-4 py-3">
              <button
                onClick={toggleAvailability}
                className={`relative h-7 w-14 rounded-full transition-colors ${isAvailable ? "bg-[var(--accent-mint)]" : "bg-[var(--text-muted)]"}`}
                aria-label={isAvailable ? "Pause availability" : "Resume availability"}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isAvailable ? "left-7" : "left-0.5"}`}
                />
              </button>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {isAvailable ? "Available for new requests" : "Paused"}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--border-soft)] bg-[var(--bg-secondary)] p-5 md:p-6 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border-[3px] border-[var(--border-color)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Next best step</p>
                  <h2 className="mt-1 text-xl font-headline font-bold text-[var(--text-primary)]">
                    {nextOperatorSetupStep ? nextOperatorSetupStep.label : pendingJobs.length > 0 ? "Review new requests" : "Stay ready for nearby jobs"}
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--accent-sun-soft)] px-2.5 py-1 text-xs font-bold text-[#7a4b00]">
                  {setupPercent}%
                </span>
              </div>
              <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                {nextOperatorSetupStep
                  ? nextOperatorSetupStep.description
                  : "Keep availability on, watch incoming requests, and reply quickly when a client books you."}
              </p>
              <div className="mt-4 h-2 rounded-full bg-[var(--bg-secondary)]">
                <motion.div
                  className="h-full rounded-full bg-[var(--accent-sun)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${setupPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            <Link
              href="/dashboard/calendar"
              className="group mt-3 block rounded-2xl border-[3px] border-[var(--border-color)] bg-white px-4 py-4 transition hover:border-[var(--ink)]/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text-muted)]">Today&apos;s Weather</p>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
              </div>
              {weatherLoading ? (
                <p className="mt-2 text-sm text-[var(--text-muted)]">Loading weather...</p>
              ) : weather ? (
                <div className="mt-2 flex items-end justify-between">
                  <div className="min-w-0">
                    <p className="text-4xl font-headline font-bold leading-none">{weather.temp}°C</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Feels {weather.feelsLike}°</p>
                    <p className="mt-1 truncate text-lg font-semibold">{weather.condition}</p>
                  </div>
                  <div className="text-4xl" aria-hidden>
                    {weather.icon}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-muted)]">Weather unavailable</p>
              )}
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Notification Banner — shows when account is approved */}
      <AnimatePresence>
        {showNotifBanner && notifications.filter((n) => !n.read).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            {notifications.filter((n) => !n.read).map((notif) => (
              <div
                key={notif.id}
                className={`rounded-2xl border p-4 mb-2 flex items-start gap-3 ${
                  notif.type === "account_approved"
                    ? "bg-green-50 border-green-200"
                    : notif.type === "account_rejected"
                    ? "bg-red-50 border-red-200"
                    : "bg-[var(--accent-soft)] border-[var(--border-color)]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.type === "account_approved" ? "bg-[#eaf7ef]" : notif.type === "account_rejected" ? "bg-red-100" : "bg-[var(--bg-secondary)]"
                }`}>
                  {notif.type === "account_approved" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : notif.type === "account_rejected" ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-[var(--text-primary)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${
                    notif.type === "account_approved" ? "text-green-900" : notif.type === "account_rejected" ? "text-red-900" : "text-[var(--text-primary)]"
                  }`}>
                    {notif.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    notif.type === "account_approved" ? "text-green-700" : notif.type === "account_rejected" ? "text-red-700" : "text-[var(--text-secondary)]"
                  }`}>
                    {notif.message}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    // Mark as read
                    try {
                      await updateDoc(doc(db, "notifications", notif.id), { read: true });
                    } catch {}
                  }}
                  className="p-1 hover:bg-black/5 rounded-lg transition shrink-0"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Setup Widget — disappears once all steps are complete */}
      {!allSetupComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-[3px] border-[var(--border-color)] bg-[var(--bg-card-solid)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-[var(--text-primary)]">Profile Setup</h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {completedSetupCount} of {totalSetupSteps} complete
              </p>
            </div>
            <span className="text-sm font-bold text-[var(--accent-sun)]">
              {Math.round((completedSetupCount / totalSetupSteps) * 100)}%
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--bg-secondary)]">
            <motion.div
              className="h-full rounded-full bg-[var(--accent-sun)]"
              initial={{ width: 0 }}
              animate={{ width: `${(completedSetupCount / totalSetupSteps) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {setupSteps.find((step) => !step.done) && (
            <div className="mt-3">
              <Link
                href={setupSteps.find((step) => !step.done)?.href || "/dashboard/settings"}
                className="flex items-center justify-between gap-3 rounded-xl border-[3px] border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5 transition hover:bg-[var(--accent-soft)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Next step</p>
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {setupSteps.find((step) => !step.done)?.label}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Weather + Calendar Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeatherCard />
        <OperatorMiniCalendar />
      </div>

      {/* Stats Grid — Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: "Pending", value: pendingJobs.length, color: "text-[#7a4b00]", bg: "bg-[var(--accent-sun-soft)]", href: "/dashboard/jobs" },
          { icon: CheckCircle2, label: "Active", value: activeJobs.length, color: "text-[var(--accent-mint)]", bg: "bg-[#eaf7ef]", href: "/dashboard/log" },
          { icon: DollarSign, label: "Earnings", value: `$${totalEarnings}`, color: "text-[var(--text-primary)]", bg: "bg-[var(--accent-soft)]", href: "/dashboard/transactions" },
          { icon: Star, label: "Rating", value: operatorProfile?.rating?.toFixed(1) || "—", color: "text-[#7a4b00]", bg: "bg-[var(--accent-sun-soft)]", href: "/dashboard/analytics" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Link href={stat.href} className="block bg-[var(--bg-card-solid)] rounded-xl p-4 border-[3px] border-[var(--border-subtle)] hover-lift interactive-card">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-3 p-4 bg-[var(--bg-card-solid)] rounded-xl border-[3px] border-[var(--border-subtle)] hover-lift interactive-card"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
            <CalendarDays className="w-5 h-5 text-[var(--text-primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Calendar</p>
            <p className="text-xs text-[var(--text-secondary)]">Plan your route and availability</p>
          </div>
        </Link>
        <Link
          href="/dashboard/log"
          className="flex items-center gap-3 p-4 bg-[var(--bg-card-solid)] rounded-xl border-[3px] border-[var(--border-subtle)] hover-lift interactive-card"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)]">
            <ClipboardList className="w-5 h-5 text-[var(--text-primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Job Log</p>
            <p className="text-xs text-[var(--text-secondary)]">Track completed and active jobs</p>
          </div>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-3 p-4 bg-[var(--bg-card-solid)] rounded-xl border-[3px] border-[var(--border-subtle)] hover-lift interactive-card"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ef]">
            <BarChart3 className="w-5 h-5 text-[var(--accent-mint)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Analytics</p>
            <p className="text-xs text-[var(--text-secondary)]">Watch earnings and job quality</p>
          </div>
        </Link>
      </div>

      {/* Pending Requests */}
      {pendingJobs.length > 0 && (
        <div className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">New Requests</h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-white">
                {pendingJobs.length}
              </span>
            </div>
            <Link href="/dashboard/jobs" className="text-sm font-medium text-[var(--text-primary)] hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-soft)]">
            {pendingJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/dashboard/u/${job.clientId}`} className="flex-1 group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <User className="w-4 h-4 text-[var(--text-primary)]" />
                      <p className="font-semibold text-[var(--text-primary)]">{clientNames[job.clientId] || "Client"}</p>
                      <ExternalLink className="w-3 h-3 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {job.scheduledDate && isValidDate(job.scheduledDate)
                          ? format(job.scheduledDate instanceof Date ? job.scheduledDate : new Date(job.scheduledDate), "MMM d, yyyy")
                          : "TBD"}
                        {job.scheduledTime && ` at ${job.scheduledTime}`}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">${job.price}</span>
                    </div>
                  </Link>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDeclineJob(job.id)}
                      disabled={actionLoading === job.id}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={actionLoading === job.id}
                      className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg border border-green-200 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Jobs */}
      <div className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="font-semibold text-lg">Active Jobs</h2>
          <Link href="/dashboard/log" className="text-sm font-medium text-[var(--text-primary)] hover:underline">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading jobs...</div>
        ) : activeJobs.length === 0 && pendingJobs.length === 0 ? (
          <div className="p-8 text-center">
            <Snowflake className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">No active jobs right now</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)] text-sm">No accepted jobs yet. Check your requests above!</div>
        ) : (
          <div className="divide-y divide-[var(--border-soft)]">
            {activeJobs.map((job) => (
              <div key={job.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/dashboard/u/${job.clientId}`} className="flex items-center gap-2 group">
                    <User className="w-4 h-4 text-[var(--text-primary)]" />
                    <span className="font-semibold text-[var(--text-primary)]">{clientNames[job.clientId] || "Client"}</span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100" />
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">${job.price}</span>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
                <ProgressTracker status={job.status} />
                {/* Queue indicator */}
                {job.status === "accepted" && activeJobs.some((j) => j.status === "in-progress") && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">
                      Queued — will start after current job
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    {job.serviceTypes?.map((s) => s.replace("-", " ")).join(", ")}
                  </p>
                  <Link
                    href={`/dashboard/messages/${job.chatId}`}
                    className="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:underline"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Card */}
      <div className="surface-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Performance</h2>
          <Link href="/dashboard/analytics" className="flex items-center gap-1 text-sm font-medium text-[var(--text-primary)] hover:underline">
            <TrendingUp className="w-4 h-4" />
            Full Analytics
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-[var(--accent-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {operatorProfile?.totalJobsCompleted || 0}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Jobs Done</p>
          </div>
          <div className="rounded-xl bg-[var(--accent-sun-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[#7a4b00]">
              {operatorProfile?.rating?.toFixed(1) || "—"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Avg Rating</p>
          </div>
          <div className="rounded-xl bg-[#eaf7ef] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-mint)]">
              ${totalEarnings}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Earned</p>
          </div>
        </div>
      </div>
    </div>
  );
}
