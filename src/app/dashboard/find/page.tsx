"use client";
import { calculateServicePrice, quoteMarketplace } from "@/lib/marketplacePricing";
import { orderRequest } from "@/components/work-orders/OrderActions";

import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { ResultState } from "@/components/ui/AppPrimitives";

import { canAcceptPlatformPayments } from "@/lib/operatorDiscovery";

import CompanyIdentity from "@/components/CompanyIdentity";
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
Banknote,
CreditCard,
Filter,
MapPin,
Search,
Snowflake,
Star,
Zap
} from "lucide-react";
import Link from "next/link";
import { useEffect,useState,useRef } from "react";

const SERVICE_LABELS: Record<ServiceType, string> = {
  driveway: "Driveway",
  walkway: "Walkway",
  sidewalk: "Sidewalk",
  "parking-lot": "Parking Lot",
  roof: "Roof",
  other: "Other",
};

function operatorServicePrice(operator: OperatorProfile, client: ClientProfile) {
  const size = (client?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large";
  const services = client?.propertyDetails?.serviceTypes || ["driveway"];
  return calculateServicePrice(operator.pricing, services, size);
}

export default function FindOperatorsPage() {
  const { user, profile } = useAuth();
  const clientProfile = profile as ClientProfile;
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
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  // Scheduling modal state
  const [schedulingOperator, setSchedulingOperator] = useState<OperatorProfile | null>(null);
  const [scheduleType, setScheduleType] = useState<"asap" | "scheduled">("asap");
  const [scheduledDate, setScheduledDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const clientHasCoordinates =
    typeof clientProfile?.lat === "number" && Number.isFinite(clientProfile.lat) &&
    typeof clientProfile?.lng === "number" && Number.isFinite(clientProfile.lng);
  const propertySize = (clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large";
  const selectedServices = clientProfile?.propertyDetails?.serviceTypes || ["driveway"];
  const [requestedServices, setRequestedServices] = useState<ServiceType[]>(selectedServices);

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
            setFavorites([...new Set([...(userData.savedOperators || []), ...(userData.favoriteOperatorId ? [userData.favoriteOperatorId] : [])])]);
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
        const pinned = Number(favorites.includes(b.uid)) - Number(favorites.includes(a.uid));
        if (pinned) return pinned;
        return b.rating - a.rating;
      });
    } else if (sortBy === "price") {
      results.sort(
        (a, b) => {
          // Favorite operator always first
          const pinned = Number(favorites.includes(b.uid)) - Number(favorites.includes(a.uid));
        if (pinned) return pinned;
          return operatorServicePrice(a, clientProfile) - operatorServicePrice(b, clientProfile);
        }
      );
    } else if (sortBy === "distance") {
      results.sort((a, b) => {
        const pinned = Number(favorites.includes(b.uid)) - Number(favorites.includes(a.uid));
        if (pinned) return pinned;

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
    favorites,
  ]);

  // Book an operator — show scheduling modal first
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const bookingAttempt = useRef<{ key: string; id: string } | null>(null);
  const [cashAcknowledged, setCashAcknowledged] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [createdJobId, setCreatedJobId] = useState("");

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
    setCreatedJobId("");
    setSchedulingOperator(operator);
    setRequestedServices(selectedServices.filter(service => operator.serviceTypes.includes(service)).length
      ? selectedServices.filter(service => operator.serviceTypes.includes(service))
      : operator.serviceTypes.slice(0, 1));
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
      const currentPrice = calculateServicePrice(operator.pricing, requestedServices, propertySize);
      const displayedPrice = calculateServicePrice(schedulingOperator.pricing, requestedServices, propertySize);
      if (currentPrice !== displayedPrice) {
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
        expectedPrice: quoteMarketplace(calculateServicePrice(operator.pricing, requestedServices, propertySize), paymentMethod).price,
        serviceTypes: requestedServices,
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
      setCreatedJobId(jobRef.id);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Could not create this booking. Please try again.");
      console.error("Error creating job:", error);
    } finally {
      setBooking(false);
    }
  };

  const toggleFavorite = async (operatorId: string) => {
    if (!user?.uid || favoriteBusy) return;
    setFavoriteBusy(true);
    setFavoriteError("");
    try {
      const userRef = doc(db, "users", user.uid);
      const currentFavorites = favorites.includes(operatorId)
        ? favorites.filter(id => id !== operatorId) : [...favorites, operatorId];
      await updateDoc(userRef, { savedOperators: currentFavorites, favoriteOperatorId: null });
      setFavorites(currentFavorites);
    } catch { setFavoriteError("Could not save your favorite. Please try again."); }
    finally { setFavoriteBusy(false); }
  };

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      {favoriteError && <p role="alert">{favoriteError}</p>}
      <PageHeader title="Find a shoveler" description={`Choose snow help in ${clientProfile?.city || "your neighbourhood"}.`} />
      <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]"><MapPin className="mr-2 inline h-4 w-4" />{clientProfile?.address || "Add your service address"} <Link href="/dashboard/settings" className="ml-2 inline-flex min-h-11 items-center font-semibold underline">Change</Link></div>

      <section className="surface-panel p-4 md:p-5">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              aria-label="Search operators"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search shovelers"
              className="h-13 w-full rounded-[1.3rem] border-[3px] border-[var(--border-color)] bg-[var(--card)] pl-12 pr-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--ink)]"
            />
          </div>
          <button
            aria-label="Filters"
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
            <span className="hidden sm:inline">Filters</span>
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
            const price = operatorServicePrice(op, clientProfile);
            const distance = getDistanceKm(clientProfile, op);
            return <article key={op.uid} className="operator-card app-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <UserAvatar photoURL={op.avatar} logoURL={op.logoUrl} role="operator" displayName={op.businessName || op.displayName} size={44} />
                <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold break-words"><Link href={`/dashboard/u/${op.uid}?returnTo=${encodeURIComponent(`/dashboard/find`)}`} className="rounded underline-offset-4 hover:underline">{op.businessName || op.displayName}</Link></h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{op.rating ? `${op.rating.toFixed(1)} ★` : "New operator"}{distance !== null ? ` · ${distance.toFixed(1)} km away` : ` · ${op.city}`}</p></div>
                <button type="button" onClick={() => toggleFavorite(op.uid)} disabled={favoriteBusy} aria-pressed={favorites.includes(op.uid)} aria-label={favorites.includes(op.uid) ? `Unsave ${op.businessName || op.displayName}` : `Save ${op.businessName || op.displayName}`} className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"><Star size={19} fill={favorites.includes(op.uid) ? "currentColor" : "none"} className={favorites.includes(op.uid) ? "text-amber-600" : ""} /></button>
              </div>
              <p className="mt-4 text-sm capitalize text-[var(--text-secondary)]">{selectedServices.map(service => service.replaceAll("-", " ")).join(" · ")} · {propertySize} property</p>
              <div className={`mt-3 grid gap-2 ${cashOnly ? "" : "grid-cols-2"}`}>
                {!cashOnly && <div className="rounded-xl bg-[var(--accent-soft)] p-3"><p className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"><CreditCard size={15} />Card</p><p className="mt-1 text-xl font-semibold">${quoteMarketplace(price, "credit").price.toFixed(2)} <span className="text-xs font-normal">CAD</span></p></div>}
                <div className="rounded-xl bg-[var(--bg-secondary)] p-3"><p className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"><Banknote size={15} />Cash{cashOnly ? " only" : ""}</p><p className="mt-1 text-xl font-semibold">${price.toFixed(2)} <span className="text-xs font-normal">CAD</span></p></div>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{cashOnly ? "Pay directly after the work." : "Card charged after photo proof. Cash paid directly."}</p>
              <button onClick={() => bookOperator(op)} disabled={booking} className="btn-primary mt-4 min-h-12 w-full px-4 py-3">Request help</button>
            </article>;
          })}
        </section>
      )}

      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4"><p>{loadError}</p><button type="button" className="mt-2 min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {bookingError && !schedulingOperator && <p role="alert" className="text-red-700">{bookingError}</p>}
      <Modal isOpen={!!schedulingOperator} onClose={() => { if (!booking) { setSchedulingOperator(null); setCreatedJobId(""); } }} title={createdJobId ? undefined : "Review your request"} size="lg" showClose={!booking}>
        {schedulingOperator && createdJobId ? <ResultState title="Help requested." description={`${schedulingOperator.businessName || schedulingOperator.displayName} will review your request. We’ll let you know when they respond.`} actionHref={`/dashboard/jobs/${createdJobId}`} actionLabel="View work order">
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-secondary)] p-4 text-sm font-semibold"><CalendarDays size={18} />{scheduleType === "asap" ? "As soon as possible" : `${scheduledDate} · ${scheduledTime}`}</div>
        </ResultState> : schedulingOperator && <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--bg-secondary)] p-4"><CompanyIdentity person={schedulingOperator} name={schedulingOperator.businessName || schedulingOperator.displayName} /><strong>${quoteMarketplace(calculateServicePrice(schedulingOperator.pricing, requestedServices, propertySize), paymentMethod).price.toFixed(2)} CAD</strong></div>
          <div className="detail-list text-sm">
            <div><span className="text-xs text-[var(--text-muted)]">Service</span><fieldset className="mt-2 flex flex-wrap gap-2"><legend className="sr-only">Choose services for this request</legend>{schedulingOperator.serviceTypes.map(service => <label key={service} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 font-semibold capitalize ${requestedServices.includes(service) ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--border-color)] bg-white"}`}><input type="checkbox" className="h-4 w-4" checked={requestedServices.includes(service)} onChange={() => setRequestedServices(current => current.includes(service) ? current.filter(item => item !== service) : [...current, service])} />{service.replaceAll("-", " ")}</label>)}</fieldset></div>
            <div className="flex items-start justify-between gap-4"><div><span className="text-xs text-[var(--text-muted)]">Your home</span><p className="mt-1 font-semibold">{clientProfile?.address}, {clientProfile?.city}</p></div><MapPin size={18} /></div>
          </div>
          <fieldset><legend className="mb-2 text-sm font-semibold">When?</legend><div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={scheduleType === "asap"} onClick={() => setScheduleType("asap")} className={`min-h-12 rounded-xl border px-3 ${scheduleType === "asap" ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--border-color)]"}`}><Zap className="mr-2 inline h-4 w-4" />ASAP</button>
            <button type="button" aria-pressed={scheduleType === "scheduled"} onClick={() => setScheduleType("scheduled")} className={`min-h-12 rounded-xl border px-3 ${scheduleType === "scheduled" ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--border-color)]"}`}><CalendarDays className="mr-2 inline h-4 w-4" />Schedule</button>
          </div></fieldset>
          {scheduleType === "scheduled" && <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Date<input type="date" aria-label="Job date" value={scheduledDate} min={format(new Date(), "yyyy-MM-dd")} max={format(addDays(new Date(), 30), "yyyy-MM-dd")} onChange={event => setScheduledDate(event.target.value)} className="mt-2 min-h-12 w-full px-3" /></label><label className="text-sm font-semibold">Time<input aria-label="Preferred time" type="time" value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} className="mt-2 min-h-12 w-full px-3" /></label></div>}
          {canAcceptPlatformPayments(schedulingOperator) && <label className="block text-sm font-semibold">Payment<select aria-label="Payment method" value={paymentMethod} onChange={event => { setPaymentMethod(event.target.value as "cash" | "credit"); setCashAcknowledged(false); }} className="mt-2 min-h-12 w-full bg-white px-3"><option value="cash">Cash after the job</option><option value="credit">Card after photo proof</option></select></label>}
          <div className="rounded-xl bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">{paymentMethod === "credit" ? "Authorize a card after acceptance. It is charged only after photo proof." : <label className="flex items-start gap-3"><input type="checkbox" checked={cashAcknowledged} onChange={event => setCashAcknowledged(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" /><span>I’ll pay the operator in cash after the work is done.</span></label>}</div>
          {bookingError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{bookingError}</p>}
          <button onClick={() => void confirmBooking()} disabled={booking || requestedServices.length === 0 || (paymentMethod === "cash" && !cashAcknowledged)} className="btn-primary w-full min-h-13">{booking ? "Sending request…" : "Request snow help"}</button>
          <p className="text-center text-xs text-[var(--text-muted)]">The visit is confirmed when the operator accepts.</p>
        </div>}
      </Modal>
    </div>
  );
}
