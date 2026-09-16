"use client";

import { isOperatorPublic } from "@/lib/operatorDiscovery";
import Link from "next/link";
import Image from "next/image";
import DeleteConfirmPopup from "@/components/DeleteConfirmPopup";
import Notification from "@/components/Notification";
import PageHeader from "@/components/ui/PageHeader";

import StripeOnboarding from "@/components/StripeOnboarding";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";

import ServiceRadiusMap from "@/components/ServiceRadiusMap";
import ServiceAreaCityPicker from "@/components/ServiceAreaCityPicker";
import { useAuth } from "@/context/AuthContext";
import { sendAdminNotif } from "@/lib/adminNotifications";
import { db,storage } from "@/lib/firebase";
import { buildGoogleMapsEmbedUrl } from "@/lib/googleMaps";
import {
CANADIAN_PROVINCES,
ClientProfile,
OperatorProfile,
OperatorServiceArea,
UserProfile,
} from "@/lib/types";
import { doc,updateDoc } from "firebase/firestore";
import { getDownloadURL,ref,uploadBytes } from "firebase/storage";
import {
AlertCircle,
Bell,
Briefcase,
Building2,
Camera,
CheckCircle,
ChevronRight,
CreditCard,
ExternalLink,
GraduationCap,
ImagePlus,
Loader2,
LogOut,
MapPin,
  Palette,
RefreshCw,
Save,
Shield,
ShieldCheck,
Trash2,
Upload,
User
} from "lucide-react";
import { useRouter,useSearchParams } from "next/navigation";
import React,{ useEffect,useState,useRef } from "react";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile, deleteAccount } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [feedback, setFeedback] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [savingEmailPreferences, setSavingEmailPreferences] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState({ account: true, workOrders: true });
  const [activeTab, setActiveTab] = useState<"general" | "payment" | "notifications" | "verification" | "branding">("general");
  const [onboardingAccountId, setOnboardingAccountId] = useState<string | null>(null);
  const [stripeCheckVersion, setStripeCheckVersion] = useState(0);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<{
    accountId?: string;
    fullyReady?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    accountDetails?: {
      businessName?: string | null;
      email?: string | null;
      country?: string | null;
      currency?: string | null;
      payoutBank?: { bankName?: string | null; last4?: string | null; currency?: string | null } | null;
    };
  } | null>(null);

  // Editable fields
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [province, setProvince] = useState(profile?.province || "");
  const [postalCode, setPostalCode] = useState(profile?.postalCode || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [age, setAge] = useState<number | undefined>((profile as ClientProfile)?.age);
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>((profile as ClientProfile)?.propertyDetails?.photos || []);
  const [uploadingPropertyPhotos, setUploadingPropertyPhotos] = useState(false);

  // Operator fields
  const operatorProfile = profile as OperatorProfile;
  const [bio, setBio] = useState(operatorProfile?.bio || "");
  const [businessName, setBusinessName] = useState(operatorProfile?.businessName || "");
  const [serviceRadius, setServiceRadius] = useState(operatorProfile?.serviceRadius || 10);
  const [serviceAreas, setServiceAreas] = useState<OperatorServiceArea[]>(operatorProfile?.serviceAreas || []);
  const [pricing, setPricing] = useState(() => ({
    small: operatorProfile?.pricing?.driveway?.small || 25,
    medium: operatorProfile?.pricing?.driveway?.medium || 40,
    large: operatorProfile?.pricing?.driveway?.large || 60,
    walkway: operatorProfile?.pricing?.walkway || 15,
    sidewalk: operatorProfile?.pricing?.sidewalk || 15,
  }));

  const isOperator = profile?.role === "operator";
  const savedPropertyPhotosKey = JSON.stringify(profile?.role === "client" ? (profile as ClientProfile).propertyDetails?.photos || [] : []);
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    if (!profile) return;
    setEmailPreferences({
      account: profile.emailNotifications?.account !== false,
      workOrders: profile.emailNotifications?.workOrders !== false,
    });
  }, [profile?.uid, profile?.emailNotifications?.account, profile?.emailNotifications?.workOrders]);

  useEffect(() => {
    if (profile?.role === "client") setPropertyPhotos(JSON.parse(savedPropertyPhotosKey) as string[]);
  }, [profile?.uid, profile?.role, savedPropertyPhotosKey]);

  const handlePropertyPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!profile?.uid || !files.length) return;
    if (propertyPhotos.length + files.length > 6) { setFeedback("You can add up to 6 property photos."); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) { setFeedback("Choose JPG, PNG or WebP images under 5 MB each."); return; }
    setUploadingPropertyPhotos(true);
    setFeedback("");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const storageRef = ref(storage, `property-photos/${profile.uid}/${crypto.randomUUID()}`);
        await uploadBytes(storageRef, file);
        uploaded.push(await getDownloadURL(storageRef));
      }
      const next = [...propertyPhotos, ...uploaded];
      await updateDoc(doc(db, "users", profile.uid), { "propertyDetails.photos": next });
      setPropertyPhotos(next);
      await refreshProfile();
      setFeedback("Property photos saved. Operators can view them before arrival.");
    } catch (error) {
      console.error("Property photo upload failed", error);
      setFeedback("Property photos could not be saved. Please try again.");
    } finally {
      setUploadingPropertyPhotos(false);
      event.target.value = "";
    }
  };

  const removePropertyPhoto = async (index: number) => {
    if (!profile?.uid || uploadingPropertyPhotos) return;
    const next = propertyPhotos.filter((_, photoIndex) => photoIndex !== index);
    setUploadingPropertyPhotos(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), { "propertyDetails.photos": next });
      setPropertyPhotos(next);
      await refreshProfile();
      setFeedback("Property photo removed.");
    } catch (error) {
      console.error("Property photo removal failed", error);
      setFeedback("The photo could not be removed. Please try again.");
    } finally {
      setUploadingPropertyPhotos(false);
    }
  };

  const updateEmailPreference = async (key: "account" | "workOrders", enabled: boolean) => {
    if (!profile?.uid || savingEmailPreferences) return;
    const previous = emailPreferences;
    const next = { ...emailPreferences, [key]: enabled };
    setEmailPreferences(next);
    setSavingEmailPreferences(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), { emailNotifications: next });
      await refreshProfile();
    } catch (error) {
      console.error("Email preference save failed", error);
      setEmailPreferences(previous);
      setFeedback("Could not save your email preference. Please try again.");
    } finally {
      setSavingEmailPreferences(false);
    }
  };

  const requiredGeneralFields: { key: string; label: string; value: string }[] = [
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
  const missingGeneralFields = requiredGeneralFields.filter((field) => !field.value.trim());
  const missingGeneralFieldSet = new Set(missingGeneralFields.map((field) => field.key));
  const completionPercent = Math.round(
    ((requiredGeneralFields.length - missingGeneralFields.length) / requiredGeneralFields.length) * 100
  );

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
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar || "");
  const brandingOwner = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || brandingOwner.current === profile.uid) return;
    brandingOwner.current = profile.uid;
    const op = profile as OperatorProfile;
    setLogoUrl(op.logoUrl || "");
    setAvatarUrl(op.avatar || "");
    setBrandingTagline(op.tagline || "");
    setBrandingDescription(op.brandDescription || "");
    setPortfolioPhotos(op.portfolioPhotos || []);
  }, [profile]);
  const brandingDirty = isOperator && (avatarUrl !== (profile?.avatar || "") || logoUrl !== (operatorProfile?.logoUrl || "") || brandingTagline !== (operatorProfile?.tagline || "") || brandingDescription !== (operatorProfile?.brandDescription || "") || JSON.stringify(portfolioPhotos) !== JSON.stringify(operatorProfile?.portfolioPhotos || []));
  const brandingBusy = uploadingLogo || uploadingPortfolio;
  useEffect(() => {
    if (!brandingDirty && !brandingBusy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      const target = (event.target as Element).closest("a[href], button");
      const leaving = target?.matches("a[href]") || /sign out/i.test(target?.textContent || "");
      if (leaving && !window.confirm("Your business profile has unsaved changes. Leave without saving?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leave, true); };
  }, [brandingDirty, brandingBusy]);

  const verificationStatus = (profile as UserProfile & { verificationStatus?: string })?.verificationStatus;
  const verificationNote = (profile as UserProfile & { verificationNote?: string })?.verificationNote;

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;
    setUploadingId(true);
    try {
      const storageRef = ref(storage, `verification/${profile.uid}/id-photo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", profile.uid), {
        idPhotoUrl: url,
        idVerified: false,
        accountApproved: false,
        verificationStatus: "pending",
        verificationNote: "",
      });
      setIdPhotoUrl(url);
      await refreshProfile();
      sendAdminNotif({
        type: "document_uploaded",
        message: `ID document uploaded by ${profile.displayName || profile.email}`,
        uid: profile.uid,
        meta: { name: profile.displayName || "", email: profile.email || "" },
      });
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
      sendAdminNotif({
        type: "document_uploaded",
        message: `Student transcript uploaded by ${profile.displayName || profile.email}`,
        uid: profile.uid,
        meta: { name: profile.displayName || "", email: profile.email || "" },
      });
    } catch (err) {
      console.error("Transcript upload error:", err);
    } finally {
      setUploadingTranscript(false);
    }
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "avatar" = "logo") => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setFeedback("Choose a JPG, PNG or WebP image under 5 MB."); return; }
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `branding/${profile.uid}/${kind}/${crypto.randomUUID()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      if (kind === "avatar") setAvatarUrl(url); else setLogoUrl(url);
      setSaved(false);
    } catch (err) {
      console.error("Logo upload error:", err);
      setFeedback("Logo upload failed. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Portfolio photo upload
  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile?.uid) return;
    if (portfolioPhotos.length + files.length > 12) { setFeedback("You can add up to 12 portfolio photos."); return; }
    if (Array.from(files).some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) { setFeedback("Choose JPG, PNG or WebP images under 5 MB each."); return; }
    setUploadingPortfolio(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `branding/${profile.uid}/portfolio/${crypto.randomUUID()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      }
      const updated = [...portfolioPhotos, ...newUrls];
      setPortfolioPhotos(updated);
      setSaved(false);
    } catch (err) {
      console.error("Portfolio upload error:", err);
      setFeedback("Portfolio upload failed. Please try again.");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  // Remove portfolio photo
  const removePortfolioPhoto = async (index: number) => {
    if (!profile?.uid) return;
    const updated = portfolioPhotos.filter((_, i) => i !== index);
    setPortfolioPhotos(updated);
    setSaved(false);
  };

  // Save branding info
  const saveBranding = async () => {
    if (!profile?.uid || brandingBusy || saving) return;
    setSaved(false);
    setSaving(true);
    const startedAt = Date.now();
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        tagline: brandingTagline,
        brandDescription: brandingDescription,
        logoUrl,
        avatar: avatarUrl,
        portfolioPhotos,
      });
      await refreshProfile();
      const remaining = 2000 - (Date.now() - startedAt);
      if (remaining > 0) {
        await wait(remaining);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Branding save error:", err);
      setFeedback("Could not save your business profile. Your changes are still here; please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Stripe return from onboarding
  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "success" || stripeParam === "refresh") {
      setActiveTab("payment");
      setStripeCheckVersion((value) => value + 1);
      router.replace("/dashboard/settings?tab=payment");
    }

    // Handle tab query param (e.g. from transactions page)
    const tabParam = searchParams.get("tab");
    if (tabParam && ["general", "payment", "notifications", "verification", "branding"].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
  }, [searchParams, profile?.uid, router, refreshProfile]);

  // Check Stripe Connect account status
  useEffect(() => {
    const checkStripeStatus = async () => {
      const accountId = (profile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId;
      if (!accountId || !isOperator) return;

      try {
        const res = await stripeConnectFetch("/api/stripe/account-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to check Stripe account status");
        }
        if (data?.configured === false) {
          setStripeConfigError(data?.error || "Stripe is not configured on this environment");
          return;
        }
        if (!data.error) {
          setStripeConfigError(null);
          setStripeStatus(data);
          if (profile?.stripeAccountStatus !== data.stripeAccountStatus) await refreshProfile();
        }
      } catch (e) {
        console.error("Stripe status check error:", e);
      }
    };
    checkStripeStatus();
  }, [profile, isOperator, stripeCheckVersion, refreshProfile]);

  const handleStripeConnect = async () => {
    if (!profile?.uid || !user?.email) return;
    setStripeConnecting(true);

    try {
      const startNewStripeOnboarding = async () => {
        const createRes = await stripeConnectFetch("/api/stripe/create-connect-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            operatorId: profile.uid,
            businessName: (profile as OperatorProfile).businessName || profile.displayName,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          if (createData?.code === "connect_not_enabled") {
            setStripeConfigError(createData.error);
            return;
          }
          throw new Error(createData?.error || "Failed to create Stripe account");
        }
        if (createData?.configured === false) {
          setStripeConfigError(createData?.error || "Stripe is not configured on this environment");
          return;
        }
        if (createData.error) throw new Error(createData.error);
        setStripeConfigError(null);

        await refreshProfile();

        setOnboardingAccountId(createData.accountId);
      };

      const existingAccountId = (profile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId;

      if (existingAccountId) {
        setOnboardingAccountId(existingAccountId);
      } else {
        await startNewStripeOnboarding();
      }
    } catch (error) {
      console.error("Stripe connect error:", error);
      const message = error instanceof Error ? error.message : "Failed to start Stripe setup. Please try again.";
      setFeedback(message);
    } finally {
      setStripeConnecting(false);
    }
  };

  // Initialize once per account; live profile updates must not overwrite edits.
  const generalOwner = useRef<string | null>(null);
  useEffect(() => {
    if (profile && generalOwner.current !== profile.uid) {
      generalOwner.current = profile.uid;
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
        setServiceAreas(op.serviceAreas || []);
        setPricing({
          small: op.pricing?.driveway?.small || 25,
          medium: op.pricing?.driveway?.medium || 40,
          large: op.pricing?.driveway?.large || 60,
          walkway: op.pricing?.walkway || 15,
          sidewalk: op.pricing?.sidewalk || 15,
        });
      } else {
        setAge((profile as ClientProfile)?.age);
      }
    }
  }, [profile, isOperator, stripeCheckVersion, refreshProfile]);

  const handleSave = async () => {
    setSaveError("");
    if (!profile?.uid || brandingBusy || saving) return;
    if (isOperator && Object.values(pricing).some(value => !Number.isFinite(value) || value < 0.01 || value > 10000)) {
      setSaveError("Enter each service price from $0.01 to $10,000 CAD.");
      return;
    }
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
      if (isOperator) {
        updates.bio = bio;
        updates.businessName = businessName;
        updates.serviceRadius = serviceRadius;
        updates.serviceAreas = serviceAreas;
        updates.pricing = {
          driveway: { small: pricing.small, medium: pricing.medium, large: pricing.large },
          walkway: pricing.walkway,
          sidewalk: pricing.sidewalk,
        };
        updates.logoUrl = logoUrl;
        updates.avatar = avatarUrl;
        updates.tagline = brandingTagline;
        updates.brandDescription = brandingDescription;
        updates.portfolioPhotos = portfolioPhotos;
      } else {
        updates.age = age || null;
        updates.simplifiedMode = !!(age && age >= 55);
      }
      await updateDoc(doc(db, "users", profile.uid), updates);
      await refreshProfile();
      const remaining = 2000 - (Date.now() - startedAt);
      if (remaining > 0) {
        await wait(remaining);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Notify admin of profile/location update
      sendAdminNotif({
        type: "profile_saved",
        message: `Profile updated by ${displayName || profile.email}${city ? ` (${city}, ${province})` : ""}`,
        uid: profile.uid,
        meta: {
          name: displayName || "",
          email: profile.email || "",
          city: city || "",
          province: province || "",
        },
      });
    } catch (error) {
      console.error("Save error:", error);
      setSaveError("Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      router.push("/login");
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      router.push("/login");
    } catch (error) {
      console.error("Delete account error:", error);
      if ((error as { code?: string }).code === "auth/requires-recent-login") {
        setFeedback("For security, please sign out and sign back in before deleting your account.");
      } else {
        setFeedback("Failed to delete account. Please try again.");
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const TABS = [
    { key: "general" as const, label: "Account", icon: User },
    { key: "payment" as const, label: "Payment", icon: CreditCard },
    { key: "verification" as const, label: "Verification", icon: ShieldCheck },
    { key: "notifications" as const, label: "Notifications", icon: Bell },
    ...(isOperator ? [{ key: "branding" as const, label: "Branding", icon: Palette }] : []),
  ];

  const TAB_DESCRIPTIONS: Record<string, string> = {
    general: "Contact details and service location",
    payment: isOperator ? "Connect and manage your Stripe payout account" : "Review cards and secure payment details",
    verification: "Upload and manage your verification documents",
    notifications: "Where to find your updates and receipts",
    branding: "Configure business identity and portfolio",
  };

  const activeTabMeta = TABS.find((tab) => tab.key === activeTab);

  return (
    <div className={`${styles.settings} max-w-[1040px] mx-auto space-y-5`}>
      <PageHeader title="Settings" description="Payments, verification, and account preferences." action={<Link className="btn-secondary min-h-11" href="/dashboard/profile">Edit profile</Link>} />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.navLabel}>Settings</p>
          <label className={styles.mobileSelectLabel} htmlFor="settings-section">Settings section</label>
          <select id="settings-section" className={styles.mobileSelect} value={activeTab} onChange={event => setActiveTab(event.target.value as typeof activeTab)}>{TABS.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}</select>
          <nav aria-label="Settings sections" className={styles.navigation}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return <button key={tab.key} type="button" aria-current={activeTab === tab.key ? "page" : undefined}
                onClick={() => setActiveTab(tab.key)} className={styles.navButton}>
                <Icon size={19} aria-hidden="true" /><span>{tab.label}</span><ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
              </button>;
            })}
          </nav>
        </aside>
        <section className={styles.content} aria-labelledby="settings-section-title">
          <div className="space-y-6">
            <div className={styles.sectionHeading}>
              <div><h2 id="settings-section-title">{activeTabMeta?.label || "Settings"}</h2><p>{TAB_DESCRIPTIONS[activeTab]}</p></div>
              {saved && <span role="status" className={styles.saved}><CheckCircle size={16} /> Saved</span>}
            </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {missingGeneralFields.length > 0 && <div className={`rounded-2xl border p-4 ${
            missingGeneralFields.length === 0
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold ${
                  missingGeneralFields.length === 0 ? "text-green-800" : "text-amber-800"
                }`}>
                  Profile completion: {completionPercent}%
                </p>
                {missingGeneralFields.length === 0 ? (
                  <p className="text-xs text-green-700 mt-1">Everything needed is complete.</p>
                ) : (
                  <p className="text-xs text-amber-700 mt-1">
                    Complete these fields: {missingGeneralFields.map((field) => field.label).join(", ")}
                  </p>
                )}
              </div>
              {missingGeneralFields.length === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
            </div>
          </div>}

          <p className="text-sm text-[var(--text-secondary)]">Choose what you want to update, then save your changes.</p>
          {/* Profile Info */}
          <section className={styles.card}>
            <h3 className="min-h-11 text-lg font-semibold text-[var(--ink)] flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--accent)]" />
              Your contact details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-display-name">Display Name</label>
                <input
                  type="text"
                  id="settings-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none ${
                    missingGeneralFieldSet.has("displayName") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                  }`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 border-[3px] border-[var(--border)] rounded-xl text-sm bg-[var(--bg-primary)] text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-phone">Phone</label>
                <input
                  type="tel"
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none ${
                    missingGeneralFieldSet.has("phone") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                  }`}
                />
              </div>
              {!isOperator && (
                <div>
                  <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-age">Age</label>
                  <input
                    type="number"
                    min={13}
                    max={120}
                    id="settings-age"
                  value={age ?? ""}
                    onChange={(e) => {
                      const next = parseInt(e.target.value, 10);
                      setAge(Number.isNaN(next) ? undefined : next);
                    }}
                    className="w-full px-4 py-2.5 border-[3px] border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">55+ enables the simplified dashboard experience.</p>
                </div>
              )}
              {isOperator && (
                <div>
                  <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-business-name">Business Name</label>
                  <input
                    type="text"
                    id="settings-business-name"
                  value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none ${
                      missingGeneralFieldSet.has("businessName") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                    }`}
                  />
                </div>
              )}
            </div>
            {isOperator && (
              <div className="mt-4">
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-bio">Bio</label>
                <textarea
                  id="settings-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none resize-none ${
                    missingGeneralFieldSet.has("bio") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                  }`}
                />
              </div>
            )}
          </section>

          {isOperator && (
            <section className={styles.card}>
              <h3 className="mb-1 min-h-11 text-lg font-semibold text-[var(--ink)]">Your services & prices</h3>
              <p className="mb-4 text-sm text-[var(--text-muted)]">Set the amount you receive for each area. New work orders use these rates; existing orders keep their agreed price.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  ["small", "Small driveway", "1-car driveway"],
                  ["medium", "Medium driveway", "2-car driveway"],
                  ["large", "Large driveway", "3+ cars or double-wide"],
                  ["walkway", "Walkway", "Paths and front steps"],
                  ["sidewalk", "Sidewalk", "Public sidewalk frontage"],
                ] as const).map(([key, label, description]) => (
                  <label key={key} className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--sky)] p-4">
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-xs text-[var(--text-muted)]">{description}</span>
                    </span>
                    <span className="relative w-28 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" aria-hidden="true">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label={`${label} price in CAD`}
                        min="0.01"
                        max="10000"
                        step="0.01"
                        value={pricing[key]}
                        onChange={event => setPricing(current => ({ ...current, [key]: Number(event.target.value) }))}
                        className="w-full border py-2 pl-7 pr-2 text-right font-semibold"
                      />
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">When a customer selects more than one area, the applicable rates are added together.</p>
            </section>
          )}

          {/* Location */}
          <section className={styles.card}>
            <h3 className="min-h-11 text-lg font-semibold text-[var(--ink)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--accent)]" />
              Your location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-street-address">Street Address</label>
                <input
                  type="text"
                  id="settings-street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none ${
                    missingGeneralFieldSet.has("address") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                  }`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-city">City</label>
                <input
                  type="text"
                  id="settings-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none ${
                    missingGeneralFieldSet.has("city") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                  }`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-province">Province</label>
                <select
                  id="settings-province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm bg-white focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none ${
                    missingGeneralFieldSet.has("province") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                  }`}
                >
                  {CANADIAN_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-1 block" htmlFor="settings-postal-code">Postal Code</label>
                <input
                  type="text"
                  id="settings-postal-code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                  maxLength={7}
                  className={`w-full px-4 py-2.5 border-[3px] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none ${
                    missingGeneralFieldSet.has("postalCode") ? "border-amber-300 bg-amber-50" : "border-[var(--border)]"
                  }`}
                />
              </div>
            </div>

            {/* Map Preview  */}
            {isOperator && (
              <div className="mt-4">
                <label htmlFor="service-radius" className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                  Service Radius: {serviceRadius} km
                </label>
                <input
                  type="range"
                  id="service-radius"
                  aria-valuetext={`${serviceRadius} kilometres`}
                  min={1}
                  max={50}
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                  className="w-full h-12 touch-pan-y accent-[var(--accent)] mb-3"
                />
                <div className="mb-4 flex items-center gap-3">
                  <button type="button" aria-label="Decrease service radius" disabled={serviceRadius <= 1} onClick={() => setServiceRadius(value => Math.max(1, value - 1))} className="min-h-12 min-w-12 rounded-xl border disabled:opacity-40">−</button>
                  <span className="flex-1 text-center" aria-live="polite">{serviceRadius} km</span>
                  <button type="button" aria-label="Increase service radius" disabled={serviceRadius >= 50} onClick={() => setServiceRadius(value => Math.min(50, value + 1))} className="min-h-12 min-w-12 rounded-xl border disabled:opacity-40">+</button>
                </div>
                <p className="mb-3 text-sm text-[var(--text-muted)]">Choose 1–50 km, then tap Save Changes below.</p>
                <div className="mb-5 rounded-2xl border border-[var(--border-color)] bg-[var(--sky)] p-4">
                  <h4 className="font-semibold">Serve complete cities</h4>
                  <p className="mb-3 mt-1 text-sm text-[var(--text-muted)]">Add every city where you accept work. Customers anywhere inside a selected city can find you, even outside your home radius.</p>
                  <ServiceAreaCityPicker value={serviceAreas} onChange={setServiceAreas} />
                </div>
                {address && city ? <div>
                <h4 className="mb-2 font-semibold">Coverage map</h4>
                <div className="rounded-xl overflow-hidden border-[3px] border-[var(--border)]" aria-label="Operator coverage map">
                  <ServiceRadiusMap
                    address={address}
                    city={city}
                    province={province}
                    postalCode={postalCode}
                    radiusKm={serviceRadius}
                    serviceAreas={serviceAreas}
                  />
                </div></div> : <p className="text-sm text-[var(--text-muted)]">Add your street address and city to preview coverage.</p>}
              </div>
            )}

            {/* Client location map */}
            {!isOperator && address && city && (
              <div className="mt-4">
                <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--accent)]" />
                  Your Location on Map
                </label>
                <div className="rounded-xl overflow-hidden border-[3px] border-[var(--border)]">
                  <iframe
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={buildGoogleMapsEmbedUrl(`${address}, ${city}, ${province} ${postalCode}, Canada`, 15)}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  📍 {address}, {city}, {province} {postalCode}
                </p>
              </div>
            )}

            {!isOperator && (
              <section className="mt-5 border-t border-[var(--border-color)] pt-5" aria-labelledby="property-photos-heading">
                <h4 id="property-photos-heading" className="font-semibold">Expected clearing photos</h4>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Add driveway or clearing-area photos so the operator knows what to expect before arriving.</p>
                {propertyPhotos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{propertyPhotos.map((url, index) => <figure key={url} className="overflow-hidden rounded-xl border bg-white"><Image src={url} alt={`Property clearing area ${index + 1}`} width={480} height={320} unoptimized className="aspect-[3/2] w-full object-cover" /><button type="button" disabled={uploadingPropertyPhotos} onClick={() => removePropertyPhoto(index)} className="min-h-11 w-full text-sm font-semibold text-red-700 disabled:opacity-50">Remove photo</button></figure>)}</div>}
                {propertyPhotos.length < 6 && <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--ink)] px-4 py-2 text-sm font-semibold">
                  <ImagePlus className="h-4 w-4" /> {uploadingPropertyPhotos ? "Uploading…" : "Add property photos"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingPropertyPhotos} onChange={handlePropertyPhotoUpload} className="sr-only" />
                </label>}
              </section>
            )}
          </section>

          {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`mobile-save-action btn-primary w-full flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 ${
              saved ? "bg-green-600 hover:bg-green-700" : "bg-[var(--accent)] hover:bg-[var(--accent-dark)]"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving changes..." : saved ? "Saved" : "Save Changes"}
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className={styles.signOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          {/* Delete Account */}
          <section className="border-t border-red-100 pt-5">
            <h3 className="min-h-11 text-sm font-semibold">Account removal</h3>
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 mb-3">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Start over with a new account</h3>
                  <p className="text-xs text-red-700 mt-1 leading-5">
                    This removes your profile and sign-in permanently. Shared job, payment, and support records may be retained for service and legal purposes.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              disabled={deletingAccount}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deletingAccount ? "Deleting account..." : "Delete account and start over"}
            </button>
            <p className="text-center text-xs text-[var(--text-muted)] mt-2">This cannot be undone.</p>
          </section>

          <div className="text-center py-2">
            <p className="text-xs text-[var(--text-muted)]">snowd.ca v0.1.0</p>
          </div>
        </div>
      )}

      {/* Payment Settings */}
      {activeTab === "payment" && (
        <div className="space-y-6">
          {!isOperator && <div className={styles.card}>
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[var(--accent)]" />
              Payment Methods
            </h3>

            {/* Stripe payment methods */}
            {(profile as UserProfile & { stripePaymentMethods?: { brand: string; last4: string; expMonth: number; expYear: number }[] })?.stripePaymentMethods?.length ? (
              <div className="space-y-3 mb-4">
                {(profile as UserProfile & { stripePaymentMethods: { brand: string; last4: string; expMonth: number; expYear: number }[] }).stripePaymentMethods.map((pm, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[var(--accent)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--ink)] capitalize">{pm.brand} **** {pm.last4}</p>
                        <p className="text-xs text-[var(--text-muted)]">Expires {pm.expMonth}/{pm.expYear}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payment methods saved</p>
                <p className="text-xs mt-1">Enter your card securely when you authorize a booking</p>
              </div>
            )}

            <div className="border-t border-[var(--border)] mt-4 pt-4">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Shield className="w-4 h-4" />
                <span>Payments are securely processed by Stripe. snowd.ca never stores your card data.</span>
              </div>
            </div>
          </div>}

          {/* Operator: Banking Info */}
          {isOperator && (
            <div className={styles.card}>
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--accent)]" />
                Stripe Connect
              </h3>

              <p className="mb-4 text-sm text-[var(--text-secondary)]">Connect your verified Stripe account to receive card payments and payouts directly to your Canadian bank account.</p>
              {onboardingAccountId && <StripeOnboarding key={onboardingAccountId} accountId={onboardingAccountId} onExit={() => { setOnboardingAccountId(null); setStripeCheckVersion((value) => value + 1); }} />}
              {stripeConfigError && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-sm">{stripeConfigError}</p>
                </div>
              )}

              {stripeStatus?.fullyReady ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-100">
                        <ShieldCheck className="h-6 w-6 text-green-700" />
                      </span>
                      <div>
                        <p className="font-bold text-green-900">Verified Stripe connection</p>
                        <p className="text-sm text-green-700">Card payments and bank payouts are enabled.</p>
                      </div>
                    </div>
                    <dl className="mt-5 grid gap-4 border-t border-green-200 pt-4 sm:grid-cols-2">
                      {stripeStatus.accountDetails?.businessName ? <div><dt className="text-xs font-semibold text-green-700">Business</dt><dd className="mt-1 text-sm font-medium text-green-950">{stripeStatus.accountDetails.businessName}</dd></div> : null}
                      {stripeStatus.accountDetails?.email ? <div><dt className="text-xs font-semibold text-green-700">Stripe email</dt><dd className="mt-1 break-all text-sm font-medium text-green-950">{stripeStatus.accountDetails.email}</dd></div> : null}
                      <div><dt className="text-xs font-semibold text-green-700">Account</dt><dd className="mt-1 font-mono text-sm text-green-950">{stripeStatus.accountId}</dd></div>
                      <div><dt className="text-xs font-semibold text-green-700">Region and currency</dt><dd className="mt-1 text-sm font-medium text-green-950">{[stripeStatus.accountDetails?.country, stripeStatus.accountDetails?.currency].filter(Boolean).join(" · ") || "Canada · CAD"}</dd></div>
                      {stripeStatus.accountDetails?.payoutBank ? <div className="sm:col-span-2"><dt className="text-xs font-semibold text-green-700">Payout account</dt><dd className="mt-1 text-sm font-medium text-green-950">{stripeStatus.accountDetails.payoutBank.bankName || "Bank account"} ending in {stripeStatus.accountDetails.payoutBank.last4}</dd></div> : null}
                    </dl>
                  </div>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-[3px] border-[var(--border)] text-[var(--ink)] rounded-xl font-medium text-sm hover:bg-[var(--bg-primary)] transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage Stripe account
                  </button>
                </div>
              ) : stripeStatus?.detailsSubmitted ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl">
                    <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-yellow-800">Verification Pending</p>
                      <p className="text-sm text-yellow-600">Stripe is reviewing your account details. This can take a few minutes.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-[3px] border-[var(--border)] text-[var(--ink)] rounded-xl font-medium text-sm hover:bg-[var(--bg-primary)] transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Check Status
                  </button>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-yellow-200 text-yellow-700 bg-yellow-50 rounded-xl font-medium text-sm hover:bg-yellow-100 transition disabled:opacity-50"
                  >
                    {stripeConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Restart Setup
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-[var(--text-muted)]">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Connect your Stripe account</p>
                  <p className="text-xs mt-1 mb-4">Verify your information and add a Canadian payout account</p>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="btn-primary px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-dark)] transition disabled:opacity-50 flex items-center gap-2 mx-auto"
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

      {feedback && <Notification message={feedback} type="error" onClose={() => setFeedback("")} />}
      <DeleteConfirmPopup isOpen={deleteOpen} onCancel={() => { if (!deletingAccount) setDeleteOpen(false); }} onConfirm={handleDeleteAccount} loading={deletingAccount} title="Delete your account?" message="This permanently removes your sign-in and profile. Job, payment and conversation records may remain. You cannot undo this." confirmLabel="Delete account" />
            {/* Notification Settings */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className={styles.card}>
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[var(--accent)]" />
              Your notifications
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">Job, message and payment updates appear inside Snowd. Open the bell in the navigation to review updates and mark them as read.</p>
            <div className="mt-5 divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
              <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 p-4">
                <span><span className="block text-sm font-semibold">Work-order emails</span><span className="mt-1 block text-xs text-[var(--text-muted)]">New requests, approvals, scheduling, arrival, completion, cancellation, and payment updates.</span></span>
                <input type="checkbox" checked={emailPreferences.workOrders} disabled={savingEmailPreferences} onChange={(event) => void updateEmailPreference("workOrders", event.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
              </label>
              <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 p-4">
                <span><span className="block text-sm font-semibold">Account emails</span><span className="mt-1 block text-xs text-[var(--text-muted)]">Welcome messages and important updates about your SNOWD account.</span></span>
                <input type="checkbox" checked={emailPreferences.account} disabled={savingEmailPreferences} onChange={(event) => void updateEmailPreference("account", event.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link className="min-h-11 rounded-xl border p-3 font-semibold underline" href="/dashboard/jobs">Job updates</Link>
              <Link className="min-h-11 rounded-xl border p-3 font-semibold underline" href="/dashboard/messages">Messages</Link>
              <Link className="min-h-11 rounded-xl border p-3 font-semibold underline" href="/dashboard/transactions">Payments & receipts</Link>
            </div>
            <p className="mt-4 text-sm text-[var(--text-muted)]">Emails are sent to {profile?.email}. You can change these preferences at any time.</p>
          </div>
        </div>
      )}

      {/* Verification */}
      {activeTab === "verification" && (
        <div className="space-y-6">
          {/* Account Public Status — operators only */}
          {isOperator && (
            <div className={`rounded-2xl border p-5 ${
              isOperatorPublic(profile as OperatorProfile)
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-3">
                {isOperatorPublic(profile as OperatorProfile) ? (
                  <>
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900">Account is Public</h3>
                      <p className="text-sm text-green-700">
                        Your account is verified and visible to clients. You can receive jobs.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-900">Account Not Public Yet</h3>
                      <p className="text-sm text-amber-700">
                        {(profile as OperatorProfile)?.idVerified && (profile as OperatorProfile)?.isAvailable === false
                          ? "Your ID is verified. Turn on availability from Home to appear in nearby searches."
                          : verificationStatus === "rejected"
                          ? "Your previous submission was rejected. Review the feedback below and upload a new ID photo."
                          : !(profile as UserProfile & { idPhotoUrl?: string })?.idPhotoUrl
                          ? "Upload your government ID below to start the verification process."
                          : "Your ID is under review. Once approved, your account will go public."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ID Photo Upload */}
          <div className={styles.card}>
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-1 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[var(--accent)]" />
              Government ID Photo
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Upload a clear photo of your government-issued ID (driver&apos;s license, passport, etc.)
              {isOperator ? " — required for your account to go public." : " to get verified and build trust with other users."}
            </p>

            {/* Current status */}
            <div className="flex items-center gap-2 mb-4">
              {profile?.idVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : verificationStatus === "rejected" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Rejected
                </span>
              ) : idPhotoUrl ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  <Loader2 className="w-3.5 h-3.5" /> Pending Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--border)] text-[var(--text-muted)] text-xs font-medium">
                  <Shield className="w-3.5 h-3.5" /> Not Submitted
                </span>
              )}
            </div>

            {(profile as OperatorProfile)?.idVerified && (profile as OperatorProfile)?.isAvailable === false
                          ? "Your ID is verified. Turn on availability from Home to appear in nearby searches."
                          : verificationStatus === "rejected" && verificationNote && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-1">Admin feedback</p>
                <p className="text-sm text-red-700">{verificationNote}</p>
              </div>
            )}

            {/* Preview */}
            {idPhotoUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border-[3px] border-[var(--border)] max-w-xs">
                <img src={idPhotoUrl} alt="ID Photo" className="w-full h-auto object-cover" />
              </div>
            )}

            {/* Upload button */}
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-dark)] transition cursor-pointer">
              {uploadingId ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : verificationStatus === "rejected" ? (
                <>
                  <Upload className="w-4 h-4" /> Upload New ID Photo
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
            <div className={styles.card}>
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[var(--accent)]" />
                Student Transcript / Report Card
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--border)] text-[var(--text-muted)] text-xs font-medium">
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
                      className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" /> View uploaded transcript
                    </a>
                  ) : (
                    <div className="rounded-xl overflow-hidden border-[3px] border-[var(--border)] max-w-xs">
                      <img src={studentTranscriptUrl} alt="Transcript" className="w-full h-auto object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Upload button */}
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-dark)] transition cursor-pointer">
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
      {(activeTab === "general" || activeTab === "branding") && isOperator && (
        <fieldset disabled={saving || brandingBusy} className="space-y-6">
          {/* Business Identity */}
          <div className={styles.card}>
            <div className="mb-6">
              <h3 className="mb-2 text-lg font-semibold">Profile photo</h3>
              {avatarUrl && <img src={avatarUrl} alt="Your profile photo" className="mb-3 h-20 w-20 rounded-full object-cover" />}
              <label className="block text-sm font-medium">Upload profile photo
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => handleLogoUpload(event, "avatar")} className="mt-2 block w-full text-sm" />
              </label>
              <p className="mt-2 text-xs">JPG, PNG or WebP, up to 5 MB. Save to publish.</p>
            </div>
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[var(--accent)]" />
              Business Identity
            </h3>

            {/* Logo */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <Camera className="w-6 h-6 text-[var(--text-muted)]" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">Business Logo</p>
                <p className="text-xs text-[var(--text-muted)] mb-2">Shown on your public profile after you save. JPG, PNG or WebP, up to 5 MB.</p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg text-xs font-semibold cursor-pointer hover:bg-[var(--accent)]/20 transition">
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
                <label htmlFor="business-tagline" className="block text-sm font-medium text-[var(--ink)] mb-1">Business Tagline / Slogan</label>
                <input
                  id="business-tagline"
                  type="text"
                  value={brandingTagline}
                  onChange={(e) => setBrandingTagline(e.target.value)}
                  placeholder="e.g. Fast & Reliable Snow Removal"
                  maxLength={80}
                  className="w-full px-4 py-2.5 border-[3px] border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{brandingTagline.length}/80 characters</p>
              </div>

              <div>
                <label htmlFor="business-description" className="block text-sm font-medium text-[var(--ink)] mb-1">About Your Business</label>
                <textarea
                  id="business-description"
                  value={brandingDescription}
                  onChange={(e) => setBrandingDescription(e.target.value)}
                  placeholder="Tell clients about your experience, services, and what makes you stand out..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border-[3px] border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none text-sm resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{brandingDescription.length}/500 characters</p>
              </div>

              <button
                onClick={saveBranding}
                disabled={saving || brandingBusy}
                className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                  saved ? "bg-green-600 hover:bg-green-700" : "bg-[var(--accent)] hover:bg-[var(--accent-dark)]"
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving changes..." : saved ? "Saved" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Work Portfolio */}
          <div className={styles.card}>
            <h3 className="text-lg font-semibold text-[var(--ink)] mb-1 flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-[var(--accent)]" />
              Work Portfolio
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Showcase your best work to attract more clients. Upload before/after photos,
              completed jobs, and your equipment.
            </p>

            {/* Photo Grid */}
            {portfolioPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {portfolioPhotos.map((url, index) => (
                  <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border-[3px] border-[var(--border)]">
                    <img src={url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      aria-label={`Remove portfolio photo ${index + 1}`}
                      onClick={() => removePortfolioPhoto(index)}
                      className="absolute top-2 right-2 min-h-11 min-w-11 flex items-center justify-center bg-red-500 text-white rounded-lg transition shadow-[var(--surface-shadow)]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 p-2">
                      <span className="text-white text-xs font-medium">Photo {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {portfolioPhotos.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl mb-4">
                <ImagePlus className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50 mb-2" />
                <p className="text-sm text-[var(--text-muted)]">No portfolio photos yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Upload photos to showcase your work</p>
              </div>
            )}

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-dark)] transition cursor-pointer disabled:opacity-50">
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
            <p className="text-xs text-[var(--text-muted)] mt-2">Up to 12 photos, 5 MB each. Save your changes to publish them on your public profile.</p>
          </div>
        </fieldset>
      )}
            {isOperator && (brandingDirty || brandingBusy) && <div role="status" className="sticky bottom-24 z-20 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg">
              <p className="font-semibold">{brandingBusy ? "Uploading images…" : "Your business profile has unsaved changes"}</p>
              <p className="text-sm">Save to make your photo, logo, tagline and portfolio visible on your public profile.</p>
              <button type="button" onClick={saveBranding} disabled={saving || brandingBusy} className="mt-3 min-h-11 rounded-lg bg-[var(--accent)] px-4 text-white disabled:opacity-50">{saving ? "Saving…" : "Save business profile"}</button>
            </div>}
            </div>
          </section>
      </div>
    </div>
  );
}
