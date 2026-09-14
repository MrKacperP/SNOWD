"use client";
import { orderRequest } from "@/components/work-orders/OrderActions";

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
collection,
doc,
getDoc,
getDocs,
query,
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
import { useEffect,useState,useRef } from "react";

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

  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);

  // Fetch operators with same baseline criteria used by calendar booking.
  useEffect(() => {
    const fetchOperators = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "operator"),
        );
        const snap = await getDocs(q);
        const fetchedOperators = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as OperatorProfile))
          .filter((operator) => operator.onboardingComplete !== false && isOperatorPublic(operator));
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
        setLoadError("We couldn’t load nearby shovelers. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, [user?.uid, clientProfile, retry]);

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
          (op.bio || "").toLowerCase().includes(term)
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const bookingAttempt = useRef<{ key: string; id: string } | null>(null);
  const [cashAcknowledged, setCashAcknowledged] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const [openedInvitation, setOpenedInvitation] = useState(false);
  useEffect(() => {
    if (loading || openedInvitation || !profile) return;
    const operatorId = new URLSearchParams(window.location.search).get("operator");
    if (!operatorId) return;
    setOpenedInvitation(true);
    const operator = operators.find(item => item.uid === operatorId);
    if (operator && isClientWithinOperatorRadius(clientProfile, operator)) setSchedulingOperator(operator);
    else setBookingError("This operator is not currently available in your service area.");
  }, [loading, openedInvitation, profile, operators, clientProfile]);

  const bookOperator = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setSchedulingOperator(operator);
    setPaymentMethod("cash");
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
    setBooking(true);
    try {
      const operatorSnapshot = await getDoc(doc(db, "users", schedulingOperator.uid));
      const operator = { ...operatorSnapshot.data(), uid: schedulingOperator.uid } as OperatorProfile;
      if (!operatorSnapshot.exists() || !isOperatorPublic(operator) || !isClientWithinOperatorRadius(clientProfile, operator)) {
        setBookingError("This operator is no longer available in your service area.");
        return;
      }
      const size = (clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large";
      if ((operator.pricing?.driveway?.[size] || 40) !== (schedulingOperator.pricing?.driveway?.[size] || 40)) {
        setSchedulingOperator(operator);
        setCashAcknowledged(false);
        setBookingError("The price has changed. Review the updated total before sending your request.");
        return;
      }
      const cardRequired = paymentMethod === "credit" && canAcceptPlatformPayments(operator);
      if (paymentMethod === "credit" && !cardRequired) { setBookingError("Card payments are no longer available. Select cash to continue."); return; }
      if (!cardRequired && !cashAcknowledged) return;
      const scheduleMillis = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
      if (scheduleType === "scheduled" && (!Number.isFinite(scheduleMillis) || scheduleMillis <= Date.now() || scheduledDate > format(addDays(new Date(), 30), "yyyy-MM-dd"))) {
        setBookingError("Choose a future date and time."); return;
      }
      // Each request is its own work order, so clients can schedule overlapping
      // visits with the same operator or with different operators.
      await createNewJobAndChat(operator);
    } catch (error) {
      setBookingError("Could not request this job. Please try again.");
      console.error("Error booking operator:", error);
      setBooking(false);
    } finally {
      setBooking(false);
    }
  };

  // Create a brand new job and chat
  const createNewJobAndChat = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setBooking(true);

    try {
      const operatorRequiresCard =
        paymentMethod === "credit" && canAcceptPlatformPayments(operator);

      const payload = {
        operatorId: operator.uid,
        scheduleMode: scheduleType,
        scheduledDate: scheduleType === "scheduled" ? new Date(scheduledDate + "T" + scheduledTime).toISOString() : null,
        scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        paymentMethod: operatorRequiresCard ? "credit" : "cash",
        cashPaymentAcknowledged: !operatorRequiresCard && cashAcknowledged,
        expectedPrice: schedulingOperator?.pricing?.driveway?.[(clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"] || 40,
      };
      const key = JSON.stringify(payload);
      if (bookingAttempt.current?.key !== key) bookingAttempt.current = { key, id: crypto.randomUUID() };
      const result = await orderRequest("/api/jobs/create", { ...payload, requestId: bookingAttempt.current.id });
      const jobRef = { id: result.jobId };

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
      router.push(`/dashboard/jobs/${jobRef.id}`);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Could not create this booking. Please try again.");
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
      <PageHeader title="Find a shoveler" description={`Choose snow help in ${clientProfile?.city || "your neighbourhood"}.`} />
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
              placeholder="Search by name, service, or city"
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
      ) : loadError ? null : filteredOperators.length === 0 ? (
        <div className="surface-panel px-6 py-14 text-center">
          <Snowflake className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]/40" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">No operators found</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {clientHasCoordinates
              ? "Try adjusting your search or filters, or check back later."
              : "Add your exact address in settings to unlock nearby operator matching."}
          </p>
          <button type="button" className="mt-3 min-h-11 underline" onClick={() => { setSearchTerm(""); setFilterService("all"); setFilterEquipment("all"); setFilterStudents(false); setFilterVerified(false); }}>Clear search and filters</button>
          {!clientHasCoordinates && <Link className="ml-4 inline-flex min-h-11 items-center underline" href="/dashboard/settings">Update address</Link>}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Nearby operators">
          {filteredOperators.map(op => {
            const cashOnly = !canAcceptPlatformPayments(op);
            const price = op.pricing?.driveway?.[(clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"] || 40;
            const distance = getDistanceKm(clientProfile, op);
            return <article key={op.uid} className="overflow-hidden rounded-3xl bg-white border border-[var(--border-color)]">
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3"><UserAvatar photoURL={op.avatar} logoURL={op.logoUrl} role="operator" displayName={op.businessName || op.displayName} size={48} /><div className="min-w-0"><h2 className="text-xl font-semibold break-words">{op.businessName || op.displayName}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{op.rating ? `${op.rating.toFixed(1)} ★` : "New operator"}{distance !== null ? ` · ${distance.toFixed(1)} km away` : ` · ${op.city}`}</p></div></div>
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-2xl font-semibold">${price}<span className="ml-1 text-sm font-normal text-[var(--text-muted)]">CAD</span></p><span className="rounded-full bg-[#eaf1ee] px-3 py-1.5 text-sm font-medium">{cashOnly ? "Cash only" : "Cash or card"}</span></div>
                <button onClick={() => bookOperator(op)} disabled={booking} className="btn-primary w-full px-4 py-3">Request help</button>
              </div>
              <details className="operator-details border-t border-[var(--border-color)]"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold">About & options</summary><div className="space-y-4 px-5 pb-5">
                <p className="text-sm leading-6 text-[var(--text-secondary)]">{op.bio || "View the operator’s profile for more information."}</p>
                <p className="text-sm text-[var(--text-secondary)]">{op.equipment?.join(", ")}</p>
                <Link href={`/dashboard/u/${op.uid}?returnTo=${encodeURIComponent(`/dashboard/find`)}`} className="inline-block font-semibold underline">View full profile</Link>
                <div className="flex flex-wrap gap-2"><button onClick={() => toggleFavorite(op.uid)} className="rounded-xl border px-3 py-2 text-sm">{favorites.includes(op.uid) ? "Unsave operator" : "Save operator"}</button><button onClick={() => setAsFavorite(op.uid)} className="rounded-xl border px-3 py-2 text-sm">{favoriteOperatorId === op.uid ? "Remove favourite" : "Make favourite"}</button></div>
              </div></details>
            </article>;
          })}
        </section>
      )}

      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4"><p>{loadError}</p><button type="button" className="mt-2 min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {bookingError && !schedulingOperator && <p role="alert" className="text-red-700">{bookingError}</p>}
      {/* Scheduling Modal */}
      <Modal isOpen={!!schedulingOperator} onClose={() => { if (!booking) setSchedulingOperator(null); }} title="Review your request" subtitle={schedulingOperator?.businessName || schedulingOperator?.displayName}>
        {schedulingOperator && <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
            <p className="font-semibold">{clientProfile?.address}, {clientProfile?.city}</p>
            <p className="mt-1 text-sm capitalize">{clientProfile?.propertyDetails?.serviceTypes?.map(service => service.replaceAll("-", " ")).join(" · ") || "Driveway"} · {clientProfile?.propertyDetails?.propertySize || "medium"} property</p>
            <p className="mt-3 text-xl font-bold">${(schedulingOperator.pricing?.driveway?.[(clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"] || 40).toFixed(2)} CAD <span className="text-sm font-normal">per visit</span></p>
            <Link href="/dashboard/settings" className="mt-2 inline-flex min-h-11 items-center text-sm underline">Change property details</Link>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">This is a request. Your visit is confirmed when the shoveler accepts. For ASAP help, agree on an arrival time in messages.</p>

              {/* ASAP or Scheduled toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  aria-pressed={scheduleType === "asap"}
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
                  aria-pressed={scheduleType === "scheduled"}
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
                {canAcceptPlatformPayments(schedulingOperator) && <label className="mb-3 block font-semibold">Payment method<select aria-label="Payment method" value={paymentMethod} onChange={event => { setPaymentMethod(event.target.value as "cash" | "credit"); setCashAcknowledged(false); }} className="mt-2 block w-full rounded-xl border bg-white p-3"><option value="cash">Cash after the job</option><option value="credit">Card</option></select></label>}
                {paymentMethod === "credit" ? <p>Authorize a card hold after your request is accepted. Your card is charged when the work is completed with photo proof.</p> : <><p className="font-semibold">Cash after the job</p><p className="mt-1">Pay the operator directly after the job is done. No card or Stripe account is needed.</p><label className="mt-3 flex items-start gap-3"><input type="checkbox" checked={cashAcknowledged} onChange={event => setCashAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>I agree to pay the operator in cash after the job is done.</span></label></>}
              </div>
              {bookingError && <p role="alert" className="text-sm text-red-700">{bookingError}</p>}
              <button
                onClick={confirmBooking}
                disabled={booking || (paymentMethod === "cash" && !cashAcknowledged)}
                className="btn-primary w-full px-4 py-3.5"
              >
                <MessageSquare className="w-4 h-4" />
                {booking ? "Sending request…" : "Send booking request"}
              </button>
              <button
                onClick={() => setSchedulingOperator(null)}
                disabled={booking}
                className="min-h-11 w-full py-3 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
        </div>}
      </Modal>
    </div>
  );
}
