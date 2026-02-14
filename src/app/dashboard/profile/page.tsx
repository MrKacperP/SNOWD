"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ClientProfile,
  OperatorProfile,
  CANADIAN_PROVINCES,
  EQUIPMENT_OPTIONS,
  ServiceType,
} from "@/lib/types";
import StarRating from "@/components/StarRating";
import {
  User,
  MapPin,
  Phone,
  Mail,
  Wrench,
  DollarSign,
  GraduationCap,
  Save,
  CheckCircle,
  ArrowLeft,
  CreditCard,
  Banknote,
  Camera,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

  const handleSave = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        displayName,
        phone,
        city,
        province,
        postalCode,
        address,
      };

      if (isOperator) {
        updates.bio = bio;
        updates.businessName = businessName;
        updates.serviceRadius = serviceRadius;
      }

      updates.preferredPaymentMethod = preferredPayment;

      await updateDoc(doc(db, "users", profile.uid), updates);
      await refreshProfile();
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-[#4361EE]" />
            Profile
          </h1>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-sm font-medium text-[#4361EE] hover:bg-[#4361EE]/10 rounded-lg transition"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-[#4361EE] text-white rounded-lg hover:bg-[#3651D4] transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" />
          Profile updated successfully!
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#4361EE] px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white font-bold text-3xl">
              {profile.displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-white">
              {editing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg text-white placeholder-white/60 outline-none text-xl font-bold"
                />
              ) : (
                <h2 className="text-xl font-bold">{profile.displayName}</h2>
              )}
              <p className="text-[#4361EE]/20 capitalize mt-0.5">
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
                  <span className="text-[#4361EE]/30 text-sm">
                    ({operatorProfile.reviewCount || 0})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-5">
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
                      className="text-sm font-medium bg-white px-2 py-1 border rounded-lg w-full"
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
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm col-span-full"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
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
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl text-sm">
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
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
                      className="h-full bg-[#4361EE] rounded-full"
                      style={{
                        width: `${((operatorProfile.serviceRadius || 10) / 50) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Equipment */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-1">
                  <Wrench className="w-4 h-4" /> Equipment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(operatorProfile.equipment || []).map((eq) => (
                    <span
                      key={eq}
                      className="px-3 py-1 bg-[#4361EE]/10 text-[#4361EE] rounded-lg text-sm font-medium"
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
                        ? "border-[#4361EE] bg-[#4361EE]/5 text-[#4361EE]"
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
                  <DollarSign className="w-5 h-5 text-[#4361EE]" />
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
            <div className={`flex items-center gap-3 p-3 rounded-xl ${
              profile.idVerified ? "bg-green-50" : "bg-amber-50"
            }`}>
              {profile.idVerified ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700">Verified</p>
                    <p className="text-xs text-green-600">Your ID has been verified</p>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">Not Verified</p>
                    <p className="text-xs text-amber-600">Upload a photo ID in Settings to complete verification</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
