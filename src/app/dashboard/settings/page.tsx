"use client";
import SavedProperties from "@/components/SavedProperties";
import ProfilePhotoPicker from "@/components/ProfilePhotoPicker";
import UserAvatar from "@/components/UserAvatar";
import IconSwap from "@/components/ui/IconSwap";


import { isOperatorPublic } from "@/lib/operatorDiscovery";
import Link from "next/link";
import Image from "next/image";
import DeleteConfirmPopup from "@/components/DeleteConfirmPopup";
import Modal from "@/components/ui/Modal";
import Notification from "@/components/Notification";


import StripeOnboarding from "@/components/StripeOnboarding";
import { stripeConnectFetch } from "@/lib/stripeConnectClient";

import ServiceAreaEditor from "@/components/ServiceAreaEditor";
import { useAuth } from "@/context/AuthContext";
import { useServiceLocation } from "@/context/ServiceLocationContext";
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
import { deleteField,doc,updateDoc } from "firebase/firestore";
import { getDownloadURL,ref,uploadBytes } from "firebase/storage";
import {
AlertCircle,
ArrowLeft,
Bell,
Briefcase,
Building2,
Camera,
CheckCircle,
ChevronRight,
CreditCard,
ExternalLink,
GraduationCap,
Home,
ImagePlus,
Loader2,
LogOut,
MapPin,
Palette,
Pencil,
RefreshCw,
Save,
Shield,
ShieldCheck,
Trash2,
Upload,
User
} from "lucide-react";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import React,{ useEffect,useState,useRef } from "react";
import styles from "./settings.module.css";

const SECTIONS = ["general", "properties", "service-areas", "payment", "verification", "notifications", "branding"] as const;
type Section = typeof SECTIONS[number];
const sectionFromPath = (path: string): Section | null => {
  const section = path.split("/")[3];
  return (SECTIONS as readonly string[]).includes(section) ? section as Section : null;
};

