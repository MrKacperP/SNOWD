"use client";
import IconSwap from "@/components/ui/IconSwap";

import { calculateServicePrice, quoteMarketplace } from "@/lib/marketplacePricing";
import { orderRequest } from "@/components/work-orders/OrderActions";

import Modal from "@/components/ui/Modal";
import SnowdMap, { type ServiceAreaShape } from "@/components/SnowdMap";
import popup from "@/components/ui/popup.module.css";
import ServiceLocationPicker from "@/components/ServiceLocationPicker";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { formatServiceAddress, sameServiceAddress } from "@/lib/serviceLocations";
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
import { ClientProfile,OperatorProfile,ServiceType,SERVICE_LABELS,isShovelingService } from "@/lib/types";
import { propertySizeLabel } from "@/lib/workOrders";
import { addDays,addMonths,eachDayOfInterval,endOfMonth,endOfWeek,format,isBefore,isSameMonth,startOfMonth,startOfWeek } from "date-fns";
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
ArrowRight,
CalendarDays,
Banknote,
Check,
ChevronLeft,
Send,
CreditCard,
MapPin,
Snowflake,
Star,
Zap
} from "lucide-react";
import Link from "next/link";
import { useEffect,useMemo,useState,useRef } from "react";


/** Pre-select the client's saved areas this operator offers, or the operator's first bookable area. */
function startingServices(saved: ServiceType[], operator: OperatorProfile) {
  const offered = operator.serviceTypes.filter(isShovelingService);
  const matches = saved.filter(service => offered.includes(service));
  return matches.length ? matches : offered.slice(0, 1);
}

