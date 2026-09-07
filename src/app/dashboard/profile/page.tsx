"use client";

import ServiceRadiusMap from "@/components/ServiceRadiusMap";
import StarRating from "@/components/StarRating";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
CANADIAN_PROVINCES,
ClientProfile,
OperatorProfile,
ServiceType
} from "@/lib/types";
import { doc,updateDoc } from "firebase/firestore";
import {
AlertCircle,
ArrowLeft,
Banknote,
Camera,
CheckCircle,
ChevronRight,
CreditCard,
DollarSign,
GraduationCap,
Loader2,
Mail,
MapPin,
Phone,
Save,
ShieldCheck,
User,
Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SERVICE_LABELS: Record<ServiceType, string> = {
  driveway: "Driveway",
  walkway: "Walkway",
  sidewalk: "Sidewalk",
  "parking-lot": "Parking Lot",
  roof: "Roof",
  other: "Other",
};

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [province, setProvince] = useState(profile?.province || "");
  const [postalCode, setPostalCode] = useState(profile?.postalCode || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [preferredPayment, setPreferredPayment] = useState<string>(profile?.preferredPaymentMethod || "card");

  // Operator-specific
  const operatorProfile = profile as OperatorProfile;
  const [bio, setBio] = useState(operatorProfile?.bio || "");
  const [businessName, setBusinessName] = useState(operatorProfile?.businessName || "");
  const [serviceRadius, setServiceRadius] = useState(operatorProfile?.serviceRadius || 10);

  const isOperator = profile?.role === "operator";
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const requiredProfileFields: { key: string; label: string; value: string }[] = [
    { key: "displayName", label: "Display Name", value: displayName || "" },
    { key: "phone", label: "Phone", value: phone || "" },
    { key: "address", label: "Street Address", value: address || "" },
    { key: "city", label: "City", value: city || "" },
    { key: "province", label: "Province", value: province || "" },
    { key: "postalCode", label: "Postal Code", value: postalCode || "" },
    ...(isOperator
      ? [
          { key: "businessName", label: "Business Name", value: businessName || "" },
          { key: "bio", label: "Bio", value: bio || "" },
        ]
      : []),
  ];
  const missingProfileFields = requiredProfileFields.filter((field) => !field.value.trim());
  const missingProfileFieldSet = new Set(missingProfileFields.map((field) => field.key));
  const profileCompletionPercent = Math.round(
    ((requiredProfileFields.length - missingProfileFields.length) / requiredProfileFields.length) * 100
  );

  const handleSave = async () => {
    if (!profile?.uid) return;
    setSaved(false);
    setSaving(true);
    const startedAt = Date.now();
    try {
      const updates: Record<string, unknown> = {
        displayName,
        phone,
        city,
        province,
        postalCode,
        address,
      };

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
        updates.serviceRadius = serviceRadius;
      }

      updates.preferredPaymentMethod = preferredPayment;

      await updateDoc(doc(db, "users", profile.uid), updates);
      await refreshProfile();
      const remaining = 2000 - (Date.now() - startedAt);
      if (remaining > 0) {
        await wait(remaining);
      }
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-full bg-white p-2 transition hover:bg-[var(--bg-secondary)]">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-[var(--text-primary)]" />
            Profile
          </h1>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
          >
            Edit Profile
          </button>
        ) : (
          <div className="mobile-primary-actions flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${
                saved ? "bg-green-600 hover:bg-green-700" : "bg-[var(--ink)] hover:bg-black"
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving changes..." : saved ? "Saved" : "Save"}
            </button>
          </div>
        )}
      </div>

      {missingProfileFields.length > 0 && <div className={`rounded-2xl border p-4 ${
        missingProfileFields.length === 0
          ? "bg-green-50 border-green-200"
          : "bg-amber-50 border-amber-200"
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm font-semibold ${
              missingProfileFields.length === 0 ? "text-green-800" : "text-amber-800"
            }`}>
              Profile completion: {profileCompletionPercent}%
            </p>
            {missingProfileFields.length === 0 ? (
              <p className="text-xs text-green-700 mt-1">Everything needed is complete.</p>
            ) : (
              <p className="text-xs text-amber-700 mt-1">
                Complete these fields: {missingProfileFields.map((field) => field.label).join(", ")}
              </p>
            )}
          </div>
          {missingProfileFields.length === 0 ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
        </div>
      </div>}

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" />
          Profile updated successfully!
        </div>
      )}

      {/* Profile Card */}
      <div className="surface-card overflow-hidden">
        <div className="bg-[var(--ink)] px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/12 text-3xl font-bold text-white">
              {profile.displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-white">
              {editing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                    className={`rounded-lg px-3 py-1.5 text-xl font-bold text-white outline-none placeholder-white/60 ${
                      missingProfileFieldSet.has("displayName")
                        ? "bg-amber-200/40 border border-amber-200"
                        : "bg-white/12"
                    }`}
                  />
                ) : (
                  <h2 className="text-xl font-bold">{profile.displayName}</h2>
                )}
              <p className="mt-0.5 capitalize text-white/60">
                {isOperator ? (
                  <>
                    {operatorProfile.isStudent && (
                      <GraduationCap className="w-4 h-4 inline mr-1" />
                    )}
                    {operatorProfile.businessName || "Snow Removal Operator"}
                  </>
                ) : (
                  "Client"
                )}
              </p>
              {isOperator && (
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={operatorProfile.rating || 0} size="sm" />
                  <span className="text-sm text-white/50">
                    ({operatorProfile.reviewCount || 0})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
          <div className="space-y-5 p-6">
          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium truncate">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  {editing ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`text-sm font-medium bg-white px-2 py-1 border rounded-lg w-full ${
                        missingProfileFieldSet.has("phone") ? "border-amber-300 bg-amber-50" : ""
                      }`}
                    />
                  ) : (
                    <p className="text-sm font-medium">{profile.phone || "Not set"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Location
            </h3>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street Address"
                  className={`px-3 py-2 border rounded-lg text-sm col-span-full ${
                    missingProfileFieldSet.has("address") ? "border-amber-300 bg-amber-50" : "border-gray-200"
                  }`}
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className={`px-3 py-2 border rounded-lg text-sm ${
                    missingProfileFieldSet.has("city") ? "border-amber-300 bg-amber-50" : "border-gray-200"
                  }`}
                />
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={`px-3 py-2 border rounded-lg text-sm bg-white ${
                    missingProfileFieldSet.has("province") ? "border-amber-300 bg-amber-50" : "border-gray-200"
                  }`}
                >
                  {CANADIAN_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                  placeholder="Postal Code"
                  maxLength={7}
                  className={`px-3 py-2 border rounded-lg text-sm ${
                    missingProfileFieldSet.has("postalCode") ? "border-amber-300 bg-amber-50" : "border-gray-200"
                  }`}
                />
              </div>
            ) : (
              <div className={`p-3 rounded-xl text-sm ${
                missingProfileFieldSet.has("address") ||
                missingProfileFieldSet.has("city") ||
                missingProfileFieldSet.has("province") ||
                missingProfileFieldSet.has("postalCode")
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-gray-50"
              }`}>
                <p className="font-medium">{profile.address}</p>
                <p className="text-gray-500">
                  {profile.city}, {profile.province} {profile.postalCode}
                </p>
              </div>
            )}
          </div>

          {/* Operator-specific sections */}
          {isOperator && (
            <>
              {/* Bio */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">About</h3>
                {editing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    {operatorProfile.bio || "No bio set"}
                  </p>
                )}
              </div>

              {/* Business Name */}
              {editing && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">Business Name</h3>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${
                      missingProfileFieldSet.has("businessName") ? "border-amber-300 bg-amber-50" : "border-gray-200"
                    }`}
                  />
                </div>
              )}

              {/* Service Radius */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">
                  Service Radius: {editing ? serviceRadius : operatorProfile.serviceRadius} km
                </h3>
                {editing ? (
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={serviceRadius}
                    onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                ) : (
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full"
                      style={{
                        width: `${((operatorProfile.serviceRadius || 10) / 50) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <ServiceRadiusMap address={editing ? address : profile.address} city={editing ? city : profile.city} province={editing ? province : profile.province} postalCode={editing ? postalCode : profile.postalCode} radiusKm={editing ? serviceRadius : (operatorProfile.serviceRadius || 10)} />
              {/* Equipment */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-1">
                  <Wrench className="w-4 h-4" /> Equipment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(operatorProfile.equipment || []).map((eq) => (
                    <span
                      key={eq}
                      className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg text-sm font-medium"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </div>

              {/* Services & Pricing */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> Services & Pricing (CAD)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {operatorProfile.serviceTypes?.map((s) => (
                    <div key={s} className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-xs text-gray-500">{SERVICE_LABELS[s]}</p>
                      <p className="font-semibold text-gray-900 mt-0.5">
                        {s === "driveway"
                          ? `$${operatorProfile.pricing?.driveway?.small || "–"} – $${
                              operatorProfile.pricing?.driveway?.large || "–"
                            }`
                          : s === "walkway"
                          ? `$${operatorProfile.pricing?.walkway || "–"}`
                          : `$${operatorProfile.pricing?.sidewalk || "–"}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Client Property Details */}
          {!isOperator && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Property Details</h3>
              <div className="p-3 bg-gray-50 rounded-xl text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Size:</span>{" "}
                  <span className="capitalize font-medium">
                    {(profile as ClientProfile).propertyDetails?.propertySize || "Not set"}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Services:</span>{" "}
                  {(profile as ClientProfile).propertyDetails?.serviceTypes
                    ?.map((s) => SERVICE_LABELS[s])
                    .join(", ") || "Not set"}
                </p>
                {(profile as ClientProfile).propertyDetails?.specialInstructions && (
                  <p>
                    <span className="text-gray-500">Notes:</span>{" "}
                    {(profile as ClientProfile).propertyDetails.specialInstructions}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-1">
              <CreditCard className="w-4 h-4" /> Preferred Payment
            </h3>
            {editing ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "card", label: "Card", icon: <CreditCard className="w-5 h-5" /> },
                  { value: "cash", label: "Cash", icon: <Banknote className="w-5 h-5" /> },
                  { value: "e-transfer", label: "E-Transfer", icon: <DollarSign className="w-5 h-5" /> },
                ].map((pm) => (
                  <button
                    key={pm.value}
                    onClick={() => setPreferredPayment(pm.value)}
                    className={`p-3 rounded-xl border-2 text-center transition ${
                      preferredPayment === pm.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {pm.icon}
                      <span className="text-xs font-medium">{pm.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {profile.preferredPaymentMethod === "cash" ? (
                  <Banknote className="w-5 h-5 text-green-600" />
                ) : profile.preferredPaymentMethod === "e-transfer" ? (
                  <DollarSign className="w-5 h-5 text-[var(--accent)]" />
                ) : (
                  <CreditCard className="w-5 h-5 text-gray-600" />
                )}
                <div>
                  <p className="text-sm font-medium capitalize">{profile.preferredPaymentMethod || "Card"}</p>
                  <p className="text-xs text-gray-500">Default payment method</p>
                </div>
              </div>
            )}
          </div>

          {/* ID Verification Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> ID Verification
            </h3>
            {profile.idVerified ? (
              profile.idPhotoUrl ? (
                <a
                  href={profile.idPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition group cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700">Verified</p>
                    <p className="text-xs text-green-600">Tap to view your uploaded ID</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-green-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700">Verified</p>
                    <p className="text-xs text-green-600">Your ID has been verified</p>
                  </div>
                </div>
              )
            ) : profile.idPhotoUrl ? (
              <a
                href={profile.idPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition group cursor-pointer"
              >
                <Camera className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700">Pending Review</p>
                  <p className="text-xs text-amber-600">Tap to view your uploaded ID</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : (
              <Link
                href="/dashboard/settings?tab=verification"
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition group"
              >
                <Camera className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700">Not Verified</p>
                  <p className="text-xs text-amber-600">Tap to upload your government ID</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
