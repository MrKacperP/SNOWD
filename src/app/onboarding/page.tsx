"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendAdminNotif } from "@/lib/adminNotifications";
import ServiceRadiusMap from "@/components/ServiceRadiusMap";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AddressMap from "@/components/AddressMap";
import {
  UserRole,
  PropertySize,
  ServiceType,
  CANADIAN_PROVINCES,
  EQUIPMENT_OPTIONS,
} from "@/lib/types";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Home,
  Truck,
  MapPin,
  Wrench,
  CheckCircle,
  Snowflake,
  Car,
  Building,
  Footprints,
  TreePine,
  SkipForward,
} from "lucide-react";

// Suggested presets for faster onboarding
const QUICK_PROPERTY_PRESETS = [
  { size: "small" as PropertySize, label: "Small", emoji: "🏠", desc: "Single car driveway", services: ["driveway", "walkway"] as ServiceType[] },
  { size: "medium" as PropertySize, label: "Medium", emoji: "🏡", desc: "Double car driveway", services: ["driveway", "walkway", "sidewalk"] as ServiceType[] },
  { size: "large" as PropertySize, label: "Large", emoji: "🏘️", desc: "Triple+ / Long driveway", services: ["driveway", "walkway", "sidewalk"] as ServiceType[] },
  { size: "commercial" as PropertySize, label: "Commercial", emoji: "🏢", desc: "Parking lot / Commercial", services: ["parking-lot", "sidewalk"] as ServiceType[] },
];

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  driveway: <Car className="w-5 h-5" />,
  walkway: <Footprints className="w-5 h-5" />,
  sidewalk: <Footprints className="w-5 h-5" />,
  "parking-lot": <Building className="w-5 h-5" />,
  roof: <Home className="w-5 h-5" />,
  other: <TreePine className="w-5 h-5" />,
};

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  driveway: "Driveway",
  walkway: "Walkway",
  sidewalk: "Sidewalk",
  "parking-lot": "Parking Lot",
  roof: "Roof Snow Removal",
  other: "Other",
};

