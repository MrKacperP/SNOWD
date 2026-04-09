import {
  ActivityEvent,
  AdminNotification,
  AdminSettingsState,
  AdminUser,
  CallItem,
  ChartPoint,
  ChatItem,
  ClaimItem,
  EmployeeItem,
  JobItem,
  SupportTicket,
  TransactionItem,
  VerificationItem,
} from "@/lib/admin/types";

const nowIso = () => new Date().toISOString();

export const usersSeed: AdminUser[] = [
  { id: "u1", avatar: "AL", name: "Ava Lee", email: "ava@example.com", role: "Client", status: "Active", joinDate: "2026-03-01" },
  { id: "u2", avatar: "JK", name: "Jordan Kim", email: "jordan@example.com", role: "Operator", status: "Active", joinDate: "2026-03-05" },
  { id: "u3", avatar: "MS", name: "Mia Scott", email: "mia@example.com", role: "Client", status: "Pending", joinDate: "2026-03-12" },
  { id: "u4", avatar: "RT", name: "Ryan Tran", email: "ryan@example.com", role: "Operator", status: "Suspended", joinDate: "2026-02-20" },
  { id: "u5", avatar: "DL", name: "Dina Li", email: "dina@example.com", role: "Client", status: "Active", joinDate: "2026-03-17" },
  { id: "u6", avatar: "BN", name: "Ben Novak", email: "ben@example.com", role: "Operator", status: "Active", joinDate: "2026-03-18" },
];

export const verificationsSeed: VerificationItem[] = [
  { id: "v1", userId: "u3", userName: "Mia Scott", userAvatar: "MS", type: "ID", submissionDate: "2026-04-06", status: "Pending" },
  { id: "v2", userId: "u6", userName: "Ben Novak", userAvatar: "BN", type: "License", submissionDate: "2026-04-07", status: "Pending" },
  { id: "v3", userId: "u2", userName: "Jordan Kim", userAvatar: "JK", type: "Address", submissionDate: "2026-04-01", status: "Approved", reviewedBy: "Admin", reviewedDate: "2026-04-02" },
  { id: "v4", userId: "u4", userName: "Ryan Tran", userAvatar: "RT", type: "ID", submissionDate: "2026-03-29", status: "Rejected", reviewedBy: "Admin", reviewedDate: "2026-03-30" },
];

export const jobsSeed: JobItem[] = [
  {
    id: "j1",
    title: "Downtown driveway cleanup",
    postedBy: "Ava Lee",
    category: "Snow Removal",
    status: "Open",
    datePosted: "2026-04-06",
    description: "Need full driveway and walkway clearing before 7am.",
    assignedUsers: [],
    timeline: ["Posted", "Awaiting assignment"],
    chatId: "c1",
  },
  {
    id: "j2",
    title: "Urgent salting request",
    postedBy: "Dina Li",
    category: "Salting",
    status: "In Progress",
    datePosted: "2026-04-05",
    description: "Apply salt on front steps and sidewalk.",
    assignedUsers: ["Jordan Kim"],
    timeline: ["Posted", "Accepted", "In progress"],
    transactionId: "t1",
    chatId: "c2",
  },
  {
    id: "j3",
    title: "Commercial walkway",
    postedBy: "Ava Lee",
    category: "Shoveling",
    status: "Completed",
    datePosted: "2026-04-03",
    description: "Commercial property north entrance walkway.",
    assignedUsers: ["Ben Novak"],
    timeline: ["Posted", "Accepted", "Completed"],
    transactionId: "t2",
    chatId: "c3",
  },
];

