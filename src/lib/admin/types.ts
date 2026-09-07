export type AdminNavKey =
  | "overview"
  | "users"
  | "verifications"
  | "jobs"
  | "chats"
  | "support"
  | "calls"
  | "transactions"
  | "claims"
  | "analytics"
  | "activity"
  | "employees"
  | "settings";

export type AdminNotificationType =
  | "user"
  | "verification"
  | "job"
  | "support"
  | "transaction"
  | "claim"
  | "system";

export type AdminNotificationPriority = "high" | "medium" | "low";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title?: string;
  message: string;
  senderName?: string;
  chatLabel?: string;
  preview?: string;
  chatId?: string;
  priority: AdminNotificationPriority;
  actionRequired: boolean;
  createdAt: string;
  read: boolean;
  href: string;
}

export interface AdminUser {
  id: string;
  avatar: string;
  name: string;
  email: string;
  role: "Client" | "Operator" | "Admin" | "Employee";
  status: "Active" | "Suspended" | "Pending";
  joinDate: string;
  phone?: string;
  bio?: string;
  idPhotoUrl?: string;
  portfolioPhotos?: string[];
}

export interface VerificationItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: "ID" | "License" | "Address";
  submissionDate: string;
  status: "Pending" | "Approved" | "Rejected";
  idPhotoUrl?: string;
  rejectionReasonCategory?: "document-quality" | "name-mismatch" | "expired-id" | "unsupported-document" | "other";
  rejectionReasonNote?: string;
  reviewedByUid?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  email?: string;
  phone?: string;
  role?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

export interface JobItem {
  id: string;
  title: string;
  postedBy: string;
  category: string;
  clientId?: string;
  address?: string;
  operatorNotes?: string;
  completionPhotoUrl?: string;
  scheduledDate?: string;
  completionTime?: string;
  price?: number;
  paymentStatus?: string;
  status: "Open" | "In Progress" | "Completed" | "Flagged" | "Cancelled";
  datePosted: string;
  description: string;
  assignedUsers: string[];
  timeline: string[];
  transactionId?: string;
  chatId?: string;
}

export interface ChatItem {
  id: string;
  participantA: string;
  participantB: string;
  avatarA: string;
  avatarB: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: Array<{ id: string; sender: "A" | "B"; text: string; time: string }>;
}

export interface SupportTicket {
  id: string;
  userName: string;
  userId?: string;
  createdAt?: string;
  userAvatar: string;
  subject: string;
  status: "Open" | "Waiting" | "Resolved";
  urgency: "High" | "Medium" | "Low";
  lastMessageAgo: string;
  unreadReplies: number;
  thread: Array<{ id: string; sender: "user" | "admin"; text: string; time: string }>;
}

export interface CallItem {
  id: string;
  caller: string;
  receiver: string;
  callerId?: string;
  receiverId?: string;
  callerEmail?: string;
  receiverEmail?: string;
  callerPhone?: string;
  receiverPhone?: string;
  duration: string;
  durationSeconds?: number;
  status: "Completed" | "Missed" | "In Progress";
  dateTime: string;
  dateTimeIso?: string;
  recordingUrl?: string;
  recordingStatus?: "available" | "processing" | "missing";
  notes?: string;
  transcriptPreview?: string;
}

export interface TransactionItem {
  id: string;
  clientId?: string;
  operatorId?: string;
  fromUser: string;
  toUser: string;
  amount: number;
  type: "Payment" | "Refund" | "Fee";
  status: "Completed" | "Pending" | "Failed";
  date: string;
  linkedJobId?: string;
  disputeHistory?: string[];
}

export interface ClaimItem {
  id: string;
  claimantName: string;
  claimantAvatar: string;
  claimType: "Property Damage" | "No Show" | "Billing";
  amountDisputed: number;
  submissionDate: string;
  status: "Open" | "Resolved";
  description: string;
  evidence: string[];
}

export interface ActivityEvent {
  id: string;
  userName: string;
  userAvatar: string;
  description: string;
  timestamp: string;
  type: "Job" | "Chat" | "Transaction" | "Verification" | "Support" | "User";
  href: string;
  actorUid?: string;
  actorRole?: "Admin" | "Employee" | "System";
  actionType?: string;
  targetId?: string;
  where?: string;
}

export interface EmployeeItem {
  id: string;
  avatar: string;
  name: string;
  email: string;
  role: "Super Admin" | "Moderator" | "Support Agent";
  status: "Active" | "Inactive";
  lastLogin: string;
}

export interface OverviewStat {
  label: string;
  value: string;
  trend: number;
}

export interface ChartPoint {
  date: string;
  value: number;
}

export interface AdminSettingsState {
  siteName: string;
  supportEmail: string;
  timezone: string;
  notifications: {
    newVerification: boolean;
    newClaim: boolean;
    newSupportTicket: boolean;
    largeTransaction: boolean;
  };
  twoFactorEnabled: boolean;
  sessionTimeout: "15 min" | "30 min" | "1 hour";
}
