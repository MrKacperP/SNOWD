"use client";
import BackButton from "@/components/BackButton";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { IMAGE_ACCEPT, prepareImageUpload } from "@/lib/imageUpload";
import { CANADIAN_PROVINCES, ClientProfile, OperatorProfile, SERVICE_LABELS, isShovelingService } from "@/lib/types";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  BadgeCheck,
  Bell,
  Camera,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Eye,
  GraduationCap,
  Home,
  Hourglass,
  Loader2,
  Mail,
  Map as MapIcon,
  MapPin,
  Pencil,
  Phone,
  Settings,
  ShieldCheck,
  Star,
  Store,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

const PAYMENT_OPTIONS = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "e-transfer", label: "E-Transfer" },
];

const PROPERTY_SIZES: Record<string, string> = {
  small: "1-car driveway",
  medium: "2-car driveway",
  large: "3+ car driveway",
  commercial: "Commercial property",
};

const input = "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]";

/** Where the ID stands. Same rule as the app: "verified" also needs a photo on file. */
function idState(profile: { verificationStatus?: string; idPhotoUrl?: string; idVerified?: boolean }) {
  if (profile.verificationStatus === "rejected") return "rejected";
  if (!profile.idPhotoUrl) return "missing";
  if (profile.verificationStatus === "pending") return "pending";
  return profile.idVerified ? "verified" : "pending";
}

/** The year an account was made; Firestore hands back either a Date or a Timestamp. */
function joinedYear(value: unknown) {
  if (value instanceof Date) return value.getFullYear();
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate(): Date }).toDate().getFullYear();
  return null;
}

/** Small muted heading above a card, like an iOS settings group. */
function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</h3>
      {action}
    </div>
  );
}