export const chatsSeed: ChatItem[] = [
  {
    id: "c1",
    participantA: "Ava Lee",
    participantB: "Jordan Kim",
    avatarA: "AL",
    avatarB: "JK",
    lastMessage: "Can you arrive by 6:30?",
    timestamp: "2026-04-08T10:22:00.000Z",
    unreadCount: 2,
    messages: [
      { id: "m1", sender: "A", text: "Hi, I posted a job.", time: "09:58" },
      { id: "m2", sender: "B", text: "Got it, I can help.", time: "10:01" },
      { id: "m3", sender: "A", text: "Can you arrive by 6:30?", time: "10:22" },
    ],
  },
  {
    id: "c2",
    participantA: "Dina Li",
    participantB: "Ben Novak",
    avatarA: "DL",
    avatarB: "BN",
    lastMessage: "Salt applied, sending photo now.",
    timestamp: "2026-04-08T08:10:00.000Z",
    unreadCount: 0,
    messages: [
      { id: "m4", sender: "A", text: "Need urgent salting.", time: "07:40" },
      { id: "m5", sender: "B", text: "On my way.", time: "07:47" },
      { id: "m6", sender: "B", text: "Salt applied, sending photo now.", time: "08:10" },
    ],
  },
];

export const supportSeed: SupportTicket[] = [
  {
    id: "s1",
    userName: "Mia Scott",
    userAvatar: "MS",
    subject: "Refund not reflected",
    status: "Open",
    urgency: "High",
    lastMessageAgo: "8m",
    unreadReplies: 2,
    thread: [
      { id: "st1", sender: "user", text: "I still do not see my refund.", time: "10:03" },
      { id: "st2", sender: "admin", text: "Thanks, we are checking the transaction.", time: "10:08" },
      { id: "st3", sender: "user", text: "Any update?", time: "10:19" },
    ],
  },
  {
    id: "s2",
    userName: "Ava Lee",
    userAvatar: "AL",
    subject: "Issue with chat loading",
    status: "Waiting",
    urgency: "Medium",
    lastMessageAgo: "30m",
    unreadReplies: 0,
    thread: [
      { id: "st4", sender: "user", text: "My old messages disappear.", time: "09:02" },
      { id: "st5", sender: "admin", text: "Can you share your browser and time?", time: "09:20" },
    ],
  },
  {
    id: "s3",
    userName: "Jordan Kim",
    userAvatar: "JK",
    subject: "Need payout details",
    status: "Resolved",
    urgency: "Low",
    lastMessageAgo: "1d",
    unreadReplies: 0,
    thread: [
      { id: "st6", sender: "user", text: "When is payout processed?", time: "Yesterday" },
      { id: "st7", sender: "admin", text: "Processed every Friday.", time: "Yesterday" },
    ],
  },
];

export const callsSeed: CallItem[] = [
  { id: "call1", caller: "Ava Lee", receiver: "Jordan Kim", duration: "06:20", status: "Completed", dateTime: "2026-04-07 14:10", recordingUrl: "/", notes: "Discussed job ETA." },
  { id: "call2", caller: "Mia Scott", receiver: "Support", duration: "00:00", status: "Missed", dateTime: "2026-04-07 15:40", notes: "Missed support callback." },
  { id: "call3", caller: "Dina Li", receiver: "Ben Novak", duration: "02:11", status: "In Progress", dateTime: "2026-04-08 10:05", transcriptPreview: "User requested confirmation before arrival." },
];

export const transactionsSeed: TransactionItem[] = [
  { id: "t1", fromUser: "Dina Li", toUser: "Jordan Kim", amount: 85, type: "Payment", status: "Completed", date: "2026-04-05", linkedJobId: "j2", disputeHistory: [] },
  { id: "t2", fromUser: "Ava Lee", toUser: "Ben Novak", amount: 120, type: "Payment", status: "Pending", date: "2026-04-07", linkedJobId: "j3", disputeHistory: ["Charge dispute opened"] },
  { id: "t3", fromUser: "Snowd", toUser: "Ava Lee", amount: 25, type: "Refund", status: "Failed", date: "2026-04-06", disputeHistory: ["Bank rejection"] },
  { id: "t4", fromUser: "Jordan Kim", toUser: "Snowd", amount: 8, type: "Fee", status: "Completed", date: "2026-04-04" },
];

