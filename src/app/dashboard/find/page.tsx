"use client";

import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";

import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";

import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { sendAdminNotif } from "@/lib/adminNotifications";
import { db } from "@/lib/firebase";
import {
getDistanceKm,
isClientWithinOperatorRadius,
isOperatorPublic,
} from "@/lib/operatorDiscovery";
import { ClientProfile,OperatorProfile,ServiceType } from "@/lib/types";
import { addDays,format } from "date-fns";
import {
addDoc,
collection,
doc,
getDoc,
getDocs,
query,
Timestamp,
updateDoc,
where,
} from "firebase/firestore";
import {
CalendarDays,
Filter,
MapPin,
MessageSquare,
Search,
Snowflake,
Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

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
  const [cashAcknowledged, setCashAcknowledged] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const bookOperator = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setSchedulingOperator(operator);
    const requestedDate = new URLSearchParams(window.location.search).get("date");
    const validDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : null;
    setCashAcknowledged(false);
    setBookingError("");
    setScheduleType(validDate ? "scheduled" : "asap");
    setScheduledDate(validDate || format(new Date(), "yyyy-MM-dd"));
    setScheduledTime(validDate && validDate > format(new Date(), "yyyy-MM-dd") ? "09:00" : format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"));
  };

  // Confirm booking after schedule selection
  const confirmBooking = async () => {
    if (!schedulingOperator || !user?.uid || !profile) return;
    const operator = schedulingOperator;
    const cardRequired = canAcceptPlatformPayments(operator) && (operator.stripeEnabledJobsOnly ?? true);
    if (!cardRequired && !cashAcknowledged) return;
    const scheduleMillis = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
    if (scheduleType === "scheduled" && (!Number.isFinite(scheduleMillis) || scheduleMillis <= Date.now() || scheduledDate > format(addDays(new Date(), 30), "yyyy-MM-dd"))) {
      setBookingError("Choose a future date and time."); return;
    }
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
        setBookingError("You already have an active job. Complete or cancel it before requesting another.");
        setBooking(false);
        return;
      }

      const existingJob = activeJobsSnap.docs.find(item => item.data().operatorId === operator.uid && item.data().chatId);
      if (existingJob) {
        router.push(`/dashboard/messages/${existingJob.data().chatId}`);
        setBooking(false);
        return;
      }

      // No existing chat — create new job + chat
      await createNewJobAndChat(operator);
    } catch (error) {
      setBookingError("Could not request this job. Please try again.");
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
        canAcceptPlatformPayments(operator) && (operator.stripeEnabledJobsOnly ?? true);

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
        cashPaymentAcknowledged: !operatorRequiresCard && cashAcknowledged,
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
        : " Cash payment only. The client agreed to pay the operator directly after the work.";

      await addDoc(collection(db, "messages"), {
        chatId: chatRef.id,
        senderId: user.uid,
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
      setBookingError("Could not create this booking. Please try again.");
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
    <div className="mx-auto max-w-[1040px] space-y-5">
      <PageHeader title="Book help" description={`Find trusted snow help in ${clientProfile?.city || "your neighbourhood"}.`} />
      <div className="rounded-2xl bg-[#eaf1ee] px-5 py-4 text-sm text-[#43574b]"><MapPin className="mr-2 inline h-4 w-4" />{clientProfile?.address || "Add your service address"} <Link href="/dashboard/settings" className="ml-2 font-semibold underline">Change</Link></div>

      <section className="surface-panel p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              aria-label="Search operators"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search operators, services, city, or equipment"
              className="h-13 w-full rounded-[1.3rem] border-[3px] border-[var(--border-color)] bg-[#fbfbf8] pl-12 pr-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--ink)]"
            />
          </div>
          <button
            aria-expanded={showFilters}
            aria-controls="operator-filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex h-13 items-center justify-center gap-2 rounded-[1.3rem] border px-4 font-semibold transition ${
              showFilters
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--border-color)] bg-white text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters ? (
          <div id="operator-filters" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Service</label>
              <select aria-label="Service" value={filterService} onChange={(e) => setFilterService(e.target.value as ServiceType | "all")} className="h-11 w-full rounded-xl border-[3px] border-[var(--border-color)] bg-white px-3 text-sm">
                <option value="all">All Services</option>
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Sort</label>
              <select aria-label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as "rating" | "price" | "distance")} className="h-11 w-full rounded-xl border-[3px] border-[var(--border-color)] bg-white px-3 text-sm">
                <option value="rating">Highest Rated</option>
                <option value="price">Lowest Price</option>
                <option value="distance">Nearest First</option>
              </select>
            </div>
            <div className="rounded-[1.2rem] bg-[var(--bg-secondary)] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Equipment</label>
              <select aria-label="Equipment" value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)} className="h-11 w-full rounded-xl border-[3px] border-[var(--border-color)] bg-white px-3 text-sm">
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
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Nearby operators">
          {filteredOperators.map(op => {
            const cashOnly = !canAcceptPlatformPayments(op) || !(op.stripeEnabledJobsOnly ?? true);
            const price = op.pricing?.driveway?.[(clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"] || 40;
            const distance = getDistanceKm(clientProfile, op);
            return <article key={op.uid} className="overflow-hidden rounded-3xl bg-white border border-[var(--border-color)]">
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3"><UserAvatar photoURL={(op as unknown as Record<string,string>).avatar} role="operator" displayName={op.displayName} size={48} /><div className="min-w-0"><h2 className="text-xl font-semibold break-words">{op.businessName || op.displayName}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{op.rating ? `${op.rating.toFixed(1)} ★` : "New operator"}{distance !== null ? ` · ${distance.toFixed(1)} km away` : ` · ${op.city}`}</p></div></div>
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-2xl font-semibold">${price}<span className="ml-1 text-sm font-normal text-[var(--text-muted)]">CAD</span></p><span className="rounded-full bg-[#eaf1ee] px-3 py-1.5 text-sm font-medium">{cashOnly ? "Cash only" : "Pay by card"}</span></div>
                <button onClick={() => bookOperator(op)} disabled={booking} className="btn-primary w-full px-4 py-3">Request help</button>
              </div>
              <details className="operator-details border-t border-[var(--border-color)]"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold">About & options</summary><div className="space-y-4 px-5 pb-5">
                <p className="text-sm leading-6 text-[var(--text-secondary)]">{op.bio || "View the operator’s profile for more information."}</p>
                <p className="text-sm text-[var(--text-secondary)]">{op.equipment?.join(", ")}</p>
                <Link href={`/dashboard/u/${op.uid}`} className="inline-block font-semibold underline">View full profile</Link>
                <div className="flex flex-wrap gap-2"><button onClick={() => toggleFavorite(op.uid)} className="rounded-xl border px-3 py-2 text-sm">{favorites.includes(op.uid) ? "Unsave operator" : "Save operator"}</button><button onClick={() => setAsFavorite(op.uid)} className="rounded-xl border px-3 py-2 text-sm">{favoriteOperatorId === op.uid ? "Remove favourite" : "Make favourite"}</button></div>
              </div></details>
            </article>;
          })}
        </section>
      )}

      {/* Scheduling Modal */}
      <Modal isOpen={!!schedulingOperator} onClose={() => setSchedulingOperator(null)} title="When do you need help?" subtitle={schedulingOperator?.businessName || schedulingOperator?.displayName}>
        {schedulingOperator && <div className="space-y-4">

              {/* ASAP or Scheduled toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScheduleType("asap")}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition ${
                    scheduleType === "asap"
                      ? "border-[var(--ink)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-color)] hover:border-[var(--ink)]/30"
                  }`}
                >
                  <Zap className={`w-5 h-5 ${scheduleType === "asap" ? "text-[var(--ink)]" : "text-[var(--text-muted)]"}`} />
                  <span className={`text-sm font-semibold ${scheduleType === "asap" ? "text-[var(--ink)]" : "text-[var(--text-secondary)]"}`}>
                    ASAP
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">As soon as possible</span>
                </button>
                <button
                  onClick={() => setScheduleType("scheduled")}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition ${
                    scheduleType === "scheduled"
                      ? "border-[var(--ink)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-color)] hover:border-[var(--ink)]/30"
                  }`}
                >
                  <CalendarDays className={`w-5 h-5 ${scheduleType === "scheduled" ? "text-[var(--ink)]" : "text-[var(--text-muted)]"}`} />
                  <span className={`text-sm font-semibold ${scheduleType === "scheduled" ? "text-[var(--ink)]" : "text-[var(--text-secondary)]"}`}>
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
                      aria-label="Job date"
                      value={scheduledDate}
                      min={format(new Date(), "yyyy-MM-dd")}
                      max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-xl border-[3px] border-[var(--border-color)] px-4 py-3 text-sm focus:border-[var(--ink)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Preferred Time</label>
                    <input aria-label="Preferred time" type="time" value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} className="w-full min-h-12 rounded-xl border px-4 py-3" />
                  </div>
                  <p className="text-center text-[10px] text-[var(--text-muted)]">
                    Scheduled for {scheduledDate && Number.isFinite(new Date(scheduledDate + "T12:00:00").getTime()) ? format(new Date(scheduledDate + "T12:00:00"), "EEEE, MMM d") : "Choose a date"} at {scheduledTime}
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-[#eaf1ee] p-4 text-sm">
                {canAcceptPlatformPayments(schedulingOperator) && (schedulingOperator.stripeEnabledJobsOnly ?? true) ? <p>Pay securely by card after your request is accepted.</p> : <><p className="font-semibold">Cash only</p><p className="mt-1">Pay the operator directly when the work is done. No card or Stripe account is needed.</p><label className="mt-3 flex items-start gap-3"><input type="checkbox" checked={cashAcknowledged} onChange={event => setCashAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>I understand this is a cash job.</span></label></>}
              </div>
              {bookingError && <p role="alert" className="text-sm text-red-700">{bookingError}</p>}
              <button
                onClick={confirmBooking}
                disabled={booking || ((!canAcceptPlatformPayments(schedulingOperator) || !(schedulingOperator.stripeEnabledJobsOnly ?? true)) && !cashAcknowledged)}
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
        </div>}
      </Modal>
    </div>
  );
}