/** Tinted rounded-square icon used on every row. */
function Chip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/** One line of the details card: icon, small label, then the value or its input. */
function Field({ icon, label, warn, children }: { icon: LucideIcon; label: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-start gap-3 px-5 py-3.5 ${warn ? "bg-amber-50" : ""}`}>
      <Chip icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-sm font-medium text-[var(--text-primary)]">{children}</div>
      </div>
    </div>
  );
}

/** A link row that opens the matching settings tab. */
function LinkRow({ icon, label, value, href }: { icon: LucideIcon; label: string; value?: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-gray-50">
      <Chip icon={icon} />
      <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{label}</span>
      {value && <span className="max-w-[45%] truncate text-sm text-gray-500">{value}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/**
 * Your profile. On wide screens your card stays pinned on the left while details and settings
 * scroll on the right; on phones everything stacks. Only the details card is ever in edit mode.
 */
export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [province, setProvince] = useState(profile?.province || "");
  const [postalCode, setPostalCode] = useState(profile?.postalCode || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [preferredPayment, setPreferredPayment] = useState<string>(profile?.preferredPaymentMethod || "card");

  const operatorProfile = profile as OperatorProfile;
  const [bio, setBio] = useState(operatorProfile?.bio || "");
  const [businessName, setBusinessName] = useState(operatorProfile?.businessName || "");

  const isOperator = profile?.role === "operator";
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const requiredFields: { key: string; label: string; value: string }[] = [
    { key: "displayName", label: "name", value: displayName },
    { key: "phone", label: "phone", value: phone },
    { key: "address", label: "street address", value: address },
    { key: "city", label: "city", value: city },
    { key: "province", label: "province", value: province },
    { key: "postalCode", label: "postal code", value: postalCode },
    ...(isOperator
      ? [
          { key: "businessName", label: "business name", value: businessName },
          { key: "bio", label: "bio", value: bio },
        ]
      : []),
  ];
  const missing = requiredFields.filter((field) => !field.value.trim());
  const isMissing = (...keys: string[]) => missing.some((field) => keys.includes(field.key));
  const percent = Math.round(((requiredFields.length - missing.length) / requiredFields.length) * 100);

  /** Puts the form back to what's saved, so Cancel really cancels. */
  const resetForm = () => {
    setDisplayName(profile?.displayName || "");
    setPhone(profile?.phone || "");
    setCity(profile?.city || "");
    setProvince(profile?.province || "");
    setPostalCode(profile?.postalCode || "");
    setAddress(profile?.address || "");
    setPreferredPayment(profile?.preferredPaymentMethod || "card");
    setBio(operatorProfile?.bio || "");
    setBusinessName(operatorProfile?.businessName || "");
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    setSaved(false);
    setSaving(true);
    const startedAt = Date.now();
    try {
      const updates: Record<string, unknown> = { displayName, phone, city, province, postalCode, address, preferredPaymentMethod: preferredPayment };

      if (address !== profile.address || city !== profile.city || province !== profile.province || postalCode !== profile.postalCode) {
        updates.lat = null;
        updates.lng = null;
        if (typeof google !== "undefined" && google.maps?.Geocoder) {
          const result = await new google.maps.Geocoder().geocode({ address: `${address}, ${city}, ${province}, ${postalCode}, Canada` });
          const location = result.results[0]?.geometry.location;
          if (location) { updates.lat = location.lat(); updates.lng = location.lng(); }
        }
      }
      if (isOperator) {
        updates.bio = bio;
        updates.businessName = businessName;
      }

      await updateDoc(doc(db, "users", profile.uid), updates);
      await refreshProfile();
      const remaining = 2000 - (Date.now() - startedAt);
      if (remaining > 0) await wait(remaining);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  /** Customers change their photo right here, the same as tapping it in the app. */
  const changePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile?.uid) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const photo = await prepareImageUpload(file, 1600);
      const storageRef = ref(storage, `avatars/${profile.uid}/avatar-${Date.now()}`);
      await uploadBytes(storageRef, photo, { contentType: photo.type });
      await updateDoc(doc(db, "users", profile.uid), { avatar: await getDownloadURL(storageRef) });
      await refreshProfile();
    } catch (error) {
      console.error("Profile photo upload failed", error);
      setPhotoError("Couldn’t update your photo. Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  if (!profile) return null;

  const id = idState(profile);
  const transcript = "studentTranscriptUrl" in profile && !!profile.studentTranscriptUrl;
  const verificationLabel = id === "verified" ? "Verified" : id === "rejected" ? "Action needed" : id === "pending" ? "In review" : "Needed";
  const startEditing = () => { resetForm(); setEditing(true); };

  // Only one card shows: finish verification, then the profile, then (students) the transcript.
  const nudge =
    id !== "verified"
      ? {
          icon: id === "pending" ? Hourglass : ShieldCheck,
          title: id === "pending" ? "Verification in review" : id === "rejected" ? "Verification needs another look" : "Verify your ID",
          caption: id === "pending" ? "We’ll let you know as soon as it’s checked." : "Only used to verify your address and identity.",
          href: "/dashboard/settings?tab=verification",
          progress: null,
        }
      : missing.length
        ? { icon: User, title: `Profile ${percent}% complete`, caption: `Add your ${missing.map((field) => field.label).join(", ")}.`, href: "", progress: percent }
        : !transcript
          ? { icon: GraduationCap, title: "Student? Upload your transcript", caption: "Confirm you’re a student and get better promotions.", href: "/dashboard/settings?tab=verification", progress: null }
          : null;

  const nudgeBody = nudge && (
    <>
      <Chip icon={nudge.icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--text-primary)]">{nudge.title}</span>
        <span className="block text-xs text-gray-500">{nudge.caption}</span>
        {nudge.progress !== null && (
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-100">
            <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${nudge.progress}%` }} />
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
    </>
  );
  const nudgeClass = "surface-card flex w-full items-center gap-3 p-4 text-left transition hover:bg-gray-50";

  const name = (isOperator && operatorProfile.businessName) || profile.displayName || "Your profile";
  const place = [profile.city, profile.province].filter(Boolean).join(", ");
  const since = joinedYear(profile.createdAt);
  const jobsDone = operatorProfile.completedJobs || operatorProfile.totalJobsCompleted || 0;
  const stats = isOperator
    ? [
        { icon: Star, value: operatorProfile.reviewCount ? (operatorProfile.rating || 0).toFixed(1) : "New", label: "Rating" },
        { icon: null, value: String(operatorProfile.reviewCount || 0), label: operatorProfile.reviewCount === 1 ? "Review" : "Reviews" },
        { icon: null, value: String(jobsDone), label: "Jobs done" },
      ]
    : null;
  const services = (operatorProfile.serviceTypes || []).filter(isShovelingService);
  const areaLabel =
    operatorProfile.serviceAreaMode === "cities" && operatorProfile.serviceAreas?.length
      ? `${operatorProfile.serviceAreas.length} ${operatorProfile.serviceAreas.length === 1 ? "city" : "cities"}`
      : `${operatorProfile.serviceRadius || 10} km`;
  const property = (profile as ClientProfile).propertyDetails;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <BackButton href="/dashboard" label="Back" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Who you are: pinned on wide screens */}
        <aside className="surface-card overflow-hidden lg:sticky lg:top-6">
          <div className="h-20 bg-[var(--ink)]" />
          <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
            <div className="relative">
              <div className="rounded-[22px] border-4 border-white bg-white">
                <UserAvatar role={profile.role} photoURL={profile.avatar} logoURL={operatorProfile.logoUrl} displayName={name} size={96} rounded="2xl" />
              </div>
              {isOperator ? (
                <Link href="/dashboard/settings?tab=branding" aria-label="Change business logo" className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[var(--accent)] text-white shadow transition hover:brightness-110">
                  <Camera className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <button type="button" onClick={() => photoInput.current?.click()} disabled={photoBusy} aria-label="Change profile photo" className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[var(--accent)] text-white shadow transition hover:brightness-110 disabled:opacity-70">
                    {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={photoInput} type="file" accept={IMAGE_ACCEPT} onChange={changePhoto} className="hidden" />
                </>
              )}
            </div>

            <h2 className="mt-3 flex max-w-full items-center gap-1.5 text-xl font-bold text-[var(--text-primary)]">
              <span className="truncate">{name}</span>
              {id === "verified" && <BadgeCheck className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-label="Verified" />}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{isOperator ? "Shoveler" : "Customer"}{since ? ` · Joined ${since}` : ""}</p>
            {place && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" /> {place}
              </p>
            )}
            {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}

            {stats && (
              <div className="mt-5 grid w-full grid-cols-3 divide-x divide-[var(--border-soft)] rounded-2xl bg-gray-50 py-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="px-1">
                    <p className="flex items-center justify-center gap-1 text-lg font-bold text-[var(--text-primary)]">
                      {stat.icon && <stat.icon className="h-4 w-4 fill-amber-400 text-amber-400" />}
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {isOperator && (
              <Link href={`/dashboard/u/${profile.uid}`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-gray-50">
                <Eye className="h-4 w-4" /> View public profile
              </Link>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {/* One next step */}
          {nudge &&
            (nudge.href ? (
              <Link href={nudge.href} className={nudgeClass}>{nudgeBody}</Link>
            ) : !editing ? (
              <button onClick={startEditing} className={nudgeClass}>{nudgeBody}</button>
            ) : null)}

          {/* Your details: read here, edited in place */}
          <section>
            <SectionLabel
              action={
                !editing ? (
                  <button onClick={startEditing} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold transition ${saved ? "text-green-700" : "text-[var(--accent)] hover:bg-[var(--accent)]/10"}`}>
                    {saved ? <CheckCircle className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
                    {saved ? "Saved" : "Edit"}
                  </button>
                ) : null
              }
            >
              Personal details
            </SectionLabel>
            <div className={`surface-card divide-y divide-[var(--border-soft)] overflow-hidden transition ${editing ? "ring-2 ring-[var(--accent)]/30" : ""}`}>
              <Field icon={User} label="Name" warn={editing && isMissing("displayName")}>
                {editing ? <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} /> : profile.displayName || "Not set"}
              </Field>
              {isOperator && (
                <Field icon={Store} label="Business name" warn={editing && isMissing("businessName")}>
                  {editing ? <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={input} /> : operatorProfile.businessName || "Not set"}
                </Field>
              )}
              <Field icon={Mail} label="Email">
                <span className="block truncate">{profile.email}</span>
              </Field>
              <Field icon={Phone} label="Phone" warn={editing && isMissing("phone")}>
                {editing ? <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} /> : profile.phone || "Not set"}
              </Field>
              <Field icon={MapPin} label="Address" warn={editing && isMissing("address", "city", "province", "postalCode")}>
                {editing ? (
                  <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-3">
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className={`${input} sm:col-span-3`} />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={input} />
                    <select value={province} onChange={(e) => setProvince(e.target.value)} className={input}>
                      {CANADIAN_PROVINCES.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                    <input value={postalCode} onChange={(e) => setPostalCode(e.target.value.toUpperCase())} placeholder="Postal code" maxLength={7} className={input} />
                  </div>
                ) : profile.address ? (
                  <>
                    {profile.address}
                    <span className="block font-normal text-gray-500">{[profile.city, profile.province, profile.postalCode].filter(Boolean).join(" ")}</span>
                  </>
                ) : (
                  "Not set"
                )}
              </Field>
              {isOperator && (
                <Field icon={User} label="About" warn={editing && isMissing("bio")}>
                  {editing ? (
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${input} resize-none`} />
                  ) : (
                    <span className="whitespace-pre-line font-normal text-gray-600">{operatorProfile.bio || "No bio yet"}</span>
                  )}
                </Field>
              )}
              <Field icon={CreditCard} label="Preferred payment">
                {editing ? (
                  <select value={preferredPayment} onChange={(e) => setPreferredPayment(e.target.value)} className={input}>
                    {PAYMENT_OPTIONS.map((pm) => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                ) : (
                  PAYMENT_OPTIONS.find((pm) => pm.value === (profile.preferredPaymentMethod || "card"))?.label || "Card"
                )}
              </Field>
              {editing && (
                <div className="mobile-primary-actions flex justify-end gap-2 bg-gray-50 px-5 py-3">
                  <button onClick={() => { resetForm(); setEditing(false); }} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-cta flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Everything else lives in settings */}
          <section>
            <SectionLabel>{isOperator ? "Your business" : "Your home"}</SectionLabel>
            <div className="surface-card divide-y divide-[var(--border-soft)] overflow-hidden">
              {isOperator ? (
                <LinkRow
                  icon={MapIcon}
                  label="Service area & prices"
                  value={`${areaLabel}${services.length ? ` · ${services.map((s) => SERVICE_LABELS[s]).join(", ")}` : ""}`}
                  href="/dashboard/settings?tab=service-areas"
                />
              ) : (
                <LinkRow icon={Home} label="Your property" value={(property?.propertySize && PROPERTY_SIZES[property.propertySize]) || "Add details"} href="/dashboard/settings?tab=properties" />
              )}
              <LinkRow icon={CreditCard} label={isOperator ? "Payouts" : "Payments"} href="/dashboard/settings?tab=payment" />
            </div>
          </section>

          <section>
            <SectionLabel>Account</SectionLabel>
            <div className="surface-card divide-y divide-[var(--border-soft)] overflow-hidden">
              <LinkRow icon={ShieldCheck} label="Verification" value={id === "verified" && !transcript ? "Add transcript" : verificationLabel} href="/dashboard/settings?tab=verification" />
              <LinkRow icon={Bell} label="Notifications" href="/dashboard/settings?tab=notifications" />
              <LinkRow icon={Settings} label="All settings" href="/dashboard/settings" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
