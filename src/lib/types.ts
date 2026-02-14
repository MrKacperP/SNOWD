// ============================================
// snowd.ca — Type Definitions
// ============================================

export type UserRole = "client" | "operator" | "admin";

export type PaymentMethod = "cash" | "credit" | "e-transfer";

export type JobStatus =
  | "pending"
  | "accepted"
  | "en-route"
  | "in-progress"
  | "completed"
  | "cancelled";

export type ServiceType =
  | "driveway"
  | "walkway"
  | "sidewalk"
  | "parking-lot"
  | "roof"
  | "other";

export type PropertySize = "small" | "medium" | "large" | "commercial";

export type ThemePreference = "light" | "dark" | "system";

export type ClaimStatus = "open" | "under-review" | "resolved" | "dismissed";
export type ClaimType = "property-damage" | "incomplete-job" | "misconduct" | "other";

// -- Users --
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  onboardingComplete: boolean;
  // Canadian-specific
  province: string;
  city: string;
  postalCode: string;
  address: string;
  // Status & Preferences
  isOnline?: boolean;
  lastSeen?: Date;
  themePreference?: ThemePreference;
  // Stripe
  stripeCustomerId?: string;
  stripePaymentMethods?: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }[];
  // Location coordinates
  lat?: number;
  lng?: number;
  // Payment preferences
  preferredPaymentMethod?: PaymentMethod;
  // ID Verification
  idPhotoUrl?: string;
  idVerified?: boolean;
}

export interface ClientProfile extends UserProfile {
  role: "client";
  propertyDetails: {
    propertySize: PropertySize;
    serviceTypes: ServiceType[];
    specialInstructions?: string;
    photos?: string[];
  };
  savedOperators: string[]; // operator UIDs
  favoriteOperatorId?: string; // primary favorite operator UID
  jobHistory: string[]; // job IDs
}

export interface OperatorProfile extends UserProfile {
  role: "operator";
  businessName?: string;
  isStudent: boolean;
  studentTranscriptUrl?: string;
  age?: number;
  bio: string;
  equipment: string[];
  serviceRadius: number; // km
  serviceTypes: ServiceType[];
  pricing: {
    driveway: { small: number; medium: number; large: number };
    walkway: number;
    sidewalk: number;
    hourlyRate?: number;
  };
  rating: number;
  reviewCount: number;
  verified: boolean;
  isAvailable?: boolean;
  totalJobsCompleted?: number;
  availability: {
    [key: string]: { start: string; end: string }; // day -> times
  };
  activeJobs: string[];
  completedJobs: number;
  portfolioPhotos?: string[]; // photo URLs of past work
}

// -- Jobs --
export interface Job {
  id: string;
  clientId: string;
  operatorId: string;
  status: JobStatus;
  serviceTypes: ServiceType[];
  propertySize: PropertySize;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  specialInstructions?: string;
  scheduledDate: Date;
  scheduledTime: string;
  estimatedDuration: number; // minutes
  price: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "held" | "paid" | "refunded";
  stripePaymentIntentId?: string;
  completionPhotoUrl?: string;
  eta?: number; // minutes
  startTime?: Date;
  completionTime?: Date;
  clientRating?: number;
  clientReview?: string;
  operatorNotes?: string;
  chatId: string;
  createdAt: Date;
  updatedAt: Date;
}

// -- Messaging --
export type MessageType = "text" | "system" | "payment" | "eta-update" | "status-update" | "image" | "payment-request" | "completion-photo" | "progress-update";

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  content: string;
  metadata?: {
    amount?: number;
    paymentMethod?: PaymentMethod;
    newStatus?: JobStatus;
    eta?: number;
    imageUrl?: string;
    paymentIntentId?: string;
    completionPhotoUrl?: string;
    progressStep?: string;
  };
  read: boolean;
  createdAt: Date;
}

export interface Chat {
  id: string;
  jobId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: { [uid: string]: number };
  createdAt: Date;
}

// -- Reviews --
export interface Review {
  id: string;
  jobId: string;
  clientId: string;
  operatorId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

// -- Transactions --
export interface Transaction {
  id: string;
  jobId: string;
  chatId?: string;
  clientId: string;
  operatorId: string;
  amount: number;
  tipAmount?: number;
  cashReceived?: number;
  paymentMethod?: PaymentMethod;
  status: "held" | "paid" | "refunded" | "cancelled";
  stripePaymentIntentId: string;
  description: string;
  serviceTypes: ServiceType[];
  address: string;
  createdAt: Date;
  completedAt?: Date;
  clientName?: string;
  operatorName?: string;
}

// -- Admin --
export interface AdminProfile extends UserProfile {
  role: "admin";
}

// -- Claims --
export interface Claim {
  id: string;
  jobId: string;
  chatId?: string;
  claimantId: string;
  claimantRole: "client" | "operator";
  againstId: string;
  type: ClaimType;
  status: ClaimStatus;
  title: string;
  description: string;
  photoUrls?: string[];
  adminNotes?: string;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

// -- Support Tickets --
export interface SupportTicket {
  id: string;
  userId: string;
  userRole: UserRole;
  subject: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

// -- Chat Extensions --
export interface ChatArchive {
  chatId: string;
  archivedBy: string;
  archivedAt: Date;
}

// -- Onboarding --
export interface OnboardingData {
  step: number;
  role?: UserRole;
  displayName?: string;
  phone?: string;
  province?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  // Client-specific
  propertySize?: PropertySize;
  serviceTypes?: ServiceType[];
  specialInstructions?: string;
  // Operator-specific
  businessName?: string;
  isStudent?: boolean;
  age?: number;
  bio?: string;
  equipment?: string[];
  serviceRadius?: number;
  pricing?: OperatorProfile["pricing"];
}

// -- Canadian Provinces --
export const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
] as const;

export const EQUIPMENT_OPTIONS = [
  "Snow Shovel",
  "Snow Blower",
  "Ice Scraper",
  "Salt/Sand Spreader",
  "Plow Truck",
  "Bobcat/Loader",
  "Roof Rake",
  "Wheelbarrow",
  "Ice Melt/Salt",
] as const;