function operatorServicePrice(operator: OperatorProfile, client: ClientProfile) {
  const size = (client?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large";
  const services = client?.propertyDetails?.serviceTypes || ["driveway"];
  return calculateServicePrice(operator.pricing, services, size);
}

export default function FindOperatorsPage() {
  const { user, profile } = useAuth();
  const locations = useServiceLocation();
  const clientProfile = useMemo(() => profile ? { ...profile, ...(locations?.location || {}), propertyDetails: { ...(profile as ClientProfile).propertyDetails, propertySize:locations?.location?.propertySize || (profile as ClientProfile).propertyDetails?.propertySize || "medium" } } as ClientProfile : null as unknown as ClientProfile, [profile,locations?.location]);
  const [operators, setOperators] = useState<OperatorProfile[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<OperatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardsOnly, setCardsOnly] = useState(false);
  useEffect(() => { setCardsOnly(new URLSearchParams(window.location.search).get("payment") === "credit"); }, []);
  const [booking, setBooking] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  // Scheduling modal state
  const [schedulingOperator, setSchedulingOperator] = useState<OperatorProfile | null>(null);
  const [scheduleType, setScheduleType] = useState<"asap" | "scheduled">("asap");
  const [timingChosen, setTimingChosen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
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

    if (cardsOnly) results = results.filter(canAcceptPlatformPayments);

    // Favorites first, then nearest.
    results.sort((a, b) => {
      const pinned = Number(favorites.includes(b.uid)) - Number(favorites.includes(a.uid));
      if (pinned) return pinned;
      return (getDistanceKm(clientProfile, a) ?? Number.POSITIVE_INFINITY) - (getDistanceKm(clientProfile, b) ?? Number.POSITIVE_INFINITY);
    });

    setFilteredOperators(results);
  }, [
    operators,
    clientProfile,
    cardsOnly,
    favorites,
  ]);

  // Book an operator — show scheduling modal first
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const bookingAttempt = useRef<{ key: string; id: string } | null>(null);
  const [cashAcknowledged, setCashAcknowledged] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [createdJobId, setCreatedJobId] = useState("");
  const [bookingStep, setBookingStep] = useState(1);
  const [editingLocation, setEditingLocation] = useState(false);
  const [confirmedAddress,setConfirmedAddress] = useState("");
  const serviceLocation = locations?.location || clientProfile;
  const differentAddress = !sameServiceAddress(serviceLocation,profile);
  const locationLabel = locations?.properties.find(property => sameServiceAddress(property, serviceLocation))?.label || (differentAddress ? "Service location" : "Home");
  const addressConfirmed = !differentAddress || confirmedAddress === formatServiceAddress(serviceLocation);
  const locationReady = !!locations?.ready && !locations.error && Boolean(serviceLocation?.address?.trim() && serviceLocation?.city?.trim() && serviceLocation?.province?.trim() && /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(serviceLocation?.postalCode?.trim() || ""));
  const locationInRange = Boolean(schedulingOperator && isClientWithinOperatorRadius(clientProfile, schedulingOperator));
  const operatorArea = useMemo<ServiceAreaShape | undefined>(() => {
    if (!schedulingOperator) return undefined;
    const outside = locationReady && !locationInRange;
    if (schedulingOperator.serviceAreaMode === "cities" && schedulingOperator.serviceAreas?.length) return { mode: "cities", cities: schedulingOperator.serviceAreas, outside };
    if (!Number.isFinite(schedulingOperator.lat) || !Number.isFinite(schedulingOperator.lng)) return undefined;
    return { mode: "radius", center: { lat: schedulingOperator.lat!, lng: schedulingOperator.lng! }, radiusKm: schedulingOperator.serviceRadius || 10, outside };
  }, [schedulingOperator, locationReady, locationInRange]);
  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(calendarMonth)), end: endOfWeek(endOfMonth(calendarMonth)) });
  const timeOptions = Array.from({ length: 25 }, (_, index) => { const minutes = 7 * 60 + index * 30; return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; });
  const isScheduledTimePast = (time: string) => new Date(`${scheduledDate}T${time}:00`).getTime() <= Date.now();

  const [openedInvitation, setOpenedInvitation] = useState(false);
  useEffect(() => {
    if (loading || openedInvitation || !profile) return;
    const operatorId = new URLSearchParams(window.location.search).get("operator");
    if (!operatorId) return;
    setOpenedInvitation(true);
    const operator = operators.find(item => item.uid === operatorId);
    if (operator && isClientWithinOperatorRadius(clientProfile, operator)) {
      setSchedulingOperator(operator);
      setBookingStep(1);
      setConfirmedAddress("");
      setEditingLocation(false);
      setTimingChosen(false);
      setRequestedServices(startingServices(clientProfile?.propertyDetails?.serviceTypes || ["driveway"], operator));
      setCashAcknowledged(false);
      setPaymentMethod("cash");
    }
    else setBookingError("This operator is not currently available in your service area.");
  }, [loading, openedInvitation, profile, operators, clientProfile]);

  const bookOperator = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setCreatedJobId("");
    setBookingStep(1);
    setConfirmedAddress("");
    setEditingLocation(false);
    setTimingChosen(false);
    setSchedulingOperator(operator);
    setRequestedServices(startingServices(selectedServices, operator));
    setPaymentMethod("cash");
    const requestedDate = new URLSearchParams(window.location.search).get("date");
    const parsedRequestedDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? new Date(`${requestedDate}T12:00:00`)
      : null;
    const validDate = parsedRequestedDate &&
      Number.isFinite(parsedRequestedDate.getTime()) &&
      format(parsedRequestedDate, "yyyy-MM-dd") === requestedDate &&
      parsedRequestedDate > new Date(new Date().setHours(0, 0, 0, 0)) &&
      parsedRequestedDate <= addDays(new Date(new Date().setHours(0, 0, 0, 0)), 30)
      ? requestedDate
      : null;
    setCashAcknowledged(false);
    setBookingError("");
    setScheduleType(validDate ? "scheduled" : "asap");
    setTimingChosen(Boolean(validDate));
    setScheduledDate(validDate || format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setCalendarMonth(startOfMonth(validDate ? new Date(`${validDate}T12:00:00`) : addDays(new Date(), 1)));
    setScheduledTime("09:00");
  };

  // Confirm booking after schedule selection
  const confirmBooking = async () => {
    if (!schedulingOperator || !user?.uid || !profile) return;
    if (!locationReady || !locationInRange || !addressConfirmed) { setBookingError("Choose a valid address within this operator’s service area."); setBookingStep(2); return; }
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
        serviceLocation,
        serviceAddressConfirmed: addressConfirmed,
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
          address: serviceLocation?.address || "",
          city: serviceLocation?.city || "",
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
      <header className="pt-1">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">Choose SNOWD help in {serviceLocation?.city || clientProfile?.city || "your area"}</h1>
      </header>
      <section aria-label="Your service location" className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-[var(--container-gutter)] border-y border-[var(--border-color)] bg-[var(--glass-wallpaper,var(--bg-primary))] px-[var(--container-gutter)] py-2.5 sm:mx-0 sm:rounded-xl sm:px-4 sm:border lg:top-0">
        <div className="flex items-center gap-2 text-sm">
          <MapPin size={16} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
          <span className="shrink-0 font-semibold text-[var(--text-primary)]">{locationLabel}</span>
          <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">{serviceLocation?.address || "No service address yet"}</span>
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{propertySizeLabel(propertySize)}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">All prices are for a {[propertySizeLabel(propertySize).toLowerCase(), ...selectedServices.filter(service => service !== "driveway").map(service => SERVICE_LABELS[service].toLowerCase())].join(" + ")}.</p>
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
              ? "No one is serving your area right now. Check back later."
              : "Add your exact address in settings to unlock nearby operator matching."}
          </p>
          {cardsOnly && <button type="button" className="mt-3 min-h-11 underline" onClick={() => setCardsOnly(false)}>Show cash operators too</button>}
          {!clientHasCoordinates && <Link className="ml-4 inline-flex min-h-11 items-center underline" href="/dashboard/settings">Update address</Link>}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Nearby operators">
          {filteredOperators.map(op => {
            const cashOnly = !canAcceptPlatformPayments(op);
            const price = operatorServicePrice(op, clientProfile);
            const distance = getDistanceKm(clientProfile, op);
            const company = op.businessName?.trim();
            const name = op.displayName?.trim();
            return <article key={op.uid} className="operator-card app-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <UserAvatar photoURL={op.avatar} logoURL={op.logoUrl} role="operator" displayName={company || name} size={44} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-snug break-words"><Link href={`/dashboard/u/${op.uid}?returnTo=${encodeURIComponent(`/dashboard/find`)}`} className="rounded underline-offset-4 hover:underline">{company || name}</Link></h2>
                  {company && name && company !== name && <p className="text-sm text-[var(--text-secondary)]">{name}</p>}
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">{distance !== null ? `${distance.toFixed(1)} km away` : op.city}</p>
                </div>
                <button type="button" onClick={() => toggleFavorite(op.uid)} disabled={favoriteBusy} aria-pressed={favorites.includes(op.uid)} aria-label={favorites.includes(op.uid) ? `Unsave ${company || name}` : `Save ${company || name}`} className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"><Star size={19} fill={favorites.includes(op.uid) ? "currentColor" : "none"} className={favorites.includes(op.uid) ? "text-amber-600" : ""} /></button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[var(--bg-secondary)] p-3"><p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]"><Banknote size={14} aria-hidden="true" />Cash</p><p className="mt-0.5 text-xl font-semibold">${price.toFixed(2)}</p></div>
                <div className={`rounded-xl p-3 ${cashOnly ? "border border-dashed border-[var(--border-color)]" : "bg-[var(--accent-soft)]"}`}><p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]"><CreditCard size={14} aria-hidden="true" />Card</p>{cashOnly ? <p className="mt-1.5 text-sm text-[var(--text-muted)]">Not accepted</p> : <p className="mt-0.5 text-xl font-semibold">${quoteMarketplace(price, "credit").price.toFixed(2)}</p>}</div>
              </div>
              <button onClick={() => bookOperator(op)} disabled={booking} className="btn-primary mt-4 min-h-12 w-full px-4 py-3">Request help</button>
            </article>;
          })}
        </section>
      )}

      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4"><p>{loadError}</p><button type="button" className="mt-2 min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {bookingError && !schedulingOperator && <p role="alert" className="text-red-700">{bookingError}</p>}
      <Modal isOpen={!!schedulingOperator && !editingLocation} onClose={() => { if (!booking) { setSchedulingOperator(null); setCreatedJobId(""); setBookingStep(1); } }} title={createdJobId ? undefined : `Request snow help · ${bookingStep} of 4`} size="lg" showClose={!booking}>
        {schedulingOperator && createdJobId ? <ResultState title="Request sent." description={`${schedulingOperator.businessName || schedulingOperator.displayName} will review your request. We’ll let you know when they respond.`} actionHref={`/dashboard/jobs/${createdJobId}`} actionLabel="Track your work order">
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-secondary)] p-4 text-sm font-semibold"><CalendarDays size={18} />{scheduleType === "asap" ? "As soon as possible" : `${format(new Date(`${scheduledDate}T12:00:00`), "EEE, MMM d")} · ${format(new Date(`${scheduledDate}T${scheduledTime}:00`), "h:mm a")}`}</div>
          <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">{requestedServices.map(item => item.replaceAll("-", " ")).join(" · ")} · {serviceLocation?.address} · {paymentMethod === "cash" ? "Cash" : "Card"}</p>
        </ResultState> : schedulingOperator && <div className={popup.stack}>
          <div className={popup.progress} aria-hidden="true">{[1, 2, 3, 4].map(step => <span key={step} data-done={step <= bookingStep || undefined} />)}</div>
          {bookingStep > 1 && <button type="button" onClick={() => { setBookingError(""); setBookingStep(current => current - 1); }} className={popup.back}><ChevronLeft size={16} aria-hidden="true" />Back</button>}
          {bookingStep === 1 && <>
          <div className={popup.head}><h3>Choose your service</h3><p>Pick what you need cleared. The price updates as you go.</p></div>
          <div className={`${popup.card} ${popup.row}`}><CompanyIdentity person={schedulingOperator} name={schedulingOperator.businessName || schedulingOperator.displayName} /><span className={popup.price}>${quoteMarketplace(calculateServicePrice(schedulingOperator.pricing, requestedServices, propertySize), paymentMethod).price.toFixed(2)}<small>CAD</small></span></div>
          <fieldset><legend>Service</legend><div className={popup.options}>{schedulingOperator.serviceTypes.filter(isShovelingService).map(service => <label key={service} className={popup.option}><input type="checkbox" checked={requestedServices.includes(service)} onChange={() => setRequestedServices(current => current.includes(service) ? current.filter(item => item !== service) : [...current, service])} /><span className={popup.tick} aria-hidden="true"><Check size={13} strokeWidth={3} /></span>{SERVICE_LABELS[service]}</label>)}</div></fieldset>
          <div className={popup.actions}><button type="button" onClick={() => setBookingStep(2)} disabled={!requestedServices.length} className="dialog-btn" data-tone="primary"><IconSwap icon={<ArrowRight />}>Continue with this shoveler</IconSwap></button></div>
          </>}
          {bookingStep === 2 && <>
          <div className={popup.head}><h3>Confirm your location</h3><p>Check the pin is where the work happens.</p></div>
          <div className={popup.mapCard}>
            <div>{serviceLocation?.address ? <SnowdMap key={formatServiceAddress(serviceLocation)} location={Number.isFinite(serviceLocation.lat) && Number.isFinite(serviceLocation.lng) ? `${serviceLocation.lat},${serviceLocation.lng}` : formatServiceAddress(serviceLocation)} compact client markerAddress={formatServiceAddress(serviceLocation)} serviceArea={operatorArea} /> : <div className={popup.emptyMap}>Choose a service address to see it on the map.</div>}
              {locationReady && operatorArea && <span className={popup.areaTag} data-outside={!locationInRange || undefined}>{locationInRange ? "Inside service area" : "Outside service area"}</span>}</div>
            <div className={popup.mapFoot}><div><strong>{serviceLocation?.address || "No address yet"}</strong><span>{[serviceLocation?.city, serviceLocation?.province, serviceLocation?.postalCode].filter(Boolean).join(", ") || "Add where the work happens"}</span></div><button type="button" className="dialog-btn" data-tone="neutral" onClick={()=>setEditingLocation(true)}><IconSwap icon={<MapPin />}>{(locations?.properties.length || 0) > 1 ? "Change property" : "Change address"}</IconSwap></button></div>
          </div>
          {locations?.error && <p role="alert" className={popup.alert}>{locations.error} <button type="button" className="font-semibold underline" onClick={locations.reload}>Try again</button></p>}
          {differentAddress && <label className={popup.check}><input type="checkbox" checked={addressConfirmed} onChange={e=>setConfirmedAddress(e.target.checked ? formatServiceAddress(serviceLocation) : "")} /><span className={popup.tick} aria-hidden="true"><Check size={13} strokeWidth={3} /></span><span>This differs from my profile home. I confirm service at {formatServiceAddress(serviceLocation)}.</span></label>}
          {locationReady && !locationInRange && <p role="alert" className={popup.alert}>This address is outside this shoveler’s service area. Change the address or choose another shoveler.</p>}
          <div className={popup.actions}><button type="button" onClick={() => { setEditingLocation(false); setBookingStep(3); }} disabled={!locationReady || !locationInRange || !addressConfirmed} className="dialog-btn" data-tone="primary"><IconSwap icon={<ArrowRight />}>Continue</IconSwap></button></div>
          </>}
          {bookingStep === 3 && <>
          <div className={popup.head}><h3>When do you need help?</h3><p>Ask for the next available visit, or pick a time in the next 30 days.</p></div>
          <div className={popup.options} role="group" aria-label="Choose timing">
            <button type="button" aria-pressed={timingChosen && scheduleType === "asap"} onClick={() => { setScheduleType("asap"); setTimingChosen(true); }} className={popup.option}><IconSwap icon={<Zap />}><Zap size={16} aria-hidden="true" />ASAP</IconSwap></button>
            <button type="button" aria-pressed={timingChosen && scheduleType === "scheduled"} onClick={() => { setScheduleType("scheduled"); setTimingChosen(true); }} className={popup.option}><IconSwap icon={<CalendarDays />}><CalendarDays size={16} aria-hidden="true" />Scheduled</IconSwap></button>
          </div>
          {timingChosen && scheduleType === "asap" && <div className={popup.highlight}><Zap className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" /><strong>As soon as possible</strong><span>Arrival confirmed after the operator accepts</span></div>}
          {timingChosen && scheduleType === "scheduled" && <div className={`${popup.card} ${popup.stack}`}>
            <div><div className={popup.calendarHead}><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} className={popup.navBtn}>‹</button><strong>{format(calendarMonth, "MMMM yyyy")}</strong><button type="button" aria-label="Next month" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className={popup.navBtn}>›</button></div>
            <div className={popup.days}>{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}${index}`}>{day}</span>)}{monthDays.map(day => { const value = format(day, "yyyy-MM-dd"); const disabled = isBefore(day, new Date(new Date().setHours(0, 0, 0, 0))) || isBefore(addDays(new Date(), 30), day); return <button key={value} type="button" disabled={disabled} aria-pressed={value === scheduledDate} onClick={() => setScheduledDate(value)} className={popup.day} data-outside={!isSameMonth(day, calendarMonth) || undefined}>{format(day, "d")}</button>; })}</div></div>
            <div><div className={popup.row}><span className={popup.eyebrow}>Time</span><strong className="text-sm">{format(new Date(`2000-01-01T${scheduledTime}:00`), "h:mm a")}</strong></div><div className={popup.slots} role="listbox" aria-label="Choose visit time">{timeOptions.map(time => { const past = isScheduledTimePast(time); return <button key={time} type="button" role="option" aria-selected={scheduledTime === time} disabled={past} onClick={() => setScheduledTime(time)} className={popup.option}>{format(new Date(`2000-01-01T${time}:00`), "h:mm a")}</button>; })}</div></div>
          </div>}
          <div className={popup.actions}><button type="button" onClick={() => setBookingStep(4)} disabled={!timingChosen || (scheduleType === "scheduled" && (!scheduledDate || new Date(`${scheduledDate}T${scheduledTime}`).getTime() <= Date.now()))} className="dialog-btn" data-tone="primary"><IconSwap icon={<ArrowRight />}>Review choices</IconSwap></button></div>
          </>}
          {bookingStep === 4 && <>
          <div className={popup.head}><h3>Review and request</h3><p>Nothing is charged until the work is done.</p></div>
          <div className={`detail-list ${popup.review}`}>
            <div><span>Shoveler</span><strong>{schedulingOperator.businessName || schedulingOperator.displayName}</strong></div>
            <div><span>Service</span><strong>{requestedServices.map(item => SERVICE_LABELS[item]).join(" · ")}</strong></div>
            <div><span>Location</span><strong>{serviceLocation?.address}, {serviceLocation?.city}</strong></div>
            <div><span>When</span><strong>{scheduleType === "asap" ? "As soon as possible" : `${format(new Date(`${scheduledDate}T12:00:00`), "EEE, MMM d")} · ${format(new Date(`${scheduledDate}T${scheduledTime}:00`), "h:mm a")}`}</strong></div>
          </div>
          <div className={popup.total}><span>Total</span><strong>${quoteMarketplace(calculateServicePrice(schedulingOperator.pricing, requestedServices, propertySize), paymentMethod).price.toFixed(2)} CAD</strong></div>
          <fieldset><legend>Payment preference</legend><div className={popup.options}><button type="button" aria-pressed={paymentMethod === "cash"} onClick={() => { setPaymentMethod("cash"); setCashAcknowledged(false); }} className={popup.option}><IconSwap icon={<Banknote />}><Banknote size={16} aria-hidden="true" />Cash</IconSwap></button>{canAcceptPlatformPayments(schedulingOperator) && <button type="button" aria-pressed={paymentMethod === "credit"} onClick={() => { setPaymentMethod("credit"); setCashAcknowledged(false); }} className={popup.option}><IconSwap icon={<CreditCard />}><CreditCard size={16} aria-hidden="true" />Card</IconSwap></button>}</div></fieldset>
          {paymentMethod === "credit" ? <p className="dialog-message">Authorize a card after acceptance. It is charged only after photo proof.</p> : <label className={popup.check}><input type="checkbox" checked={cashAcknowledged} onChange={event => setCashAcknowledged(event.target.checked)} /><span className={popup.tick} aria-hidden="true"><Check size={13} strokeWidth={3} /></span><span>I’ll pay the operator in cash after the work is done.</span></label>}
          {bookingError && <p role="alert" className={popup.alert}>{bookingError}</p>}
          <div className={popup.actions}><button type="button" onClick={() => void confirmBooking()} disabled={booking || requestedServices.length === 0 || (paymentMethod === "cash" && !cashAcknowledged)} className="dialog-btn action-shine" data-tone="primary"><IconSwap icon={<Send />}>{booking ? "Sending request…" : "Request snow help"}</IconSwap></button></div>
          <p className={popup.note}>The visit is confirmed when the operator accepts.</p>
          </>}
        </div>}
      </Modal>
      {editingLocation && <ServiceLocationPicker onClose={()=>{setEditingLocation(false);setConfirmedAddress("");}} />}
    </div>
  );
}