// The field's name sits inside the box and shrinks to the top once there's a value.
type FieldProps = { label: string; missing?: boolean; wide?: boolean };
function Field({ label, missing, wide, ...props }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`${styles.field} ${wide ? styles.wide : ""}`} data-missing={missing || undefined}><input {...props} placeholder=" " /><span>{label}</span></label>;
}
function TextAreaField({ label, missing, ...props }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className={`${styles.field} ${styles.wide}`} data-missing={missing || undefined}><textarea {...props} placeholder=" " /><span>{label}</span></label>;
}
function SelectField({ label, missing, wide, ...props }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <label className={`${styles.field} ${wide ? styles.wide : ""}`} data-missing={missing || undefined} data-empty={!props.value || undefined}><select {...props} /><span>{label}</span></label>;
}

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile, deleteAccount } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [feedback, setFeedback] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingLeave = useRef<(() => void) | null>(null);
  const allowLeave = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [savingEmailPreferences, setSavingEmailPreferences] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState({ account: true, workOrders: true });
  const locations = useServiceLocation();
  const [activeTab, setActiveTab] = useState<Section | null>(() => sectionFromPath(pathname));
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
  const previousHome = useRef({address:profile?.address || "",city:profile?.city || "",province:profile?.province || "",postalCode:profile?.postalCode || ""});
  useEffect(()=>{
    const previous=previousHome.current;
    setAddress(value=>value === previous.address ? profile?.address || "" : value);
    setCity(value=>value === previous.city ? profile?.city || "" : value);
    setProvince(value=>value === previous.province ? profile?.province || "" : value);
    setPostalCode(value=>value === previous.postalCode ? profile?.postalCode || "" : value);
    previousHome.current={address:profile?.address || "",city:profile?.city || "",province:profile?.province || "",postalCode:profile?.postalCode || ""};
  },[profile?.address,profile?.city,profile?.province,profile?.postalCode]);
  const [age, setAge] = useState<number | undefined>((profile as ClientProfile)?.age);
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>((profile as ClientProfile)?.propertyDetails?.photos || []);
  const [uploadingPropertyPhotos, setUploadingPropertyPhotos] = useState(false);

  // Operator fields
  const operatorProfile = profile as OperatorProfile;
  const [bio, setBio] = useState(operatorProfile?.bio || "");
  const [businessName, setBusinessName] = useState(operatorProfile?.businessName || "");
  const [serviceAreaMode, setServiceAreaMode] = useState<"radius" | "cities">(operatorProfile?.serviceAreaMode || (operatorProfile?.serviceAreas?.length ? "cities" : "radius"));
  const [serviceRadius, setServiceRadius] = useState(operatorProfile?.serviceRadius || 10);
  const [serviceAreas, setServiceAreas] = useState<OperatorServiceArea[]>(operatorProfile?.serviceAreas || []);
  const [pricing, setPricing] = useState(() => ({
    small: operatorProfile?.pricing?.driveway?.small || 25,
    medium: operatorProfile?.pricing?.driveway?.medium || 40,
    large: operatorProfile?.pricing?.driveway?.large || 60,
    walkway: operatorProfile?.pricing?.walkway || 15,
    sidewalk: operatorProfile?.pricing?.sidewalk || 15,
    backyardPatio: operatorProfile?.pricing?.backyardPatio || 15,
    porch: operatorProfile?.pricing?.porch || 10,
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
  const savedRequiredFields = requiredGeneralFields.map(field => ({ ...field, value: String((profile as unknown as Record<string, unknown> | null)?.[field.key] || "") }));
  const savedMissingFields = savedRequiredFields.filter(field => !field.value.trim());


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
  const generalDirty = Boolean(profile) && (requiredGeneralFields.some(field => field.value !== String((profile as unknown as Record<string, unknown>)?.[field.key] || "")) || (!isOperator && age !== (profile as ClientProfile)?.age) || (isOperator && (serviceRadius !== (operatorProfile.serviceRadius || 10) || serviceAreaMode !== (operatorProfile.serviceAreaMode || (operatorProfile.serviceAreas?.length ? "cities" : "radius")) || JSON.stringify(serviceAreas) !== JSON.stringify(operatorProfile.serviceAreas || []) || pricing.small !== (operatorProfile.pricing?.driveway?.small || 25) || pricing.medium !== (operatorProfile.pricing?.driveway?.medium || 40) || pricing.large !== (operatorProfile.pricing?.driveway?.large || 60) || pricing.walkway !== (operatorProfile.pricing?.walkway || 15) || pricing.sidewalk !== (operatorProfile.pricing?.sidewalk || 15) || pricing.backyardPatio !== (operatorProfile.pricing?.backyardPatio || 15) || pricing.porch !== (operatorProfile.pricing?.porch || 10))));
  useEffect(() => {
    if (!generalDirty && !brandingDirty && !brandingBusy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      const target = (event.target as Element).closest("a[href], button");
      const leaving = (target?.matches("a[href]") && !target.getAttribute("href")?.startsWith("#")) || /sign out/i.test(target?.textContent || "");
      if (leaving && !allowLeave.current && target instanceof HTMLElement) {
        event.preventDefault(); event.stopPropagation();
        pendingLeave.current = () => {
          allowLeave.current = true;
          target.click();
          allowLeave.current = false;
        };
        setLeaveOpen(true);
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leave, true); };
  }, [generalDirty, brandingDirty, brandingBusy]);

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

  const saveClientPhoto = async (url: string) => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, "users", profile.uid), { avatar: url ? url : deleteField() });
    await refreshProfile();
    setFeedback(url ? "Profile photo saved." : "Profile photo removed.");
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
      router.replace("/dashboard/settings/payment");
    }

    // Handle tab query param (e.g. from transactions page)
    const tabParam = searchParams.get("tab");
    if (tabParam && (SECTIONS as readonly string[]).includes(tabParam)) router.replace(`/dashboard/settings/${tabParam}`);
  }, [searchParams, profile?.uid, router, refreshProfile]);

  useEffect(() => {
    setActiveTab(sectionFromPath(pathname));
  }, [pathname]);

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
        setStripeStatus(null);
        setStripeConfigError(e instanceof Error ? e.message : "Unable to check your payment account.");
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

      await startNewStripeOnboarding();
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
        setServiceAreaMode(op.serviceAreaMode || (op.serviceAreas?.length ? "cities" : "radius"));
        setPricing({
          small: op.pricing?.driveway?.small || 25,
          medium: op.pricing?.driveway?.medium || 40,
          large: op.pricing?.driveway?.large || 60,
          walkway: op.pricing?.walkway || 15,
          sidewalk: op.pricing?.sidewalk || 15,
          backyardPatio: op.pricing?.backyardPatio || 15,
          porch: op.pricing?.porch || 10,
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
    if (isOperator && serviceAreaMode === "cities" && !serviceAreas.length) {
      setSaveError("Add at least one service city, or choose a travel radius.");
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
      if (address !== profile.address || city !== profile.city || province !== profile.province || postalCode !== profile.postalCode) {
        updates.lat=deleteField(); updates.lng=deleteField();
      }
      if (isOperator) {
        updates.bio = bio;
        updates.businessName = businessName;
        updates.serviceRadius = serviceRadius;
        updates.serviceAreaMode = serviceAreaMode;
        updates.serviceAreas = serviceAreaMode === "cities" ? serviceAreas : [];
        updates.pricing = {
          driveway: { small: pricing.small, medium: pricing.medium, large: pricing.large },
          walkway: pricing.walkway,
          sidewalk: pricing.sidewalk,
          backyardPatio: pricing.backyardPatio,
          // Front porch is always billed at the sidewalk rate.
          porch: pricing.sidewalk,
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
    ...(isOperator
      ? [{ key: "service-areas" as const, label: "Service areas", icon: MapPin }]
      : [{ key: "properties" as const, label: "Properties", icon: Home }]),
    { key: "payment" as const, label: "Payment", icon: CreditCard },
    { key: "verification" as const, label: "Verification", icon: ShieldCheck },
    { key: "notifications" as const, label: "Notifications", icon: Bell },
    ...(isOperator ? [{ key: "branding" as const, label: "Branding", icon: Palette }] : []),
  ];

  const TAB_DESCRIPTIONS: Record<Section, string> = {
    general: "Your name, phone and contact details",
    properties: "Your main house, rentals and business properties",
    "service-areas": "Where you're based and the areas you serve",
    payment: isOperator ? "Connect and manage your Stripe payout account" : "Review cards and secure payment details",
    verification: "Upload and manage your verification documents",
    notifications: "Choose which emails you receive",
    branding: "Your business logo, tagline and photos",
  };

  const activeTabMeta = TABS.find((tab) => tab.key === activeTab);
  const accountComplete = savedMissingFields.length === 0;
  const completionPercent = Math.round((savedRequiredFields.length - savedMissingFields.length) / savedRequiredFields.length * 100);
  const verificationLabel = profile?.idVerified ? "Verified" : verificationStatus === "rejected" ? "Action needed" : profile?.idPhotoUrl ? "In review" : "Not submitted";
  const paymentLabel = isOperator ? stripeStatus?.fullyReady ? "Connected" : stripeConfigError ? "Check connection" : stripeStatus ? "Setup needed" : "Check status" : "At checkout";
  const LOCATION_FIELDS = ["address", "city", "province", "postalCode"];
  const locationSection: Section = isOperator ? "service-areas" : "properties";
  const missingIn = (section: Section) => savedMissingFields.filter(field => (LOCATION_FIELDS.includes(field.key) ? locationSection : "general") === section).length;
  const propertyCount = (locations?.home ? 1 : 0) + (locations?.properties.length || 0);
  const sectionStatus: Record<Section, string> = {
    general: missingIn("general") ? `${missingIn("general")} missing` : "Complete",
    properties: missingIn("properties") ? "Add your main house" : `${propertyCount} saved`,
    "service-areas": missingIn("service-areas") ? "Add your location" : operatorProfile?.serviceAreaMode === "cities" && operatorProfile.serviceAreas?.length ? `${operatorProfile.serviceAreas.length} ${operatorProfile.serviceAreas.length === 1 ? "city" : "cities"}` : `${operatorProfile?.serviceRadius || 10} km radius`,
    payment: paymentLabel,
    verification: verificationLabel,
    notifications: "Preferences",
    branding: "Optional",
  };
  const firstMissingSection: Section | null = savedMissingFields.length ? LOCATION_FIELDS.includes(savedMissingFields[0].key) ? locationSection : "general" : null;
  const headerName = (isOperator && operatorProfile?.businessName) || profile?.displayName || "Your profile";
  const basedIn = [profile?.city, profile?.province].filter(Boolean).join(", ");

  const saveBar = <>
    {saveError && <p role="alert" className="text-red-700">{saveError}</p>}
    <div className={styles.saveBar}>
      <div><strong>{generalDirty ? "You have unsaved changes" : "All changes saved"}</strong><p>Save to update your profile.</p></div>
      <button type="button" onClick={handleSave} disabled={saving || brandingBusy || !generalDirty} className="btn-primary flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
      </button>
    </div>
  </>;

  const locationFields = <div className={styles.fields}>
    <Field wide label="Street address" value={address} missing={missingGeneralFieldSet.has("address")} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
    <Field label="City" value={city} missing={missingGeneralFieldSet.has("city")} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
    <SelectField label="Province" value={province} missing={missingGeneralFieldSet.has("province")} onChange={(e) => setProvince(e.target.value)}>
      <option value="" disabled hidden />
      {CANADIAN_PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
    </SelectField>
    <Field label="Postal code" value={postalCode} missing={missingGeneralFieldSet.has("postalCode")} onChange={(e) => setPostalCode(e.target.value.toUpperCase())} maxLength={7} autoComplete="postal-code" />
  </div>;

  return (
    <div className={`${styles.settings} ${styles.page}`}>
      <Modal isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} title="Leave without saving?" subtitle={brandingBusy ? "Wait for the upload to finish, then save your profile before leaving." : "Your account has changes that haven’t been saved."} size="sm">
        <div className="grid gap-2">
          <button type="button" className="btn-primary w-full" onClick={() => setLeaveOpen(false)}>Keep editing</button>
          <button type="button" className="btn-secondary w-full" disabled={brandingBusy} onClick={() => { setLeaveOpen(false); pendingLeave.current?.(); pendingLeave.current = null; }}>Leave without saving</button>
        </div>
      </Modal>
      {feedback && <Notification message={feedback} type="error" onClose={() => setFeedback("")} />}
      <DeleteConfirmPopup isOpen={deleteOpen} onCancel={() => { if (!deletingAccount) setDeleteOpen(false); }} onConfirm={handleDeleteAccount} loading={deletingAccount} title="Delete your account?" message="This permanently removes your sign-in and profile. Job, payment and conversation records may remain. You cannot undo this." confirmLabel="Delete account" />

      {!activeTab ? <>
        <header className={styles.profileHeader}>
          <UserAvatar photoURL={profile?.avatar} logoURL={isOperator ? operatorProfile?.logoUrl : undefined} role={profile?.role} displayName={headerName} size={112} rounded="full" className={styles.profileLogo} />
          <h1>{headerName}</h1>
          <p>{profile?.email || user?.email}</p>
          {basedIn && <p className={styles.profileLocation}><MapPin size={15} aria-hidden="true" />{basedIn}</p>}
          <div className={styles.profileActions}>
            <Link href="/dashboard/settings/general" className={`${styles.pill} ${styles.pillPrimary}`}><Pencil size={15} aria-hidden="true" />Edit profile</Link>
            {profile?.uid && <Link href={`/dashboard/u/${profile.uid}`} className={styles.pill}>View profile</Link>}
          </div>
          {!accountComplete && firstMissingSection && <Link href={`/dashboard/settings/${firstMissingSection}`} className={styles.profileProgress}>
            <span><span>Profile {completionPercent}% complete</span><ChevronRight size={16} aria-hidden="true" /></span>
            <span className={styles.progress} role="progressbar" aria-label="Profile completed" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${completionPercent}%` }} /></span>
          </Link>}
        </header>

        <section className={styles.menu} aria-labelledby="account-settings-title">
          <h2 id="account-settings-title" className={styles.menuLabel}>ACCOUNT SETTINGS</h2>
          <nav aria-label="Settings sections">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return <Link key={tab.key} href={`/dashboard/settings/${tab.key}`} className={styles.menuItem}>
                <span className={styles.menuIcon}><Icon size={19} aria-hidden="true" /></span>
                <span className={styles.menuText}><strong>{tab.label}</strong><small>{sectionStatus[tab.key]}</small></span>
                <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
              </Link>;
            })}
          </nav>
          <button type="button" onClick={handleSignOut} className={styles.signOut}><LogOut size={18} aria-hidden="true" /> Sign out</button>
        </section>
        <p className={styles.version}>snowd.ca v0.1.0</p>
      </> : <>
        <Link href="/dashboard/settings" className={styles.back}><ArrowLeft size={17} aria-hidden="true" />Settings</Link>
        <section className={styles.content} aria-labelledby="settings-section-title">
          <div className="space-y-6">
            <div className={styles.sectionHeading}>
              <div><h1 id="settings-section-title">{activeTabMeta?.label || "Settings"}</h1><p>{TAB_DESCRIPTIONS[activeTab]}</p></div>
              <span role="status" className={saved ? styles.saved : styles.sectionMeta}>{saved ? <><CheckCircle size={15} /> Saved</> : activeTab === "notifications" ? savingEmailPreferences ? "Saving…" : "Saves automatically" : (["general", "properties", "service-areas"].includes(activeTab) && generalDirty) || (activeTab === "branding" && brandingDirty) ? "Unsaved changes" : ""}</span>
            </div>
            {firstMissingSection && missingIn(activeTab) === 0 && <Link href={`/dashboard/settings/${firstMissingSection}`} className={styles.incompleteNotice}><AlertCircle size={17} /><span>Finish your {firstMissingSection === "general" ? "account details" : firstMissingSection === "properties" ? "main house address" : "base location"}</span><ChevronRight size={17} /></Link>}

      {/* Account */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {!isOperator && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Profile photo</h2>
              <p className={styles.sectionDescription}>Shown on your contact card and in Messages. Saves as soon as you choose it.</p>
              <ProfilePhotoPicker value={profile?.avatar || ""} name={profile?.displayName} onChange={saveClientPhoto} />
            </section>
          )}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Your details</h2>
            <div className={styles.fields}>
              <Field label="Full name" value={displayName} missing={missingGeneralFieldSet.has("displayName")} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
              <Field label="Phone number" type="tel" value={phone} missing={missingGeneralFieldSet.has("phone")} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              <Field wide label="Email" type="email" value={user?.email || ""} disabled />
              {!isOperator && <Field label="Age (optional)" type="number" min={13} max={120} value={age ?? ""} onChange={(e) => { const next = parseInt(e.target.value, 10); setAge(Number.isNaN(next) ? undefined : next); }} />}
              {isOperator && <Field wide label="Business name" value={businessName} missing={missingGeneralFieldSet.has("businessName")} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" />}
              {isOperator && <TextAreaField label="Short bio for clients" value={bio} missing={missingGeneralFieldSet.has("bio")} onChange={(e) => setBio(e.target.value)} rows={3} />}
            </div>
            {!isOperator && <p className={styles.hint}>Ages 55+ get the simplified dashboard.</p>}
          </section>

          {isOperator && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Your prices</h2>
              <p className={styles.sectionDescription}>What you receive for each area. Front porch and sidewalk share one price. Existing orders keep their agreed price.</p>
              <div className={styles.fields}>
                {([
                  ["small", "1-car driveway"],
                  ["medium", "2-car driveway"],
                  ["large", "3+ car driveway"],
                  ["sidewalk", "Front porch & sidewalk"],
                  ["backyardPatio", "Backyard patio"],
                ] as const).map(([key, label]) => (
                  <Field key={key} label={`${label} ($ CAD)`} type="number" inputMode="decimal" min="0.01" max="10000" step="0.01" value={pricing[key]} onChange={event => setPricing(current => ({ ...current, [key]: Number(event.target.value), ...(key === "sidewalk" ? { porch: Number(event.target.value) } : {}) }))} />
                ))}
              </div>
            </section>
          )}

          {saveBar}

          <section className={styles.dangerZone}>
            <h2 className={styles.cardTitle}>Delete account</h2>
            <p className={styles.sectionDescription}>Permanently removes your profile and sign-in. Shared job, payment and support records may be kept for service and legal purposes.</p>
            <button type="button" onClick={() => setDeleteOpen(true)} disabled={deletingAccount} className={styles.dangerButton}>
              {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deletingAccount ? "Deleting account…" : "Delete account"}
            </button>
          </section>
        </div>
      )}

      {/* Properties — clients only */}
      {activeTab === "properties" && !isOperator && (
        <div className="space-y-6">
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Main house</h2>
            <p className={styles.sectionDescription}>Your profile home. Operators see it when you book.</p>
            {locationFields}
            {address && city && (
              <div className={styles.mapPreview}>
                <iframe title="Your main house on the map" width="100%" height="220" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={buildGoogleMapsEmbedUrl(`${address}, ${city}, ${province} ${postalCode}, Canada`, 15)} />
              </div>
            )}
          </section>
          {saveBar}
          <SavedProperties />
          <section className={styles.card} aria-labelledby="property-photos-heading">
            <h2 id="property-photos-heading" className={styles.cardTitle}>Property photos</h2>
            <p className={styles.sectionDescription}>Driveway or clearing-area photos so operators know what to expect.</p>
            {propertyPhotos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{propertyPhotos.map((url, index) => <figure key={url} className="overflow-hidden rounded-xl border bg-white"><Image src={url} alt={`Property clearing area ${index + 1}`} width={480} height={320} unoptimized className="aspect-[3/2] w-full object-cover" /><button type="button" disabled={uploadingPropertyPhotos} onClick={() => removePropertyPhoto(index)} className="min-h-11 w-full font-semibold text-red-700 disabled:opacity-50">Remove photo</button></figure>)}</div>}
            {propertyPhotos.length < 6 && <label className="btn-secondary mt-3 inline-flex cursor-pointer items-center gap-2">
              <ImagePlus className="h-4 w-4" /> {uploadingPropertyPhotos ? "Uploading…" : "Add property photos"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingPropertyPhotos} onChange={handlePropertyPhotoUpload} className="sr-only" />
            </label>}
          </section>
        </div>
      )}

      {/* Service areas — operators only */}
      {activeTab === "service-areas" && isOperator && (
        <div className="space-y-6">
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Your base location</h2>
            <p className={styles.sectionDescription}>Where you start from. Clients only see your city.</p>
            {locationFields}
          </section>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Areas you serve</h2>
            <p className={styles.sectionDescription}>Pick a travel radius, or add and remove the cities you work in.</p>
            <ServiceAreaEditor location={{ address, city, province, postalCode }} mode={serviceAreaMode} radius={serviceRadius} cities={serviceAreas} onChange={patch => {
              if (patch.serviceAreaMode) setServiceAreaMode(patch.serviceAreaMode);
              if (patch.serviceRadius !== undefined) setServiceRadius(patch.serviceRadius);
              if (patch.serviceAreas) setServiceAreas(patch.serviceAreas);
            }} />
          </section>
          {saveBar}
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
                  ><IconSwap icon={<ExternalLink className="w-4 h-4" />}>
                    <ExternalLink className="w-4 h-4" />
                    Manage Stripe account
                  </IconSwap></button>
                </div>
              ) : stripeStatus?.detailsSubmitted ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl">
                    <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-yellow-800">Verification Pending</p>
                      <p className="text-sm text-yellow-600">Stripe is reviewing your details. Check back here for updates.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-[3px] border-[var(--border)] text-[var(--ink)] rounded-xl font-medium text-sm hover:bg-[var(--bg-primary)] transition"
                  ><IconSwap icon={<ExternalLink className="w-4 h-4" />}>
                    <ExternalLink className="w-4 h-4" />
                    Check Status
                  </IconSwap></button>
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
                <input type="checkbox" role="switch" checked={emailPreferences.workOrders} disabled={savingEmailPreferences} onChange={(event) => void updateEmailPreference("workOrders", event.target.checked)} className={styles.toggle} />
              </label>
              <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 p-4">
                <span><span className="block text-sm font-semibold">Account emails</span><span className="mt-1 block text-xs text-[var(--text-muted)]">Welcome messages and important updates about your SNOWD account.</span></span>
                <input type="checkbox" role="switch" checked={emailPreferences.account} disabled={savingEmailPreferences} onChange={(event) => void updateEmailPreference("account", event.target.checked)} className={styles.toggle} />
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
                className="sr-only"
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
                    ><IconSwap icon={<ExternalLink className="w-4 h-4" />}>
                      <ExternalLink className="w-4 h-4" /> View uploaded transcript
                    </IconSwap></a>
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
                  className="sr-only"
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
              <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover object-center rounded-full" />
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
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-4">
              <div>
                <Field wide label="Business tagline" value={brandingTagline} onChange={(e) => setBrandingTagline(e.target.value)} maxLength={80} />
                <p className={styles.hint}>{brandingTagline.length}/80 characters</p>
              </div>

              <div>
                <TextAreaField label="About your business" value={brandingDescription} onChange={(e) => setBrandingDescription(e.target.value)} rows={4} maxLength={500} />
                <p className={styles.hint}>{brandingDescription.length}/500 characters</p>
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
                className="sr-only"
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
      </>}
    </div>
  );
}
