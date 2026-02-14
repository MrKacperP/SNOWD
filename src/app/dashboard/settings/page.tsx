"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  UserProfile,
  ClientProfile,
  OperatorProfile,
  CANADIAN_PROVINCES,
  EQUIPMENT_OPTIONS,
  ThemePreference,
} from "@/lib/types";
import ServiceRadiusMap from "@/components/ServiceRadiusMap";
import {
  User,
  MapPin,
  Phone,
  Mail,
  Wrench,
  DollarSign,
  Sun,
  Moon,
  Monitor,
  CreditCard,
  Save,
  CheckCircle,
  ChevronRight,
  Shield,
  Bell,
  Building2,
  LogOut,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Camera,
  ShieldCheck,
  GraduationCap,
  Upload,
  Palette,
  ImagePlus,
  Trash2,
  Briefcase,
} from "lucide-react";

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "payment" | "notifications" | "verification" | "branding">("general");
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
  } | null>(null);

  // Editable fields
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [province, setProvince] = useState(profile?.province || "");
  const [postalCode, setPostalCode] = useState(profile?.postalCode || "");
  const [address, setAddress] = useState(profile?.address || "");

  // Operator fields
  const operatorProfile = profile as OperatorProfile;
  const [bio, setBio] = useState(operatorProfile?.bio || "");
  const [businessName, setBusinessName] = useState(operatorProfile?.businessName || "");
  const [serviceRadius, setServiceRadius] = useState(operatorProfile?.serviceRadius || 10);

  const isOperator = profile?.role === "operator";

  // Verification state
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState(profile?.idPhotoUrl || "");
  const [studentTranscriptUrl, setStudentTranscriptUrl] = useState(
    (profile as OperatorProfile)?.studentTranscriptUrl || ""
  );

  // Branding state
  const [brandingTagline, setBrandingTagline] = useState((profile as OperatorProfile & { tagline?: string })?.tagline || "");
  const [brandingDescription, setBrandingDescription] = useState((profile as OperatorProfile & { brandDescription?: string })?.brandDescription || "");
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>((profile as OperatorProfile & { portfolioPhotos?: string[] })?.portfolioPhotos || []);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [logoUrl, setLogoUrl] = useState((profile as OperatorProfile & { logoUrl?: string })?.logoUrl || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;
    setUploadingId(true);
    try {
      const storageRef = ref(storage, `verification/${profile.uid}/id-photo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", profile.uid), { idPhotoUrl: url, idVerified: false });
      setIdPhotoUrl(url);
      await refreshProfile();
    } catch (err) {
      console.error("ID upload error:", err);
    } finally {
      setUploadingId(false);
    }
  };

  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;
    setUploadingTranscript(true);
    try {
      const storageRef = ref(storage, `verification/${profile.uid}/transcript`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", profile.uid), { studentTranscriptUrl: url });
      setStudentTranscriptUrl(url);
      await refreshProfile();
    } catch (err) {
      console.error("Transcript upload error:", err);
    } finally {
      setUploadingTranscript(false);
    }
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `branding/${profile.uid}/logo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", profile.uid), { logoUrl: url });
      setLogoUrl(url);
      await refreshProfile();
    } catch (err) {
      console.error("Logo upload error:", err);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Portfolio photo upload
  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile?.uid) return;
    setUploadingPortfolio(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `branding/${profile.uid}/portfolio/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      }
      const updated = [...portfolioPhotos, ...newUrls];
      await updateDoc(doc(db, "users", profile.uid), { portfolioPhotos: updated });
      setPortfolioPhotos(updated);
      await refreshProfile();
    } catch (err) {
      console.error("Portfolio upload error:", err);
    } finally {
      setUploadingPortfolio(false);
    }
  };

  // Remove portfolio photo
  const removePortfolioPhoto = async (index: number) => {
    if (!profile?.uid) return;
    const updated = portfolioPhotos.filter((_, i) => i !== index);
    await updateDoc(doc(db, "users", profile.uid), { portfolioPhotos: updated });
    setPortfolioPhotos(updated);
    await refreshProfile();
  };

  // Save branding info
  const saveBranding = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        tagline: brandingTagline,
        brandDescription: brandingDescription,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Branding save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Handle Stripe return from onboarding
  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    const accountId = searchParams.get("account");

    if (stripeParam === "success" && accountId && profile?.uid) {
      // Save the Stripe account ID to the user's profile
      updateDoc(doc(db, "users", profile.uid), {
        stripeConnectAccountId: accountId,
      }).then(() => {
        refreshProfile();
        setActiveTab("payment");
      });
      // Clean URL
      router.replace("/dashboard/settings");
    } else if (stripeParam === "refresh") {
      setActiveTab("payment");
      router.replace("/dashboard/settings");
    }

    // Handle tab query param (e.g. from transactions page)
    const tabParam = searchParams.get("tab");
    if (tabParam && ["general", "appearance", "payment", "notifications", "verification", "branding"].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
  }, [searchParams, profile?.uid, router, refreshProfile]);

  // Check Stripe Connect account status
  useEffect(() => {
    const checkStripeStatus = async () => {
      const accountId = (profile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId;
      if (!accountId || !isOperator) return;

      try {
        const res = await fetch("/api/stripe/account-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });
        const data = await res.json();
        if (!data.error) {
          setStripeStatus(data);
        }
      } catch (e) {
        console.error("Stripe status check error:", e);
      }
    };
    checkStripeStatus();
  }, [profile, isOperator]);

  const handleStripeConnect = async () => {
    if (!profile?.uid || !user?.email) return;
    setStripeConnecting(true);

    try {
      const existingAccountId = (profile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId;

      if (existingAccountId) {
        // Already has an account, create a new onboarding link
        const res = await fetch("/api/stripe/account-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: existingAccountId }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        window.location.href = data.onboardingUrl;
      } else {
        // Create new Connect account
        const res = await fetch("/api/stripe/create-connect-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            operatorId: profile.uid,
            businessName: (profile as OperatorProfile).businessName || profile.displayName,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Save account ID
        await updateDoc(doc(db, "users", profile.uid), {
          stripeConnectAccountId: data.accountId,
        });

        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      console.error("Stripe connect error:", error);
      alert("Failed to start Stripe setup. Please try again.");
    } finally {
      setStripeConnecting(false);
    }
  };

  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
      setProvince(profile.province || "");
      setPostalCode(profile.postalCode || "");
      setAddress(profile.address || "");
      if (isOperator) {
        const op = profile as OperatorProfile;
        setBio(op.bio || "");
        setBusinessName(op.businessName || "");
        setServiceRadius(op.serviceRadius || 10);
      }
    }
  }, [profile, isOperator]);

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
      await updateDoc(doc(db, "users", profile.uid), updates);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (profile?.uid) {
        await updateDoc(doc(db, "users", profile.uid), { isOnline: false });
      }
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleThemeChange = async (newTheme: ThemePreference) => {
    setTheme(newTheme);
    if (profile?.uid) {
      try {
        await updateDoc(doc(db, "users", profile.uid), { themePreference: newTheme });
      } catch (e) {
        console.error("Theme save error:", e);
      }
    }
  };

  const TABS = [
    { key: "general" as const, label: "General", icon: User },
    { key: "appearance" as const, label: "Appearance", icon: Sun },
    { key: "payment" as const, label: "Payment", icon: CreditCard },
    { key: "verification" as const, label: "Verification", icon: ShieldCheck },
    { key: "notifications" as const, label: "Notifications", icon: Bell },
    ...(isOperator ? [{ key: "branding" as const, label: "Branding", icon: Palette }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-[#0B1F33]">Settings</h1>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#F7FAFC] rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-white text-[#4361EE] shadow-sm"
                  : "text-[#6B7C8F] hover:text-[#0B1F33]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#4361EE]" />
              Profile Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm bg-[#F7FAFC] text-[#6B7C8F]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none"
                />
              </div>
              {isOperator && (
                <div>
                  <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none"
                  />
                </div>
              )}
            </div>
            {isOperator && (
              <div className="mt-4">
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none resize-none"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#4361EE]" />
              Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Province</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none"
                >
                  {CANADIAN_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6B7C8F] mb-1 block">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                  maxLength={7}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE] focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Map Preview  */}
            {isOperator && address && city && (
              <div className="mt-4">
                <label className="text-sm font-medium text-[#6B7C8F] mb-2 block">
                  Service Radius: {serviceRadius} km
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                  className="w-full accent-[#4361EE] mb-3"
                />
                <div className="rounded-xl overflow-hidden border border-[#E6EEF6]">
                  <ServiceRadiusMap
                    address={address}
                    city={city}
                    province={province}
                    postalCode={postalCode}
                    radiusKm={serviceRadius}
                  />
                </div>
              </div>
            )}

            {/* Client location map */}
            {!isOperator && address && city && (
              <div className="mt-4">
                <label className="text-sm font-medium text-[#6B7C8F] mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#4361EE]" />
                  Your Location on Map
                </label>
                <div className="rounded-xl overflow-hidden border border-[#E6EEF6]">
                  <iframe
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&q=${encodeURIComponent(`${address}, ${city}, ${province} ${postalCode}, Canada`)}&zoom=15`}
                  />
                </div>
                <p className="text-xs text-[#6B7C8F] mt-2">
                  📍 {address}, {city}, {province} {postalCode}
                </p>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#4361EE] text-white rounded-xl font-semibold text-sm hover:bg-[#1a6dd4] transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-[#EB5757] rounded-xl font-semibold text-sm hover:bg-red-100 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          <div className="text-center py-2">
            <p className="text-xs text-[#6B7C8F]">snowd.ca v0.1.0</p>
          </div>
        </div>
      )}

      {/* Appearance Settings */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
              <Sun className="w-5 h-5 text-[#4361EE]" />
              Theme
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "light" as const, label: "Light", icon: Sun, desc: "Bright & clean" },
                { key: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on eyes" },
                { key: "system" as const, label: "System", icon: Monitor, desc: "Match device" },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleThemeChange(opt.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      active
                        ? "border-[#4361EE] bg-[#E8EDFD]"
                        : "border-[#E6EEF6] hover:border-[#4361EE]/30"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${active ? "text-[#4361EE]" : "text-[#6B7C8F]"}`} />
                    <span className={`text-sm font-semibold ${active ? "text-[#4361EE]" : "text-[#0B1F33]"}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-[#6B7C8F]">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Payment Settings */}
      {activeTab === "payment" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#4361EE]" />
              Payment Methods
            </h3>

            {/* Stripe payment methods */}
            {(profile as UserProfile & { stripePaymentMethods?: { brand: string; last4: string; expMonth: number; expYear: number }[] })?.stripePaymentMethods?.length ? (
              <div className="space-y-3 mb-4">
                {(profile as UserProfile & { stripePaymentMethods: { brand: string; last4: string; expMonth: number; expYear: number }[] }).stripePaymentMethods.map((pm, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[#4361EE]" />
                      <div>
                        <p className="text-sm font-medium text-[#0B1F33] capitalize">{pm.brand} **** {pm.last4}</p>
                        <p className="text-xs text-[#6B7C8F]">Expires {pm.expMonth}/{pm.expYear}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#6B7C8F]">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payment methods saved</p>
                <p className="text-xs mt-1">Your card will be saved when you make your first payment</p>
              </div>
            )}

            <div className="border-t border-[#E6EEF6] mt-4 pt-4">
              <div className="flex items-center gap-2 text-xs text-[#6B7C8F]">
                <Shield className="w-4 h-4" />
                <span>Payments are securely processed by Stripe. snowd.ca never stores your card data.</span>
              </div>
            </div>
          </div>

          {/* Operator: Banking Info */}
          {isOperator && (
            <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
              <h3 className="text-lg font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#4361EE]" />
                Payout Information
              </h3>

              {stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Stripe Connected</p>
                      <p className="text-sm text-green-600">Your account is set up to receive payouts</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E6EEF6] text-[#0B1F33] rounded-xl font-medium text-sm hover:bg-[#F7FAFC] transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage Stripe Dashboard
                  </button>
                </div>
              ) : stripeStatus?.detailsSubmitted ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl">
                    <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-yellow-800">Verification Pending</p>
                      <p className="text-sm text-yellow-600">Stripe is reviewing your account details</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E6EEF6] text-[#0B1F33] rounded-xl font-medium text-sm hover:bg-[#F7FAFC] transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Check Status
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-[#6B7C8F]">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Connect your bank account</p>
                  <p className="text-xs mt-1 mb-4">Receive payouts directly to your Canadian bank account</p>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="btn-primary px-6 py-2.5 bg-[#4361EE] text-white rounded-xl text-sm font-semibold hover:bg-[#1a6dd4] transition disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {stripeConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Connect with Stripe
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#4361EE]" />
              Notification Preferences
            </h3>
            <div className="space-y-4">
              {[
                { label: "Job Updates", desc: "When someone accepts or updates a job" },
                { label: "Messages", desc: "New chat messages from operators/clients" },
                { label: "Payment Alerts", desc: "Payment confirmations and receipts" },
                { label: "Promotions", desc: "New features and seasonal offers" },
              ].map((notification, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[#E6EEF6] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#0B1F33]">{notification.label}</p>
                    <p className="text-xs text-[#6B7C8F] mt-0.5">{notification.desc}</p>
                  </div>
                  <label className="relative inline-block w-11 h-6 cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[#E6EEF6] peer-checked:bg-[#4361EE] rounded-full transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verification */}
      {activeTab === "verification" && (
        <div className="space-y-6">
          {/* ID Photo Upload */}
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-1 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#4361EE]" />
              Government ID Photo
            </h3>
            <p className="text-xs text-[#6B7C8F] mb-4">
              Upload a clear photo of your government-issued ID (driver&apos;s license, passport, etc.)
              to get verified and build trust with other users.
            </p>

            {/* Current status */}
            <div className="flex items-center gap-2 mb-4">
              {profile?.idVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : idPhotoUrl ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  <Loader2 className="w-3.5 h-3.5" /> Pending Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6EEF6] text-[#6B7C8F] text-xs font-medium">
                  <Shield className="w-3.5 h-3.5" /> Not Submitted
                </span>
              )}
            </div>

            {/* Preview */}
            {idPhotoUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-[#E6EEF6] max-w-xs">
                <img src={idPhotoUrl} alt="ID Photo" className="w-full h-auto object-cover" />
              </div>
            )}

            {/* Upload button */}
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4361EE] text-white rounded-xl text-sm font-semibold hover:bg-[#1a6dd4] transition cursor-pointer">
              {uploadingId ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> {idPhotoUrl ? "Replace Photo" : "Upload ID Photo"}
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIdUpload}
                disabled={uploadingId}
              />
            </label>
          </div>

          {/* Student Transcript - operators only */}
          {isOperator && (
            <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
              <h3 className="text-lg font-semibold text-[#0B1F33] mb-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#4361EE]" />
                Student Transcript / Report Card
              </h3>
              <p className="text-xs text-[#6B7C8F] mb-4">
                Upload your student transcript or most recent report card to verify student status.
                This helps clients identify student operators and may qualify you for student promotions.
              </p>

              {/* Current status */}
              <div className="flex items-center gap-2 mb-4">
                {studentTranscriptUrl ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6EEF6] text-[#6B7C8F] text-xs font-medium">
                    <GraduationCap className="w-3.5 h-3.5" /> Not Submitted
                  </span>
                )}
              </div>

              {/* Preview for images, link for PDFs */}
              {studentTranscriptUrl && (
                <div className="mb-4">
                  {studentTranscriptUrl.includes(".pdf") || studentTranscriptUrl.includes("application%2Fpdf") ? (
                    <a
                      href={studentTranscriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#4361EE] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" /> View uploaded transcript
                    </a>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-[#E6EEF6] max-w-xs">
                      <img src={studentTranscriptUrl} alt="Transcript" className="w-full h-auto object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Upload button */}
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4361EE] text-white rounded-xl text-sm font-semibold hover:bg-[#1a6dd4] transition cursor-pointer">
                {uploadingTranscript ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> {studentTranscriptUrl ? "Replace File" : "Upload Transcript"}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleTranscriptUpload}
                  disabled={uploadingTranscript}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Branding Tab — Operators only */}
      {activeTab === "branding" && isOperator && (
        <div className="space-y-6">
          {/* Business Identity */}
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#4361EE]" />
              Business Identity
            </h3>

            {/* Logo */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-[#E6EEF6] flex items-center justify-center overflow-hidden bg-[#F7FAFC]">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <Camera className="w-6 h-6 text-[#6B7C8F]" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#0B1F33]">Business Logo</p>
                <p className="text-xs text-[#6B7C8F] mb-2">Displayed on your profile and invoices</p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#4361EE]/10 text-[#4361EE] rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#4361EE]/20 transition">
                  {uploadingLogo ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-3 h-3" /> {logoUrl ? "Change Logo" : "Upload Logo"}</>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1">Business Tagline</label>
                <input
                  type="text"
                  value={brandingTagline}
                  onChange={(e) => setBrandingTagline(e.target.value)}
                  placeholder="e.g. Fast & Reliable Snow Removal"
                  maxLength={80}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#4361EE]/30 focus:border-[#4361EE] outline-none text-sm"
                />
                <p className="text-xs text-[#6B7C8F] mt-1">{brandingTagline.length}/80 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1">About Your Business</label>
                <textarea
                  value={brandingDescription}
                  onChange={(e) => setBrandingDescription(e.target.value)}
                  placeholder="Tell clients about your experience, services, and what makes you stand out..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#4361EE]/30 focus:border-[#4361EE] outline-none text-sm resize-none"
                />
                <p className="text-xs text-[#6B7C8F] mt-1">{brandingDescription.length}/500 characters</p>
              </div>

              <button
                onClick={saveBranding}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#4361EE] text-white rounded-xl text-sm font-semibold hover:bg-[#1a6dd4] transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Work Portfolio */}
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-lg font-semibold text-[#0B1F33] mb-1 flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-[#4361EE]" />
              Work Portfolio
            </h3>
            <p className="text-xs text-[#6B7C8F] mb-4">
              Showcase your best work to attract more clients. Upload before/after photos,
              completed jobs, and your equipment.
            </p>

            {/* Photo Grid */}
            {portfolioPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {portfolioPhotos.map((url, index) => (
                  <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-[#E6EEF6]">
                    <img src={url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePortfolioPhoto(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                      <span className="text-white text-xs font-medium">Photo {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {portfolioPhotos.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-[#E6EEF6] rounded-xl mb-4">
                <ImagePlus className="w-8 h-8 mx-auto text-[#6B7C8F] opacity-50 mb-2" />
                <p className="text-sm text-[#6B7C8F]">No portfolio photos yet</p>
                <p className="text-xs text-[#6B7C8F] mt-1">Upload photos to showcase your work</p>
              </div>
            )}

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4361EE] text-white rounded-xl text-sm font-semibold hover:bg-[#1a6dd4] transition cursor-pointer disabled:opacity-50">
              {uploadingPortfolio ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> Add Photos</>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePortfolioUpload}
                disabled={uploadingPortfolio}
              />
            </label>
            <p className="text-xs text-[#6B7C8F] mt-2">You can upload multiple photos at once. Max 12 photos recommended.</p>
          </div>
        </div>
      )}
    </div>
  );
}
