"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OperatorProfile, ClientProfile, ServiceType } from "@/lib/types";
import {
  getDistanceKm,
  isOperatorPublic,
  isClientWithinOperatorRadius,
} from "@/lib/operatorDiscovery";
import StarRating from "@/components/StarRating";
import UserAvatar from "@/components/UserAvatar";
import {
  Search,
  MapPin,
  Snowflake,
  GraduationCap,
  Filter,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X,
  Heart,
  ArrowLeft,
  CalendarDays,
  Clock,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { sendAdminNotif } from "@/lib/adminNotifications";

const SERVICE_LABELS: Record<ServiceType, string> = {
  driveway: "Driveway",
  walkway: "Walkway",
  sidewalk: "Sidewalk",
  "parking-lot": "Parking Lot",
  roof: "Roof",
  other: "Other",
};

export default function FindOperatorsPage() {
  const { user, profile } = useAuth();
  const clientProfile = profile as ClientProfile;
  const router = useRouter();
  const [operators, setOperators] = useState<OperatorProfile[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<OperatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterService, setFilterService] = useState<ServiceType | "all">("all");
  const [filterStudents, setFilterStudents] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterEquipment, setFilterEquipment] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rating" | "price" | "distance">("rating");
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteOperatorId, setFavoriteOperatorId] = useState<string | null>(null);
  // Scheduling modal state
  const [schedulingOperator, setSchedulingOperator] = useState<OperatorProfile | null>(null);
  const [scheduleType, setScheduleType] = useState<"asap" | "scheduled">("asap");
  const [scheduledDate, setScheduledDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const clientHasCoordinates =
    typeof clientProfile?.lat === "number" && Number.isFinite(clientProfile.lat) &&
    typeof clientProfile?.lng === "number" && Number.isFinite(clientProfile.lng);

  // Fetch operators with same baseline criteria used by calendar booking.
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "operator"),
          where("onboardingComplete", "==", true)
        );
        const snap = await getDocs(q);
        const fetchedOperators = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as OperatorProfile))
          .filter(isOperatorPublic);
        setOperators(fetchedOperators);
        
        // Load user's favorites
        if (user?.uid && clientProfile) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as ClientProfile;
            setFavorites(userData.savedOperators || []);
            setFavoriteOperatorId(userData.favoriteOperatorId || null);
          }
        }
      } catch (error) {
        console.error("Error fetching operators:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, [user?.uid, clientProfile]);

  // Filter and sort
  useEffect(() => {
    if (!clientProfile) {
      setFilteredOperators([]);
      return;
    }

    let results = [...operators];

    // Show every operator inside the client's discoverable service radius.
    results = results.filter((op) => isClientWithinOperatorRadius(clientProfile, op));

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (op) =>
          op.displayName.toLowerCase().includes(term) ||
          op.businessName?.toLowerCase().includes(term) ||
          op.city.toLowerCase().includes(term) ||
          op.bio.toLowerCase().includes(term)
      );
    }

    // Service filter
    if (filterService !== "all") {
      results = results.filter((op) => op.serviceTypes.includes(filterService));
    }

    // Student filter
    if (filterStudents) {
      results = results.filter((op) => op.isStudent);
    }

    // Verified filter
    if (filterVerified) {
      results = results.filter((op) => op.idVerified);
    }

    // Equipment filter
    if (filterEquipment !== "all") {
      results = results.filter((op) => op.equipment?.includes(filterEquipment));
    }

    // Sort
    if (sortBy === "rating") {
      results.sort((a, b) => {
        // Favorite operator always first
        if (favoriteOperatorId) {
          if (a.uid === favoriteOperatorId) return -1;
          if (b.uid === favoriteOperatorId) return 1;
        }
        return b.rating - a.rating;
      });
    } else if (sortBy === "price") {
      results.sort(
        (a, b) => {
          // Favorite operator always first
          if (favoriteOperatorId) {
            if (a.uid === favoriteOperatorId) return -1;
            if (b.uid === favoriteOperatorId) return 1;
          }
          return (a.pricing?.driveway?.medium || 0) - (b.pricing?.driveway?.medium || 0);
        }
      );
    } else if (sortBy === "distance") {
      results.sort((a, b) => {
        if (favoriteOperatorId) {
          if (a.uid === favoriteOperatorId) return -1;
          if (b.uid === favoriteOperatorId) return 1;
        }

        const aDistance = getDistanceKm(clientProfile, a);
        const bDistance = getDistanceKm(clientProfile, b);
        const aVal = aDistance == null ? Number.POSITIVE_INFINITY : aDistance;
        const bVal = bDistance == null ? Number.POSITIVE_INFINITY : bDistance;
        return aVal - bVal;
      });
    }

    setFilteredOperators(results);
  }, [
    operators,
    clientProfile,
    searchTerm,
    filterService,
    filterStudents,
    filterVerified,
    filterEquipment,
    sortBy,
    favoriteOperatorId,
  ]);

  // Book an operator — show scheduling modal first
  const bookOperator = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setSchedulingOperator(operator);
    setScheduleType("asap");
    setScheduledDate(format(new Date(), "yyyy-MM-dd"));
    setScheduledTime("09:00");
  };

  // Confirm booking after schedule selection
  const confirmBooking = async () => {
    if (!schedulingOperator || !user?.uid || !profile) return;
    const operator = schedulingOperator;
    setSchedulingOperator(null);
    setBooking(true);

    try {
      // Check if client already has an active job (one at a time limit)
      const activeJobsQuery = query(
        collection(db, "jobs"),
        where("clientId", "==", user.uid)
      );
      const activeJobsSnap = await getDocs(activeJobsQuery);
      const activeStatuses = ["pending", "accepted", "en-route", "in-progress"];
      const hasActiveJob = activeJobsSnap.docs.some(d => activeStatuses.includes(d.data().status));
      if (hasActiveJob) {
        alert("You already have an active job. Please complete or cancel your current job before requesting a new one.");
        setBooking(false);
        return;
      }

      // Check if there's an existing chat with this operator
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const chatsSnap = await getDocs(chatsQuery);
      const existingChat = chatsSnap.docs.find((d) => {
        const data = d.data();
        return data.participants?.includes(operator.uid);
      });

      if (existingChat) {
        // Navigate directly to existing chat — re-hire/re-book options are inside the chat
        setBooking(false);
        router.push(`/dashboard/messages/${existingChat.id}`);
        return;
      }

      // No existing chat — create new job + chat
      await createNewJobAndChat(operator);
    } catch (error) {
      console.error("Error booking operator:", error);
      setBooking(false);
    }
  };

  // Create a brand new job and chat
  const createNewJobAndChat = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setBooking(true);

    try {
      const operatorRequiresCard =
        Boolean(operator.stripeConnectAccountId) && (operator.stripeEnabledJobsOnly ?? true);

      const jobRef = await addDoc(collection(db, "jobs"), {
        clientId: user.uid,
        operatorId: operator.uid,
        status: "pending",
        serviceTypes: clientProfile?.propertyDetails?.serviceTypes || ["driveway"],
        propertySize: clientProfile?.propertyDetails?.propertySize || "medium",
        address: clientProfile?.address || "",
        city: clientProfile?.city || "",
        province: clientProfile?.province || "",
        postalCode: clientProfile?.postalCode || "",
        clientLat: clientProfile?.lat ?? null,
        clientLng: clientProfile?.lng ?? null,
        specialInstructions: clientProfile?.propertyDetails?.specialInstructions || "",
        scheduledDate: scheduleType === "scheduled" ? Timestamp.fromDate(new Date(scheduledDate + "T" + scheduledTime)) : null,
        scheduledTime: scheduleType === "scheduled" ? scheduledTime : "ASAP",
        estimatedDuration: 45,
        price:
          operator.pricing?.driveway?.[
            (clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"
          ] || 40,
        paymentMethod: operatorRequiresCard ? "credit" : "cash",
        requiresCardPayment: operatorRequiresCard,
        paymentStatus: "pending",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const chatRef = await addDoc(collection(db, "chats"), {
        jobId: jobRef.id,
        participants: [user.uid, operator.uid],
        lastMessage: "Job request sent",
        lastMessageTime: Timestamp.now(),
        unreadCount: { [user.uid]: 0, [operator.uid]: 1 },
        createdAt: Timestamp.now(),
      });

      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "jobs", jobRef.id), { chatId: chatRef.id });

      const scheduleInfo = scheduleType === "scheduled"
        ? ` Scheduled for ${format(new Date(scheduledDate), "MMM d")} at ${scheduledTime}.`
        : "";
      const paymentInfo = operatorRequiresCard
        ? " Card payment is required for this operator."
        : "";

      await addDoc(collection(db, "messages"), {
        chatId: chatRef.id,
        senderId: "system",
        senderName: "snowd.ca",
        type: "system",
        content: `${clientProfile?.displayName} has requested snow removal service.${scheduleInfo}${paymentInfo} Please discuss details and confirm the booking.`,
        read: false,
        createdAt: Timestamp.now(),
      });

      sendAdminNotif({
        type: "job_created",
        message: `Job created by ${profile?.displayName || "user"} → ${operator.displayName || operator.businessName || "operator"}`,
        uid: user.uid,
        meta: {
          clientName: profile?.displayName || "",
          operatorName: operator.displayName || operator.businessName || "",
          jobId: jobRef.id,
          address: clientProfile?.address || "",
          city: clientProfile?.city || "",
        },
      });
      router.push(`/dashboard/messages/${chatRef.id}`);
    } catch (error) {
      console.error("Error creating job:", error);
    } finally {
      setBooking(false);
    }
  };

  // Toggle favorite operator
  const toggleFavorite = async (operatorId: string) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const currentFavorites = favorites.includes(operatorId)
        ? favorites.filter((id) => id !== operatorId)
        : [...favorites, operatorId];
      
      await updateDoc(userRef, {
        savedOperators: currentFavorites,
      });
      
      setFavorites(currentFavorites);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // Set favorite operator (primary)
  const setAsFavorite = async (operatorId: string) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const newFavoriteId = favoriteOperatorId === operatorId ? null : operatorId;
      
      await updateDoc(userRef, {
        favoriteOperatorId: newFavoriteId,
      });
      
      setFavoriteOperatorId(newFavoriteId);
    } catch (error) {
      console.error("Error setting favorite:", error);
    }
  };

  return (
    <div className="mx-auto max-w-[1220px] space-y-5">
      <section className="surface-card overflow-hidden p-4 md:p-5">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.8rem] bg-[#111111] p-5 text-white md:p-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="rounded-full bg-white/10 p-2 transition hover:bg-white/16" title="Back to dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="chip border border-white/12 bg-white/8 text-white">
                <Search className="h-4 w-4" />
                Book snow service
              </div>
            </div>

            <h1 className="mt-5 text-3xl font-headline font-bold leading-none md:text-5xl">Choose an operator and move straight into the job thread.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/72 md:text-base">
              Compare trusted snow operators in {clientProfile?.city || "your area"}, review distance and pricing, and open the same thread you will use to confirm and track the work.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.16em] text-white/48">Nearby</div>
                <div className="mt-2 text-2xl font-headline font-bold">{filteredOperators.length}</div>
                <div className="mt-1 text-xs text-white/62">operators matched</div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.16em] text-white/48">Service area</div>
                <div className="mt-2 text-lg font-headline font-bold">{clientProfile?.city || "Local"}</div>
                <div className="mt-1 text-xs text-white/62">{clientHasCoordinates ? "precise radius on" : "address precision recommended"}</div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.16em] text-white/48">Flow</div>
                <div className="mt-2 text-lg font-headline font-bold">Search, confirm, track</div>
                <div className="mt-1 text-xs text-white/62">one shared flow across mobile and web</div>
              </div>
            </div>
          </div>

          <div className="map-shell relative min-h-[320px] overflow-hidden p-4 md:p-5">
            <div className="absolute left-[15%] top-[22%] h-4 w-4 rounded-full bg-[#17994f] shadow-[0_0_0_10px_rgba(23,153,79,0.12)]" />
            <div className="absolute left-[62%] top-[34%] h-4 w-4 rounded-full bg-[#111111] shadow-[0_0_0_10px_rgba(17,17,17,0.08)]" />
            <div className="absolute left-[42%] top-[62%] h-4 w-4 rounded-full bg-[#2e6bff] shadow-[0_0_0_10px_rgba(46,107,255,0.08)]" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-4">
              <div className="ml-auto max-w-[270px] rounded-[1.5rem] bg-white p-4 shadow-[0_18px_40px_rgba(18,18,18,0.12)]">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Pickup</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4" />
                  {clientProfile?.address || `${clientProfile?.city || "Your city"}, ${clientProfile?.province || ""}`}
                </div>
                <div className="mt-3 rounded-2xl bg-[var(--bg-secondary)] px-3 py-3 text-xs text-[var(--text-muted)]">
                  The booking flow stays map-led and thread-based so request details do not get lost after you choose an operator.
                </div>
              </div>
              <div className="rounded-[1.6rem] bg-[#111111] p-4 text-white shadow-[0_18px_40px_rgba(18,18,18,0.12)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-white/48">Nearby matches</div>
                    <div className="mt-1 text-lg font-headline font-bold">Best operators nearby</div>
                  </div>
                  <div className="rounded-full bg-[#7ddc7a] px-3 py-1 text-[10px] font-bold text-[#111111]">active</div>
                </div>
                <div className="mt-4 grid gap-2">
                  {filteredOperators.slice(0, 2).map((operator) => (
                    <div key={operator.uid} className="flex items-center justify-between rounded-[1rem] bg-white/10 px-3 py-3">
                      <div>
                        <div className="text-sm font-semibold">{operator.businessName || operator.displayName}</div>
                        <div className="mt-1 text-xs text-white/58">{getDistanceKm(clientProfile, operator)?.toFixed(1) || "Nearby"} km away</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">${operator.pricing?.driveway?.medium || "–"}</div>
                        <div className="text-xs text-white/58">est. medium</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-panel p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search operators, services, city, or equipment"
              className="h-13 w-full rounded-[1.3rem] border border-[var(--border-color)] bg-[#fbfbf8] pl-12 pr-4 text-[var(--text-primary)] outline-none transition focus:border-[#111111]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex h-13 items-center justify-center gap-2 rounded-[1.3rem] border px-4 font-semibold transition ${
              showFilters
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[var(--border-color)] bg-white text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Service</label>
              <select value={filterService} onChange={(e) => setFilterService(e.target.value as ServiceType | "all")} className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-white px-3 text-sm">
                <option value="all">All Services</option>
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Sort</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "rating" | "price" | "distance")} className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-white px-3 text-sm">
                <option value="rating">Highest Rated</option>
                <option value="price">Lowest Price</option>
                <option value="distance">Nearest First</option>
              </select>
            </div>
            <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Equipment</label>
              <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-white px-3 text-sm">
                <option value="all">Any Equipment</option>
                <option value="Shovel">Shovel</option>
                <option value="Snow Blower">Snow Blower</option>
                <option value="Plow Truck">Plow Truck</option>
                <option value="Salt Spreader">Salt Spreader</option>
                <option value="ATV/UTV Plow">ATV/UTV Plow</option>
              </select>
            </div>
            <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Filters</div>
              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input type="checkbox" checked={filterStudents} onChange={(e) => setFilterStudents(e.target.checked)} className="h-4 w-4 rounded" />
                  Students only
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input type="checkbox" checked={filterVerified} onChange={(e) => setFilterVerified(e.target.checked)} className="h-4 w-4 rounded" />
                  ID verified
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="surface-panel px-6 py-14 text-center text-[var(--text-muted)]">
          <Snowflake className="mx-auto mb-3 h-8 w-8 animate-spin" />
          Loading operators...
        </div>
      ) : filteredOperators.length === 0 ? (
        <div className="surface-panel px-6 py-14 text-center">
          <Snowflake className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]/40" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">No operators found</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {clientHasCoordinates
              ? "Try adjusting your search or filters, or check back later."
              : "Add your exact address in settings to unlock nearby operator matching."}
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-[var(--text-muted)]">{filteredOperators.length} operators found</p>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">chat-first marketplace</p>
          </div>
          {filteredOperators.map((op) => {
            const isExpanded = expandedOperator === op.uid;
            const mediumPrice = op.pricing?.driveway?.medium || "–";
            const distanceKm = getDistanceKm(clientProfile, op);
            return (
              <div
                key={op.uid}
                className={`surface-panel overflow-hidden transition ${
                  op.uid === favoriteOperatorId ? "border-[#111111] shadow-[0_18px_35px_rgba(18,18,18,0.12)]" : ""
                }`}
              >
                <div
                  className="cursor-pointer px-5 py-5"
                  onClick={() => setExpandedOperator(isExpanded ? null : op.uid)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 shrink-0">
                      <UserAvatar
                        photoURL={(op as unknown as Record<string, string>)?.avatar}
                        role="operator"
                        displayName={op.displayName}
                        size={56}
                        rounded="xl"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/u/${op.uid}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-[var(--text-primary)] transition hover:underline"
                        >
                          {op.businessName || op.displayName}
                        </Link>
                        {op.uid === favoriteOperatorId && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#111111] px-2.5 py-1 text-xs font-medium text-white">
                            <Snowflake className="h-3 w-3 fill-white" />
                            Favorite
                          </span>
                        )}
                        {op.isStudent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                            <GraduationCap className="w-3 h-3" /> Student
                          </span>
                        )}
                        {op.verified && (
                          <span className="inline-flex items-center rounded-full bg-[#eaf7ef] px-2.5 py-1 text-xs font-medium text-[var(--accent-mint)]">
                            Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <StarRating rating={op.rating} size="sm" />
                          <span className="text-xs text-[var(--text-muted)]">
                            ({op.reviewCount})
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {op.city}, {op.province}
                        </span>
                        {distanceKm != null && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {distanceKm.toFixed(1)} km away
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-full bg-[#eaf7ef] px-3 py-1 font-semibold text-[var(--accent-mint)]">
                          From ${mediumPrice}
                        </span>
                        <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-muted)]">
                          {op.equipment?.slice(0, 2).join(", ")}{op.equipment && op.equipment.length > 2 ? ` +${op.equipment.length - 2}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsFavorite(op.uid);
                        }}
                        className="rounded-xl p-2 transition hover:bg-[var(--bg-secondary)]"
                        title={op.uid === favoriteOperatorId ? "Remove as favorite" : "Set as favorite"}
                      >
                        <Snowflake
                          className={`w-5 h-5 ${
                            op.uid === favoriteOperatorId
                              ? "fill-[#111111] text-[#111111]"
                              : "text-[var(--text-muted)]"
                          }`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(op.uid);
                        }}
                        className="rounded-xl p-2 transition hover:bg-[var(--bg-secondary)]"
                        title={favorites.includes(op.uid) ? "Remove from saved" : "Save operator"}
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            favorites.includes(op.uid)
                              ? "fill-red-500 text-red-500"
                              : "text-[var(--text-muted)]"
                          }`}
                        />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--border-soft)] px-5 pb-5 pt-0">
                    <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{op.bio}</p>

                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Pricing (CAD)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {op.pricing?.driveway?.small != null && (
                          <div className="rounded-xl bg-[var(--bg-secondary)] px-3 py-3 text-center">
                            <p className="text-xs text-[var(--text-muted)]">Small</p>
                            <p className="font-bold text-[var(--text-primary)]">${op.pricing.driveway.small}</p>
                          </div>
                        )}
                        {op.pricing?.driveway?.medium != null && (
                          <div className="rounded-xl bg-[var(--bg-secondary)] px-3 py-3 text-center">
                            <p className="text-xs text-[var(--text-muted)]">Medium</p>
                            <p className="font-bold text-[var(--text-primary)]">${op.pricing.driveway.medium}</p>
                          </div>
                        )}
                        {op.pricing?.driveway?.large != null && (
                          <div className="rounded-xl bg-[var(--bg-secondary)] px-3 py-3 text-center">
                            <p className="text-xs text-[var(--text-muted)]">Large</p>
                            <p className="font-bold text-[var(--text-primary)]">${op.pricing.driveway.large}</p>
                          </div>
                        )}
                        {op.pricing?.walkway != null && (
                          <div className="rounded-xl bg-[var(--bg-secondary)] px-3 py-3 text-center">
                            <p className="text-xs text-[var(--text-muted)]">Walkway</p>
                            <p className="font-bold text-[var(--text-primary)]">${op.pricing.walkway}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {op.equipment && op.equipment.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Equipment</p>
                        <div className="flex flex-wrap gap-1.5">
                          {op.equipment.map((eq) => (
                            <span
                              key={eq}
                              className="rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => bookOperator(op)}
                        disabled={booking}
                        className="btn-primary flex-1 px-4 py-3"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {booking ? "Booking..." : "Request & Chat"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Scheduling Modal */}
      {schedulingOperator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-[1.8rem] bg-white shadow-2xl">
            <div className="relative bg-[#111111] p-5 text-white">
              <button
                onClick={() => setSchedulingOperator(null)}
                className="absolute right-3 top-3 rounded-lg p-1 transition hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-lg">When do you need it?</h2>
              <p className="text-white/80 text-sm mt-1">
                Booking {schedulingOperator.businessName || schedulingOperator.displayName}
              </p>
            </div>
            <div className="p-5 space-y-4">
              {/* ASAP or Scheduled toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScheduleType("asap")}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition ${
                    scheduleType === "asap"
                      ? "border-[#111111] bg-[var(--accent-soft)]"
                      : "border-[var(--border-color)] hover:border-[#111111]/30"
                  }`}
                >
                  <Zap className={`w-5 h-5 ${scheduleType === "asap" ? "text-[#111111]" : "text-[var(--text-muted)]"}`} />
                  <span className={`text-sm font-semibold ${scheduleType === "asap" ? "text-[#111111]" : "text-[var(--text-secondary)]"}`}>
                    ASAP
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">As soon as possible</span>
                </button>
                <button
                  onClick={() => setScheduleType("scheduled")}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition ${
                    scheduleType === "scheduled"
                      ? "border-[#111111] bg-[var(--accent-soft)]"
                      : "border-[var(--border-color)] hover:border-[#111111]/30"
                  }`}
                >
                  <CalendarDays className={`w-5 h-5 ${scheduleType === "scheduled" ? "text-[#111111]" : "text-[var(--text-muted)]"}`} />
                  <span className={`text-sm font-semibold ${scheduleType === "scheduled" ? "text-[#111111]" : "text-[var(--text-secondary)]"}`}>
                    Schedule
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Pick date & time</span>
                </button>
              </div>

              {/* Date & time pickers (only if scheduled) */}
              {scheduleType === "scheduled" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={format(new Date(), "yyyy-MM-dd")}
                      max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm focus:border-[#111111] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Preferred Time</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["07:00", "09:00", "12:00", "14:00", "16:00", "18:00"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setScheduledTime(t)}
                          className={`flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition ${
                            scheduledTime === t
                              ? "border-[#111111] bg-[var(--accent-soft)] text-[#111111]"
                              : "border-[var(--border-color)] text-[var(--text-muted)] hover:border-[#111111]/30"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {t.replace(":00", "")}:00
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-[var(--text-muted)]">
                    Scheduled for {format(new Date(scheduledDate + "T12:00:00"), "EEEE, MMM d")} at {scheduledTime}
                  </p>
                </div>
              )}

              <button
                onClick={confirmBooking}
                disabled={booking}
                className="btn-primary w-full px-4 py-3.5"
              >
                <MessageSquare className="w-4 h-4" />
                {booking ? "Booking..." : scheduleType === "asap" ? "Request Now" : "Schedule & Chat"}
              </button>
              <button
                onClick={() => setSchedulingOperator(null)}
                className="w-full py-1 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
