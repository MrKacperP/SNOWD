"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  ActivityEvent,
  AdminNotification,
  AdminSettingsState,
  AdminUser,
  CallItem,
  ChatItem,
  ClaimItem,
  EmployeeItem,
  JobItem,
  SupportTicket,
  TransactionItem,
  VerificationItem,
} from "@/lib/admin/types";

type Decision = "Approved" | "Rejected";
type RejectionReasonCategory = "document-quality" | "name-mismatch" | "expired-id" | "unsupported-document" | "other";

type ReviewVerificationOptions = {
  reasonCategory?: RejectionReasonCategory;
  reasonNote?: string;
  reviewedByUid?: string;
  where?: string;
};

const DEFAULT_SETTINGS: AdminSettingsState = {
  siteName: "Snowd",
  supportEmail: "support@snowd.ca",
  timezone: "America/Toronto",
  notifications: {
    newVerification: true,
    newClaim: true,
    newSupportTicket: true,
    largeTransaction: false,
  },
  twoFactorEnabled: false,
  sessionTimeout: "30 min",
};

const toIsoDate = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
};

const toDateShort = (value: unknown): string => toIsoDate(value).slice(0, 10);

const toTimeLabel = (value: unknown): string => {
  const iso = toIsoDate(value);
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const toRelativeLabel = (value: unknown): string => {
  const date = new Date(toIsoDate(value));
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
};

const initials = (name: string): string =>
  name
    .split(" ")
    .map((p) => p.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("") || "U";

const titleCase = (value: string): string =>
  value
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1).toLowerCase()}`)
    .join(" ");

interface AdminContextValue {
  users: AdminUser[];
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  verifications: VerificationItem[];
  jobs: JobItem[];
  chats: ChatItem[];
  supportTickets: SupportTicket[];
  calls: CallItem[];
  transactions: TransactionItem[];
  claims: ClaimItem[];
  activityEvents: ActivityEvent[];
  employees: EmployeeItem[];
  settings: AdminSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettingsState>>;
  notifications: AdminNotification[];
  unreadNotifications: number;
  pendingVerificationCount: number;
  openSupportCount: number;
  supportUnreadCount: number;
  activityChart: Array<{ date: string; value: number }>;
  analyticsUsers: Array<{ date: string; value: number }>;
  analyticsRevenue: Array<{ date: string; value: number }>;
  analyticsCategories: Array<{ category: string; value: number }>;
  analyticsSupportResolution: Array<{ name: string; value: number }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<AdminNotification, "id" | "createdAt" | "read">) => void;
  setSupportTicketStatus: (id: string, status: SupportTicket["status"]) => void;
  sendSupportReply: (id: string, message: string) => void;
  reviewVerification: (id: string, decision: Decision, reviewedBy: string, options?: ReviewVerificationOptions) => void;
  flagJob: (id: string) => void;
  deleteJob: (id: string) => void;
  updateEmployeeRole: (id: string, role: EmployeeItem["role"]) => void;
  deactivateEmployee: (id: string) => void;
  inviteEmployee: (name: string, email: string, role: EmployeeItem["role"]) => void;
  resolveClaim: (id: string, decision: "Approve Claim" | "Reject Claim" | "Request More Info") => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [settings, setSettings] = useState<AdminSettingsState>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const appendAdminActivityEvent = async (event: Omit<ActivityEvent, "id">) => {
    setActivityEvents((prev) => [{ ...event, id: createId("a") }, ...prev]);
    if (!isFirebaseConfigured || !db) return;
    try {
      await addDoc(collection(db, "adminActivity"), {
        ...event,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[AdminProvider] Failed to append admin activity", error);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const mappedUsers: AdminUser[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const roleRaw = String(data.role || "client").toLowerCase();
        const status: AdminUser["status"] =
          data.accountApproved === false
            ? "Pending"
            : data.disabled === true
              ? "Suspended"
              : "Active";

        return {
          id: d.id,
          avatar: initials(String(data.displayName || data.email || d.id)),
          name: String(data.displayName || "Unnamed User"),
          email: String(data.email || ""),
          role:
            roleRaw === "operator"
              ? "Operator"
              : roleRaw === "admin"
                ? "Admin"
                : roleRaw === "employee"
                  ? "Employee"
                  : "Client",
          status,
          joinDate: toDateShort(data.createdAt),
        };
      });

      setUsers(mappedUsers);

      const employeeRows = mappedUsers
        .filter((u) => u.role === "Admin" || u.role === "Employee")
        .map((u) => ({
          id: u.id,
          avatar: u.avatar,
          name: u.name,
          email: u.email,
          role: u.role === "Admin" ? "Super Admin" : "Support Agent",
          status: u.status === "Suspended" ? "Inactive" : "Active",
          lastLogin: "-",
        } as EmployeeItem));
      setEmployees(employeeRows);

      const verificationRows: VerificationItem[] = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown>)
        .filter((u) => Boolean(u.idPhotoUrl) || String(u.verificationStatus || "") !== "")
        .map((u) => {
          const statusRaw = String(u.verificationStatus || "pending").toLowerCase();
          const status: VerificationItem["status"] =
            statusRaw === "approved"
              ? "Approved"
              : statusRaw === "rejected"
                ? "Rejected"
                : "Pending";

          return {
            id: String(u.id),
            userId: String(u.id),
            userName: String(u.displayName || "Unnamed User"),
            userAvatar: initials(String(u.displayName || u.email || u.id)),
            type: "ID",
            submissionDate: toDateShort(u.createdAt),
            status,
            idPhotoUrl: typeof u.idPhotoUrl === "string" ? String(u.idPhotoUrl) : undefined,
            rejectionReasonCategory:
              typeof u.verificationReasonCategory === "string"
                ? (u.verificationReasonCategory as RejectionReasonCategory)
                : undefined,
            rejectionReasonNote: typeof u.verificationNote === "string" ? String(u.verificationNote) : undefined,
            reviewedByUid: typeof u.reviewedByAdminUid === "string" ? String(u.reviewedByAdminUid) : undefined,
            reviewedBy: status === "Pending" ? undefined : "Admin",
            reviewedDate: status === "Pending" ? undefined : toDateShort(u.approvedAt || u.rejectedAt || u.createdAt),
          };
        });

      setVerifications(verificationRows);
    });

    const unsubJobs = onSnapshot(collection(db, "jobs"), (snap) => {
      const mapped: JobItem[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const serviceTypes = Array.isArray(data.serviceTypes) ? (data.serviceTypes as string[]) : [];
        const statusRaw = String(data.status || "pending").toLowerCase();
        const status: JobItem["status"] =
          statusRaw === "completed"
            ? "Completed"
            : statusRaw === "in-progress" || statusRaw === "en-route" || statusRaw === "accepted"
              ? "In Progress"
              : data.adminFlagged === true
                ? "Flagged"
                : "Open";

        return {
          id: d.id,
          title: serviceTypes.length ? serviceTypes.map(titleCase).join(", ") : "Job",
          postedBy: String(data.clientName || data.clientId || "Unknown"),
          category: serviceTypes[0]
            ? titleCase(serviceTypes[0]) === "Salting"
              ? "Salting"
              : titleCase(serviceTypes[0]) === "Shoveling"
                ? "Shoveling"
                : "Snow Removal"
            : "Snow Removal",
          status,
          datePosted: toDateShort(data.createdAt),
          description: String(data.specialInstructions || "No description provided."),
          assignedUsers: data.operatorId ? [String(data.operatorId)] : [],
          timeline: ["Posted", status],
          chatId: String(data.chatId || ""),
        };
      });
      setJobs(mapped);
    });

    const unsubChats = onSnapshot(collection(db, "chats"), (snap) => {
      const mapped: ChatItem[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const participants = Array.isArray(data.participants) ? (data.participants as string[]) : [];
        return {
          id: d.id,
          participantA: participants[0] || "User A",
          participantB: participants[1] || "User B",
          avatarA: initials(participants[0] || "A"),
          avatarB: initials(participants[1] || "B"),
          lastMessage: String(data.lastMessage || ""),
          timestamp: toIsoDate(data.lastMessageTime),
          unreadCount: 0,
          messages: [],
        };
      });
      setChats(mapped);
    });

    const unsubSupport = onSnapshot(
      collection(db, "supportChats"),
      async (snap) => {
        const mapped = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data() as Record<string, unknown>;
            const statusRaw = String(data.status || "open").toLowerCase();
            const status: SupportTicket["status"] =
              statusRaw === "resolved" || statusRaw === "closed"
                ? "Resolved"
                : statusRaw === "in-progress"
                  ? "Waiting"
                  : "Open";

            let thread: SupportTicket["thread"] = [];
            let unreadReplies = 0;
            try {
              const messagesSnap = await getDocs(
                query(collection(db, "supportChats", d.id, "messages"), orderBy("createdAt", "asc"))
              );
              thread = messagesSnap.docs.map((msgDoc) => {
                const msg = msgDoc.data() as Record<string, unknown>;
                const senderId = String(msg.senderId || "");
                const isUserMessage = senderId !== "SNOWD_ADMIN";
                const isRead = Boolean(msg.read);
                if (isUserMessage && !isRead) unreadReplies += 1;
                return {
                  id: msgDoc.id,
                  sender: senderId === "SNOWD_ADMIN" ? "admin" : "user",
                  text: String(msg.content || ""),
                  time: toTimeLabel(msg.createdAt),
                };
              });
            } catch (error) {
              console.error("[AdminProvider] Failed to load support thread", error);
            }

            const sortTime = new Date(toIsoDate(data.lastMessageTime || data.updatedAt || data.createdAt)).getTime();

            return {
              id: d.id,
              userName: String(data.userName || "User"),
              userAvatar: initials(String(data.userName || "U")),
              subject: String(data.subject || data.problemCategory || data.lastMessage || "Support ticket"),
              status,
              urgency: "Medium",
              lastMessageAgo: toRelativeLabel(data.lastMessageTime || data.updatedAt),
              unreadReplies,
              thread,
              sortTime,
            } as SupportTicket & { sortTime: number };
          })
        );

        mapped.sort((a, b) => {
          return b.sortTime - a.sortTime;
        });

        setSupportTickets(mapped.map(({ sortTime: _sortTime, ...ticket }) => ticket));
      }
    );

    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snap) => {
      const mapped: TransactionItem[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const statusRaw = String(data.status || "pending").toLowerCase();
        const status: TransactionItem["status"] =
          statusRaw === "paid" ? "Completed" : statusRaw === "held" ? "Pending" : "Failed";
        return {
          id: d.id,
          fromUser: String(data.clientName || data.clientId || "-"),
          toUser: String(data.operatorName || data.operatorId || "-"),
          amount: Number(data.amount || 0),
          type: statusRaw === "refunded" ? "Refund" : "Payment",
          status,
          date: toDateShort(data.createdAt),
          linkedJobId: String(data.jobId || ""),
          disputeHistory: [],
        };
      });
      setTransactions(mapped);
    });

    const unsubClaims = onSnapshot(collection(db, "claims"), (snap) => {
      const mapped: ClaimItem[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const statusRaw = String(data.status || "open").toLowerCase();
        return {
          id: d.id,
          claimantName: String(data.claimantName || data.claimantId || "User"),
          claimantAvatar: initials(String(data.claimantName || data.claimantId || "U")),
          claimType:
            statusRaw === "billing"
              ? "Billing"
              : statusRaw === "no-show"
                ? "No Show"
                : "Property Damage",
          amountDisputed: Number(data.amountDisputed || 0),
          submissionDate: toDateShort(data.createdAt),
          status: statusRaw === "resolved" || statusRaw === "dismissed" ? "Resolved" : "Open",
          description: String(data.description || ""),
          evidence: Array.isArray(data.photoUrls) ? (data.photoUrls as string[]) : [],
        };
      });
      setClaims(mapped);
    });

    const unsubNotifications = onSnapshot(
      query(collection(db, "adminNotifications"), orderBy("createdAt", "desc")),
      (snap) => {
        const mapped: AdminNotification[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const type = String(data.type || "system");
          return {
            id: d.id,
            type:
              type === "verification" ||
              type === "user" ||
              type === "job" ||
              type === "support" ||
              type === "transaction" ||
              type === "claim"
                ? type
                : "system",
            message: String(data.message || ""),
            createdAt: toIsoDate(data.createdAt),
            read: Boolean(data.read),
            href: typeof data.meta === "object" && data.meta !== null && "path" in data.meta ? String((data.meta as Record<string, unknown>).path || "/admin") : "/admin",
          };
        });

        setNotifications(mapped);
      }
    );

    const unsubAdminActivity = onSnapshot(
      query(collection(db, "adminActivity"), orderBy("createdAt", "desc")),
      (snap) => {
        const mapped: ActivityEvent[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            userName: String(data.userName || "System"),
            userAvatar: String(data.userAvatar || "SY"),
            description: String(data.description || ""),
            timestamp: toIsoDate(data.timestamp || data.createdAt),
            type:
              data.type === "Job" ||
              data.type === "Chat" ||
              data.type === "Transaction" ||
              data.type === "Verification" ||
              data.type === "Support" ||
              data.type === "User"
                ? data.type
                : "User",
            href: String(data.href || "/admin"),
            actorUid: typeof data.actorUid === "string" ? String(data.actorUid) : undefined,
            actorRole:
              data.actorRole === "Admin" || data.actorRole === "Employee" || data.actorRole === "System"
                ? data.actorRole
                : undefined,
            actionType: typeof data.actionType === "string" ? String(data.actionType) : undefined,
            targetId: typeof data.targetId === "string" ? String(data.targetId) : undefined,
            where: typeof data.where === "string" ? String(data.where) : undefined,
          };
        });
        setActivityEvents(mapped);
      },
      (error) => {
        const code = (error as { code?: string }).code || "";
        if (code !== "permission-denied") {
          console.warn("[AdminProvider] adminActivity listener unavailable", error);
        }
      }
    );

    const unsubCalls = onSnapshot(collection(db, "calls"), (snap) => {
      const mapped: CallItem[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const statusRaw = String(data.status || "completed").toLowerCase();
        return {
          id: d.id,
          caller: String(data.caller || "-"),
          receiver: String(data.receiver || "-"),
          callerId: typeof data.callerId === "string" ? String(data.callerId) : undefined,
          receiverId: typeof data.receiverId === "string" ? String(data.receiverId) : undefined,
          callerEmail: typeof data.callerEmail === "string" ? String(data.callerEmail) : undefined,
          receiverEmail: typeof data.receiverEmail === "string" ? String(data.receiverEmail) : undefined,
          callerPhone: typeof data.callerPhone === "string" ? String(data.callerPhone) : undefined,
          receiverPhone: typeof data.receiverPhone === "string" ? String(data.receiverPhone) : undefined,
          duration: String(data.duration || "00:00"),
          durationSeconds: Number.isFinite(Number(data.durationSeconds)) ? Number(data.durationSeconds) : undefined,
          status:
            statusRaw === "missed" ? "Missed" : statusRaw === "in-progress" ? "In Progress" : "Completed",
          dateTime: toDateShort(data.createdAt),
          dateTimeIso: toIsoDate(data.createdAt),
          recordingUrl: String(data.recordingUrl || ""),
          recordingStatus:
            data.recordingStatus === "available" || data.recordingStatus === "processing" || data.recordingStatus === "missing"
              ? data.recordingStatus
              : undefined,
          notes: String(data.notes || ""),
          transcriptPreview: String(data.transcriptPreview || ""),
        };
      });
      setCalls(mapped);
    });

    return () => {
      unsubUsers();
      unsubJobs();
      unsubChats();
      unsubSupport();
      unsubTransactions();
      unsubClaims();
      unsubNotifications();
      unsubAdminActivity();
      unsubCalls();
    };
  }, []);

  const pendingVerificationCount = useMemo(
    () => verifications.filter((v) => v.status === "Pending").length,
    [verifications]
  );

  const openSupportCount = useMemo(
    () => supportTickets.filter((t) => t.status !== "Resolved").length,
    [supportTickets]
  );

  const supportUnreadCount = useMemo(
    () => supportTickets.reduce((sum, t) => sum + t.unreadReplies, 0),
    [supportTickets]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const pushNotification = async (n: Omit<AdminNotification, "id" | "createdAt" | "read">) => {
    if (!isFirebaseConfigured || !db) return;
    await addDoc(collection(db, "adminNotifications"), {
      type: n.type,
      message: n.message,
      read: false,
      createdAt: serverTimestamp(),
      meta: { path: n.href },
    });
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "adminNotifications", id), { read: true });
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (isFirebaseConfigured && db) {
      const unread = notifications.filter((n) => !n.read);
      if (!unread.length) return;
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, "adminNotifications", n.id), { read: true }));
      await batch.commit();
    }
  };

  const reviewVerification = async (
    id: string,
    decision: Decision,
    reviewedBy: string,
    options?: ReviewVerificationOptions
  ) => {
    const reviewedDate = new Date().toISOString().slice(0, 10);
    const normalizedReasonNote = options?.reasonNote?.trim() || "";
    const normalizedReasonCategory = options?.reasonCategory;
    setVerifications((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status: decision,
              rejectionReasonCategory: decision === "Rejected" ? normalizedReasonCategory : undefined,
              rejectionReasonNote: decision === "Rejected" ? normalizedReasonNote : undefined,
              reviewedByUid: options?.reviewedByUid,
              reviewedBy,
              reviewedDate,
            }
          : v
      )
    );

    const target = verifications.find((v) => v.id === id);
    if (target) {
      await pushNotification({
        type: "verification",
        message: `${target.userName} verification ${decision.toLowerCase()}`,
        href: "/admin/verifications",
      });
      await appendAdminActivityEvent({
        userName: target.userName,
        userAvatar: target.userAvatar,
        description:
          decision === "Rejected" && normalizedReasonNote
            ? `verification was rejected (${normalizedReasonNote})`
            : `verification was ${decision.toLowerCase()}`,
        timestamp: new Date().toISOString(),
        type: "Verification",
        href: "/admin/verifications",
        actorUid: options?.reviewedByUid,
        actorRole: options?.reviewedByUid ? "Admin" : "System",
        actionType: decision === "Approved" ? "verification-approved" : "verification-rejected",
        targetId: target.userId,
        where: options?.where || "/admin/verifications",
      });

      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, "notifications"), {
          uid: target.userId,
          type: decision === "Approved" ? "account_approved" : "account_rejected",
          title: decision === "Approved" ? "Account Approved" : "Verification Rejected",
          message:
            decision === "Approved"
              ? "Your ID has been approved. Your account is now public for client discovery."
              : normalizedReasonNote
                ? `Your ID verification was rejected: ${normalizedReasonNote}`
                : "Your ID verification was rejected. Please upload a clearer document.",
          read: false,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "users", target.userId), {
          verificationStatus: decision.toLowerCase(),
          idVerified: decision === "Approved",
          accountApproved: decision === "Approved",
          approvedAt: decision === "Approved" ? new Date() : null,
          rejectedAt: decision === "Rejected" ? new Date() : null,
          approvedByAdmin: decision === "Approved" ? reviewedBy : null,
          reviewedByAdminUid: options?.reviewedByUid || null,
          verificationReasonCategory: decision === "Rejected" ? normalizedReasonCategory || "other" : null,
          verificationNote: decision === "Rejected" ? normalizedReasonNote : "",
        });
      }
    }
  };

  const setSupportTicketStatus = async (id: string, status: SupportTicket["status"]) => {
    setSupportTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status, unreadReplies: status === "Resolved" ? 0 : t.unreadReplies } : t)));
    await pushNotification({
      type: "support",
      message: `Support ticket ${id.toUpperCase()} moved to ${status}`,
      href: "/admin/support-chats",
    });
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "supportChats", id), {
        status: status === "Resolved" ? "resolved" : status === "Waiting" ? "in-progress" : "open",
        updatedAt: new Date(),
      });
    }
  };

  const sendSupportReply = async (id: string, message: string) => {
    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              lastMessageAgo: "Just now",
              unreadReplies: 0,
              thread: [...t.thread, { id: createId("st"), sender: "admin", text: message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }],
            }
          : t
      )
    );
    if (isFirebaseConfigured && db) {
      await addDoc(collection(db, "supportChats", id, "messages"), {
        senderId: "SNOWD_ADMIN",
        senderName: "SNOWD Support",
        content: message,
        createdAt: new Date(),
        read: false,
      });
      await updateDoc(doc(db, "supportChats", id), {
        lastMessage: message,
        lastMessageTime: new Date(),
        updatedAt: new Date(),
      });
    }
  };

  const flagJob = async (id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "Flagged" } : j)));
    await pushNotification({ type: "job", message: `Job ${id.toUpperCase()} was flagged`, href: "/admin/jobs" });
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "jobs", id), { adminFlagged: true, updatedAt: new Date() });
    }
  };

  const deleteJob = async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await pushNotification({ type: "job", message: `Job ${id.toUpperCase()} was deleted`, href: "/admin/jobs" });
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, "jobs", id));
    }
  };

  const resolveClaim = async (id: string, decision: "Approve Claim" | "Reject Claim" | "Request More Info") => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: decision === "Request More Info" ? "Open" : "Resolved",
            }
          : c
      )
    );
    await pushNotification({
      type: "claim",
      message: `Claim ${id.toUpperCase()}: ${decision}`,
      href: "/admin/claims",
    });
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "claims", id), {
        status: decision === "Request More Info" ? "under-review" : "resolved",
        updatedAt: new Date(),
      });
    }
  };

  const updateEmployeeRole = async (id: string, role: EmployeeItem["role"]) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, role } : e)));
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "users", id), {
        role: role === "Super Admin" ? "admin" : "employee",
      });
    }
  };

  const deactivateEmployee = async (id: string) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, status: "Inactive" } : e)));
    await pushNotification({ type: "system", message: `Employee ${id.toUpperCase()} deactivated`, href: "/admin/employees" });
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "users", id), {
        disabled: true,
      });
    }
  };

  const inviteEmployee = async (name: string, email: string, role: EmployeeItem["role"]) => {
    const employee: EmployeeItem = {
      id: createId("e"),
      avatar: name.slice(0, 2).toUpperCase(),
      name,
      email,
      role,
      status: "Active",
      lastLogin: "Never",
    };
    setEmployees((prev) => [employee, ...prev]);
    await pushNotification({ type: "system", message: `Employee invited: ${name}`, href: "/admin/employees" });
    if (isFirebaseConfigured && db) {
      await addDoc(collection(db, "employeeInvites"), {
        name,
        email,
        role,
        createdAt: serverTimestamp(),
      });
    }
  };

  const activityChart = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        date: `Day ${i + 1}`,
        value: activityEvents[Math.min(i, activityEvents.length - 1)] ? Math.max(1, activityEvents.length - i) : 0,
      })),
    [activityEvents]
  );

  const analyticsUsers = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        date: `W${i + 1}`,
        value: Math.floor((users.length * (i + 1)) / 12),
      })),
    [users.length]
  );

  const analyticsRevenue = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        date: `W${i + 1}`,
        value: transactions
          .slice(0, Math.ceil(((i + 1) / 12) * Math.max(transactions.length, 1)))
          .reduce((sum, t) => sum + t.amount, 0),
      })),
    [transactions]
  );

  const analyticsCategories = useMemo(() => {
    const counts = jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.category] = (acc[job.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([category, value]) => ({ category, value }));
  }, [jobs]);

  const analyticsSupportResolution = useMemo(() => {
    const resolved = supportTickets.filter((t) => t.status === "Resolved").length;
    const open = supportTickets.length - resolved;
    return [
      { name: "Resolved", value: resolved },
      { name: "Open", value: open },
    ];
  }, [supportTickets]);

  const value: AdminContextValue = {
    users,
    setUsers,
    verifications,
    jobs,
    chats,
    supportTickets,
    calls,
    transactions,
    claims,
    activityEvents,
    employees,
    settings,
    setSettings,
    notifications,
    unreadNotifications,
    pendingVerificationCount,
    openSupportCount,
    supportUnreadCount,
    activityChart,
    analyticsUsers,
    analyticsRevenue,
    analyticsCategories,
    analyticsSupportResolution,
    markNotificationRead,
    markAllNotificationsRead,
    pushNotification,
    setSupportTicketStatus,
    sendSupportReply,
    reviewVerification,
    flagJob,
    deleteJob,
    updateEmployeeRole,
    deactivateEmployee,
    inviteEmployee,
    resolveClaim,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminData() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminData must be used inside AdminProvider");
  return ctx;
}