export const claimsSeed: ClaimItem[] = [
  {
    id: "cl1",
    claimantName: "Mia Scott",
    claimantAvatar: "MS",
    claimType: "Billing",
    amountDisputed: 45,
    submissionDate: "2026-04-06",
    status: "Open",
    description: "Charged twice for the same booking.",
    evidence: ["Receipt-1", "Statement"],
  },
  {
    id: "cl2",
    claimantName: "Ava Lee",
    claimantAvatar: "AL",
    claimType: "Property Damage",
    amountDisputed: 200,
    submissionDate: "2026-04-05",
    status: "Open",
    description: "Driveway edge chipped during clearing.",
    evidence: ["Photo-1", "Photo-2"],
  },
  {
    id: "cl3",
    claimantName: "Jordan Kim",
    claimantAvatar: "JK",
    claimType: "No Show",
    amountDisputed: 60,
    submissionDate: "2026-03-30",
    status: "Resolved",
    description: "Customer unavailable on arrival.",
    evidence: ["Chat log"],
  },
];

export const activitySeed: ActivityEvent[] = [
  { id: "a1", userName: "Mia Scott", userAvatar: "MS", description: "submitted a new verification", timestamp: "2026-04-08T10:20:00.000Z", type: "Verification", href: "/admin/verifications" },
  { id: "a2", userName: "Ava Lee", userAvatar: "AL", description: "posted a new job", timestamp: "2026-04-08T10:05:00.000Z", type: "Job", href: "/admin/jobs" },
  { id: "a3", userName: "Jordan Kim", userAvatar: "JK", description: "received a payment", timestamp: "2026-04-08T09:40:00.000Z", type: "Transaction", href: "/admin/transactions" },
  { id: "a4", userName: "Dina Li", userAvatar: "DL", description: "sent a support reply", timestamp: "2026-04-08T09:10:00.000Z", type: "Support", href: "/admin/support-chats" },
  { id: "a5", userName: "Ben Novak", userAvatar: "BN", description: "joined the platform", timestamp: "2026-04-08T08:50:00.000Z", type: "User", href: "/admin/users" },
];

export const employeesSeed: EmployeeItem[] = [
  { id: "e1", avatar: "AD", name: "Ari Delgado", email: "ari@snowd.ca", role: "Super Admin", status: "Active", lastLogin: "2026-04-08 10:12" },
  { id: "e2", avatar: "MP", name: "Maya Patel", email: "maya@snowd.ca", role: "Moderator", status: "Active", lastLogin: "2026-04-08 09:47" },
  { id: "e3", avatar: "RS", name: "Riley Stone", email: "riley@snowd.ca", role: "Support Agent", status: "Inactive", lastLogin: "2026-04-06 18:09" },
];

export const notificationsSeed: AdminNotification[] = [
  { id: "n1", type: "verification", message: "New verification submission from Mia Scott", createdAt: nowIso(), read: false, href: "/admin/verifications" },
  { id: "n2", type: "support", message: "New reply in ticket Refund not reflected", createdAt: nowIso(), read: false, href: "/admin/support-chats" },
  { id: "n3", type: "job", message: "Urgent job flagged for review", createdAt: nowIso(), read: true, href: "/admin/jobs" },
];

export const activityChartSeed: ChartPoint[] = Array.from({ length: 30 }).map((_, idx) => ({
  date: `Day ${idx + 1}`,
  value: 40 + Math.floor(Math.sin(idx / 3) * 12) + (idx % 5),
}));

export const analyticsUsersSeed: ChartPoint[] = Array.from({ length: 12 }).map((_, idx) => ({
  date: `W${idx + 1}`,
  value: 12 + ((idx * 3) % 10),
}));

export const analyticsRevenueSeed: ChartPoint[] = Array.from({ length: 12 }).map((_, idx) => ({
  date: `W${idx + 1}`,
  value: 1400 + idx * 180 + (idx % 3) * 130,
}));

export const analyticsCategoriesSeed = [
  { category: "Snow Removal", value: 48 },
  { category: "Salting", value: 32 },
  { category: "Shoveling", value: 22 },
];

export const analyticsSupportResolutionSeed = [
  { name: "Resolved", value: 78 },
  { name: "Open", value: 22 },
];

export const settingsSeed: AdminSettingsState = {
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