const OPERATOR_PRESETS = [
  { label: "Student Shoveler", emoji: "🎒", equipment: ["Snow Shovel", "Ice Scraper", "Ice Melt/Salt"], radius: 5, isStudent: true },
  { label: "Homeowner Helper", emoji: "🏠", equipment: ["Snow Shovel", "Snow Blower", "Ice Melt/Salt"], radius: 10, isStudent: false },
  { label: "Pro Plow Operator", emoji: "🚜", equipment: ["Plow Truck", "Salt/Sand Spreader", "Snow Blower"], radius: 25, isStudent: false },
  { label: "Full Service Crew", emoji: "⛏️", equipment: ["Plow Truck", "Bobcat/Loader", "Salt/Sand Spreader", "Snow Blower", "Roof Rake"], radius: 40, isStudent: false },
];

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if user already onboarded
  useEffect(() => {
    if (profile?.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [profile, router]);

  // Shared fields
  const [role, setRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");

  // Client fields
  const [propertySize, setPropertySize] = useState<PropertySize>("medium");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(["driveway", "walkway"]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Operator fields
  const [businessName, setBusinessName] = useState("");
  const [isStudent, setIsStudent] = useState(false);
  const [age, setAge] = useState<number | undefined>();
  const [bio, setBio] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [pricingSmall, setPricingSmall] = useState(25);
  const [pricingMedium, setPricingMedium] = useState(40);
  const [pricingLarge, setPricingLarge] = useState(60);
  const [pricingWalkway, setPricingWalkway] = useState(15);
  const [pricingSidewalk, setPricingSidewalk] = useState(15);
  const [operatorServiceTypes, setOperatorServiceTypes] = useState<ServiceType[]>(["driveway", "walkway", "sidewalk"]);

  // Geocoded coordinates
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();

  const totalSteps = role === "client" ? 3 : 4;
  const isSeniorClient = role === "client" && (age ?? 0) >= 55;

  // Mascot guide messages per step
  const getMascotMessage = () => {
    if (step === 1) return "Hey! I can set you up fast. Are you booking help for home, or earning money as a student operator?";
    if (step === 2) return "Perfect. Add your age, phone, and address so I can match you with trusted people nearby.";
    if (step === 3 && role === "client") return "Great! Share your property details so your operator shows up ready. 🏠";
    if (step === 3 && role === "operator") return "Nice. Tell clients your style and tools so you get the right job requests. 🛠️";
    if (step === 4 && role === "operator") return "Last step. Set fair starter pricing and you are ready to accept jobs. 🎉";
    return "You're doing great!";
  };

  const getMascotSrc = () => role === "operator" ? "/StudentLogo.png" : "/logo.png";

  const toggleServiceType = (type: ServiceType) => {
    setServiceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleOperatorServiceType = (type: ServiceType) => {
    setOperatorServiceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const applyClientPreset = (preset: typeof QUICK_PROPERTY_PRESETS[0]) => {
    setPropertySize(preset.size);
    setServiceTypes(preset.services);
  };

  const applyOperatorPreset = (preset: typeof OPERATOR_PRESETS[0]) => {
    setEquipment(preset.equipment);
    setServiceRadius(preset.radius);
    setIsStudent(preset.isStudent);
    if (preset.isStudent) {
      setBio("Student looking to earn extra money with snow removal services.");
    }
  };

  // Phone number auto-formatting
  const formatPhoneNumber = (value: string) => {
    // Strip all non-digits
    const digits = value.replace(/\D/g, "");
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleAddressSelected = (place: google.maps.places.PlaceResult) => {
    if (!place.address_components) return;
    const components = place.address_components;
    let streetNumber = "";
    let route = "";
    let locality = "";
    let provinceCode = "";
    let postalCodeValue = "";

    components.forEach((component) => {
      const types = component.types;
      if (types.includes("street_number")) streetNumber = component.long_name;
      if (types.includes("route")) route = component.long_name;
      if (types.includes("locality")) locality = component.long_name;
      if (types.includes("administrative_area_level_1")) provinceCode = component.short_name;
      if (types.includes("postal_code")) postalCodeValue = component.long_name;
    });

    // Set all fields synchronously
    const resolvedCity = locality || city;
    const resolvedProvince = provinceCode || province;
    const resolvedPostal = postalCodeValue.replace(/\s/g, "") || postalCode;
    const resolvedAddress = place.formatted_address ||
      (streetNumber && route ? `${streetNumber} ${route}` : address);

    setCity(resolvedCity);
    setProvince(resolvedProvince);
    setPostalCode(resolvedPostal);
    setAddress(resolvedAddress);

    // Extract lat/lng from place geometry
    if (place.geometry?.location) {
      setLat(place.geometry.location.lat());
      setLng(place.geometry.location.lng());
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const displayName =
        (typeof window !== "undefined" && sessionStorage.getItem("snowd_signup_name")) ||
        user.displayName ||
        "User";

      const baseProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName,
        phone,
        role: role!,
        createdAt: new Date(),
        onboardingComplete: true,
        province,
        city,
        postalCode,
        address,
        isOnline: true,
        themePreference: "system" as const,
        age: age || null,
        lat: lat || null,
        lng: lng || null,
      };

      if (role === "client") {
        // Clients get immediate access — no verification needed
        await setDoc(doc(db, "users", user.uid), {
          ...baseProfile,
          accountApproved: true,
          idVerified: true,
          verificationStatus: "approved",
          simplifiedMode: !!(age && age >= 55),
          propertyDetails: {
            propertySize,
            serviceTypes,
            specialInstructions,
          },
          savedOperators: [],
          jobHistory: [],
        });
      } else {
        // Operators must be verified by admin before going public
        await setDoc(doc(db, "users", user.uid), {
          ...baseProfile,
          accountApproved: false,
          idVerified: false,
          verificationStatus: "not-submitted",
          businessName,
          isStudent,
          bio,
          equipment,
          serviceRadius,
          serviceTypes: operatorServiceTypes,
          pricing: {
            driveway: {
              small: pricingSmall,
              medium: pricingMedium,
              large: pricingLarge,
            },
            walkway: pricingWalkway,
            sidewalk: pricingSidewalk,
          },
          rating: 0,
          reviewCount: 0,
          verified: false,
          availability: {},
          activeJobs: [],
          completedJobs: 0,
        });
      }

      await refreshProfile();

      // Notify admin of new user profile completion
      sendAdminNotif({
        type: "profile_saved",
        message: `New ${role} profile created: ${displayName} (${city}, ${province})`,
        uid: user.uid,
        meta: {
          name: displayName,
          email: user.email || "",
          role: role!,
          city,
          province,
          address,
        },
      });

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("snowd_signup_name");
        sessionStorage.removeItem("snowd_signup_uid");
      }
      router.push("/dashboard");
    } catch (err) {
      console.error("Onboarding error:", err);
      const error = err as Error;
      if (error.message?.includes("ERR_BLOCKED_BY_CLIENT") || error.message?.includes("Failed to fetch")) {
        alert("Request blocked by browser extension. Please disable ad blockers for this site.");
      } else if (error.message?.includes("permission-denied")) {
        alert("Permission denied. Please check Firestore security rules.");
      } else {
        alert(`Error: ${error.message || "Failed to complete onboarding"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return role !== null;
      case 2:
        // Require phone + address at minimum; city/province/postal can be filled manually
        return !!(phone && address && age && age >= 13);
      case 3:
        if (role === "client") return serviceTypes.length > 0;
        return bio.length > 0 && equipment.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  if (profile?.onboardingComplete) return null;

  // Animated intro screen
  if (showIntro) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center relative overflow-hidden">
        {/* Animated snowflakes background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-[rgba(47,111,237,0.2)]"
              initial={{
                x: `${Math.random() * 100}vw`,
                y: -20,
                rotate: 0,
                scale: 0.5 + Math.random() * 1,
              }}
              animate={{
                y: "105vh",
                rotate: 360,
                x: `${Math.random() * 100}vw`,
              }}
              transition={{
                duration: 6 + Math.random() * 8,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear",
              }}
            >
              <Snowflake className="w-5 h-5" />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center z-10 px-6 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          >
            <Image src="/logo.png" alt="snowd.ca" width={100} height={100} className="mx-auto mb-2 drop-shadow-2xl" />
          </motion.div>

          {/* Mascot speech bubble on intro */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="relative inline-block mb-6"
          >
            <div className="bg-white rounded-2xl px-4 py-2.5 shadow-lg border border-[#E6EEF6] text-sm text-[#0B1F33] font-medium max-w-xs">
              Hi! I&apos;m your Snowd penguin guide. Let&apos;s finish setup in about 2 minutes. ❄️
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                <div className="w-3 h-3 bg-white border-l border-t border-[#E6EEF6] rotate-45 translate-y-1 mx-auto" />
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-4xl font-bold text-[var(--text-primary)] mb-3"
          >
            Welcome to snowd.ca
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-lg text-[var(--text-secondary)] mb-10"
          >
            Neighborhood snow help, powered by local students.
            <br />
            Quick setup. Clear next steps. Guided by your penguin.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowIntro(false)}
            className="px-10 py-4 bg-[#2F6FED] hover:bg-[#2158C7] text-white rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F6FED]/30 transition-colors"
          >
            Get Started
          </motion.button>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            onClick={() => setShowIntro(false)}
            className="block mx-auto mt-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            Skip intro
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="snowd.ca" width={48} height={48} className="mx-auto" />
          <h1 className="text-2xl font-bold mt-3 text-[var(--text-primary)]">
            {step === 1 ? "Welcome to snowd.ca" : "Set Up Your Account"}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            <p className="text-[var(--text-muted)]">Step {step} of {totalSteps}</p>
            {step < totalSteps && (
              <button
                onClick={() => setStep(totalSteps)}
                className="flex items-center gap-1 text-xs text-[rgba(47,111,237,0.6)] hover:text-[var(--accent)] transition"
              >
                <SkipForward className="w-3 h-3" /> Skip
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">Most users finish in about 2 minutes.</p>
          <div className="mt-4 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Mascot guide */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`mascot-${step}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-3 mb-5 px-1"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Image
                src={getMascotSrc()}
                alt="Snowd mascot"
                width={48}
                height={48}
                className="drop-shadow-sm"
              />
            </motion.div>
            <div className="relative bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-md border border-[#E6EEF6] flex-1">
              <p className="text-sm text-[#0B1F33] font-medium leading-snug">{getMascotMessage()}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="bg-white rounded-2xl shadow-lg border border-[#E6EEF6] p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
          {/* Step 1: Choose Role */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-center text-[#0B1F33]">What brings you here?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setRole("client")}
                  className={`p-6 rounded-xl border-2 transition-all duration-150 text-left ${
                    role === "client"
                      ? "border-[#2F6FED] bg-[#D6E8F5] shadow-md"
                      : "border-[#E6EEF6] hover:border-[#2F6FED]/50 hover:bg-[#F7FAFC]"
                  }`}
                >
                  <Home className="w-8 h-8 text-[#2F6FED] mb-3" />
                  <h3 className="font-semibold text-lg text-[#0B1F33]">Book Snow Help</h3>
                  <p className="text-sm text-[#6B7C8F] mt-1">
                    Fast booking for homes, families, and seniors.
                  </p>
                </button>
                <button
                  onClick={() => setRole("operator")}
                  className={`p-6 rounded-xl border-2 transition-all duration-150 text-left ${
                    role === "operator"
                      ? "border-[#2F6FED] bg-[#D6E8F5] shadow-md"
                      : "border-[#E6EEF6] hover:border-[#2F6FED]/50 hover:bg-[#F7FAFC]"
                  }`}
                >
                  <Truck className="w-8 h-8 text-[#2F6FED] mb-3" />
                  <h3 className="font-semibold text-lg text-[#0B1F33]">Earn as an Operator</h3>
                  <p className="text-sm text-[#6B7C8F] mt-1">
                    Great for high school students and local crews.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[#2F6FED]" />
                <h2 className="text-xl font-semibold text-[#0B1F33]">Where should we match you?</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">Age</label>
                <input
                  type="number"
                  min={13}
                  max={120}
                  value={age ?? ""}
                  onChange={(e) => {
                    const next = parseInt(e.target.value, 10);
                    setAge(Number.isNaN(next) ? undefined : next);
                  }}
                  placeholder="e.g., 62"
                  className="w-full px-4 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#2F6FED]/25 focus:border-[#2F6FED] outline-none transition text-[#0B1F33]"
                />
                <p className="text-xs text-[#6B7C8F] mt-1.5">
                  If you are 55+, we automatically switch to a simpler app view with only the essentials.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  className="w-full px-4 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#2F6FED]/25 focus:border-[#2F6FED] outline-none transition text-[#0B1F33]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">
                  Start typing your address
                </label>
                <div className="relative">
                  <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    onPlaceSelected={handleAddressSelected}
                    placeholder="123 Main Street, Toronto, ON"
                    className="w-full px-4 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#2F6FED]/25 focus:border-[#2F6FED] outline-none transition text-[#0B1F33]"
                  />
                  {lat && lng && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" /> Found
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B7C8F] mt-1.5">
                  Select from the dropdown so we can auto-fill city, province, and postal code
                </p>
              </div>

              {/* Auto-filled fields */}
              {(city || province || postalCode) && (
                <div className="bg-[#F7FAFC] rounded-xl p-4 space-y-3 border border-[#E6EEF6]">
                  <p className="text-xs font-medium text-[#6B7C8F] uppercase tracking-wide">Auto-filled from address</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#6B7C8F] mb-1">Province</label>
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3 py-2.5 border border-[#E6EEF6] rounded-lg focus:ring-2 focus:ring-[#2F6FED]/25 outline-none bg-white text-sm text-[#0B1F33]"
                      >
                        <option value="">Select</option>
                        {CANADIAN_PROVINCES.map((p) => (
                          <option key={p.code} value={p.code}>{p.code}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B7C8F] mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 border border-[#E6EEF6] rounded-lg focus:ring-2 focus:ring-[#2F6FED]/25 outline-none text-sm text-[#0B1F33]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B7C8F] mb-1">Postal</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                        maxLength={7}
                        className="w-full px-3 py-2.5 border border-[#E6EEF6] rounded-lg focus:ring-2 focus:ring-[#2F6FED]/25 outline-none text-sm text-[#0B1F33]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Map */}
              {address && city && (
                <div className="mt-2">
                  <AddressMap address={address} city={city} province={province} postalCode={postalCode} />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Client - Quick Property Setup */}
          {step === 3 && role === "client" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-5 h-5 text-[#2F6FED]" />
                <h2 className="text-xl font-semibold text-[#0B1F33]">Tell us about your property</h2>
              </div>
              <p className="text-sm text-[#6B7C8F]">Pick the closest match — you can always change this later.</p>
              {isSeniorClient && (
                <div className="rounded-xl border border-[#D6E8F5] bg-[#F4F8FF] px-4 py-3 text-sm text-[#32508C]">
                  Senior mode will be enabled after setup: quick booking, simple progress view, and direct support chat.
                </div>
              )}

              {/* Quick presets */}
              <div className="grid grid-cols-2 gap-3">
                {QUICK_PROPERTY_PRESETS.map((preset) => (
                  <button
                    key={preset.size}
                    onClick={() => applyClientPreset(preset)}
                    className={`p-4 rounded-xl border-2 transition-all duration-150 text-left ${
                      propertySize === preset.size
                        ? "border-[#2F6FED] bg-[#D6E8F5] shadow-sm"
                        : "border-[#E6EEF6] hover:border-[#2F6FED]/50"
                    }`}
                  >
                    <span className="text-2xl">{preset.emoji}</span>
                    <p className="font-semibold text-sm text-[#0B1F33] mt-2">{preset.label}</p>
                    <p className="text-xs text-[#6B7C8F] mt-0.5">{preset.desc}</p>
                  </button>
                ))}
              </div>

              {/* Services - auto-suggested but editable */}
              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-2">
                  What needs clearing? <span className="text-[#6B7C8F] font-normal">(tap to adjust)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]).map(
                    ([key, label]) => (
                      <button
                        key={key}
                        onClick={() => toggleServiceType(key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2 transition-all duration-150 text-sm font-medium ${
                          serviceTypes.includes(key)
                            ? "border-[#2F6FED] bg-[#D6E8F5] text-[#2F6FED]"
                            : "border-[#E6EEF6] text-[#6B7C8F] hover:border-[#2F6FED]/50"
                        }`}
                      >
                        {SERVICE_ICONS[key]}
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">
                  Anything else we should know? <span className="text-[#6B7C8F] font-normal">(optional)</span>
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g., Please avoid the garden bed, gate code is 1234..."
                  rows={2}
                  className="w-full px-4 py-3 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#2F6FED]/25 focus:border-[#2F6FED] outline-none resize-none text-sm text-[#0B1F33]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Operator - Quick Setup */}
          {step === 3 && role === "operator" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-5 h-5 text-[#2F6FED]" />
                <h2 className="text-xl font-semibold text-[#0B1F33]">Describe your operator profile</h2>
              </div>
              <p className="text-sm text-[#6B7C8F]">Pick a starter template, then fine-tune it anytime in settings.</p>

              {/* Quick presets */}
              <div className="grid grid-cols-2 gap-3">
                {OPERATOR_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyOperatorPreset(preset)}
                    className={`p-4 rounded-xl border-2 transition-all duration-150 text-left ${
                      equipment.length > 0 && JSON.stringify(equipment.sort()) === JSON.stringify([...preset.equipment].sort())
                        ? "border-[#2F6FED] bg-[#D6E8F5] shadow-sm"
                        : "border-[#E6EEF6] hover:border-[#2F6FED]/50"
                    }`}
                  >
                    <span className="text-2xl">{preset.emoji}</span>
                    <p className="font-semibold text-sm text-[#0B1F33] mt-2">{preset.label}</p>
                    <p className="text-xs text-[#6B7C8F] mt-0.5">{preset.equipment.length} tools, {preset.radius}km radius</p>
                  </button>
                ))}
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">
                  Business Name <span className="text-[#6B7C8F] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Jake's Snow Services"
                  className="w-full px-4 py-3.5 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#2F6FED]/25 focus:border-[#2F6FED] outline-none text-sm text-[#0B1F33]"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">
                  Tell clients about yourself
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g., 3 years of snow removal experience..."
                  rows={2}
                  className="w-full px-4 py-3 border border-[#E6EEF6] rounded-xl focus:ring-2 focus:ring-[#2F6FED]/25 focus:border-[#2F6FED] outline-none resize-none text-sm text-[#0B1F33]"
                />
              </div>

              {/* Equipment - editable chips */}
              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-2">
                  Your Equipment <span className="text-[#6B7C8F] font-normal">(tap to adjust)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <button
                      key={item}
                      onClick={() => toggleEquipment(item)}
                      className={`px-3 py-2 rounded-full border-2 transition-all duration-150 text-sm font-medium ${
                        equipment.includes(item)
                          ? "border-[#2F6FED] bg-[#D6E8F5] text-[#2F6FED]"
                          : "border-[#E6EEF6] text-[#6B7C8F] hover:border-[#2F6FED]/50"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Radius */}
              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-1.5">
                  Service Radius: <span className="text-[#2F6FED] font-bold">{serviceRadius} km</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                  className="w-full accent-[#2F6FED]"
                />
                <div className="flex justify-between text-xs text-[#6B7C8F]">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>

              {address && city && province && (
                <ServiceRadiusMap
                  address={address}
                  city={city}
                  province={province}
                  postalCode={postalCode}
                  radiusKm={serviceRadius}
                />
              )}
            </div>
          )}

          {/* Step 4: Operator - Services & Pricing */}
          {step === 4 && role === "operator" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Snowflake className="w-5 h-5 text-[#2F6FED]" />
                <h2 className="text-xl font-semibold text-[#0B1F33]">Set your prices (CAD)</h2>
              </div>
              <p className="text-sm text-[#6B7C8F]">Suggested starter pricing is pre-filled for quick launch.</p>

              {/* Services offered */}
              <div>
                <label className="block text-sm font-medium text-[#0B1F33] mb-2">Services You Offer</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleOperatorServiceType(key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2 transition-all duration-150 text-sm font-medium ${
                        operatorServiceTypes.includes(key)
                          ? "border-[#2F6FED] bg-[#D6E8F5] text-[#2F6FED]"
                          : "border-[#E6EEF6] text-[#6B7C8F] hover:border-[#2F6FED]/50"
                      }`}
                    >
                      {SERVICE_ICONS[key]}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing grid */}
              <div className="bg-[#F7FAFC] rounded-xl p-4 space-y-4 border border-[#E6EEF6]">
                <h3 className="font-medium text-[#0B1F33] text-sm">Driveway Pricing</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Small", value: pricingSmall, set: setPricingSmall },
                    { label: "Medium", value: pricingMedium, set: setPricingMedium },
                    { label: "Large", value: pricingLarge, set: setPricingLarge },
                  ].map((item) => (
                    <div key={item.label}>
                      <label className="block text-xs text-[#6B7C8F] mb-1">{item.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C8F] text-sm">$</span>
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => item.set(parseInt(e.target.value) || 0)}
                          className="w-full pl-7 pr-2 py-2.5 border border-[#E6EEF6] rounded-lg focus:ring-2 focus:ring-[#2F6FED]/25 outline-none text-sm bg-white text-[#0B1F33]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Walkway", value: pricingWalkway, set: setPricingWalkway },
                    { label: "Sidewalk", value: pricingSidewalk, set: setPricingSidewalk },
                  ].map((item) => (
                    <div key={item.label}>
                      <label className="block text-xs text-[#6B7C8F] mb-1">{item.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C8F] text-sm">$</span>
                        <input
                          type="number"
                          value={item.value}
                          onChange={(e) => item.set(parseInt(e.target.value) || 0)}
                          className="w-full pl-7 pr-2 py-2.5 border border-[#E6EEF6] rounded-lg focus:ring-2 focus:ring-[#2F6FED]/25 outline-none text-sm bg-white text-[#0B1F33]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-5 py-2.5 text-[#6B7C8F] hover:text-[#0B1F33] font-medium transition rounded-xl hover:bg-[#F7FAFC]"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {((step === 3 && role === "client") || (step === 4 && role === "operator")) ? (
              <button
                onClick={handleComplete}
                disabled={loading || !canProceed()}
                className="flex items-center gap-2 px-8 py-3 bg-[#27AE60] text-white rounded-xl font-semibold hover:bg-[#1e8b4d] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed btn-lift shadow-sm"
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? "Saving..." : "Finish Setup"}
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1 px-6 py-3 bg-[#2F6FED] text-white rounded-xl font-semibold hover:bg-[#2158C7] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed btn-lift shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
