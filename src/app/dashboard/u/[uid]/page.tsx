"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  UserProfile,
  OperatorProfile,
  ClientProfile,
  ServiceType,
  Review,
} from "@/lib/types";
import StarRating from "@/components/StarRating";
import ServiceRadiusMap from "@/components/ServiceRadiusMap";
import AddressMap from "@/components/AddressMap";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Star,
  Wrench,
  DollarSign,
  GraduationCap,
  MessageSquare,
  Calendar,
  Briefcase,
  Snowflake,
  Camera,
  ChevronRight,
  Map,
  Heart,
} from "lucide-react";

const SERVICE_LABELS: Record<ServiceType, string> = {
  driveway: "Driveway",
  walkway: "Walkway",
  sidewalk: "Sidewalk",
  "parking-lot": "Parking Lot",
  roof: "Roof",
  other: "Other",
};

const SERVICE_EMOJI: Record<ServiceType, string> = {
  driveway: "🚗",
  walkway: "🚶",
  sidewalk: "🛤️",
  "parking-lot": "🅿️",
  roof: "🏠",
  other: "❄️",
};

export default function PublicProfilePage() {
  const params = useParams();
  const uid = params.uid as string;
  const router = useRouter();
  const { profile: myProfile } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"about" | "services" | "reviews">("about");
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  const isOwnProfile = myProfile?.uid === uid;
  const isOperator = profileData?.role === "operator";
  const operatorProfile = profileData as OperatorProfile;
  const clientProfile = profileData as ClientProfile;

  // Distance calculation between viewer and profile user
  const distance = React.useMemo(() => {
    if (!myProfile || !profileData) return null;
    const myLat = (myProfile as unknown as { lat?: number }).lat;
    const myLng = (myProfile as unknown as { lng?: number }).lng;
    const otherLat = (profileData as unknown as { lat?: number }).lat;
    const otherLng = (profileData as unknown as { lng?: number }).lng;
    if (myLat && myLng && otherLat && otherLng) {
      const R = 6371;
      const dLat = ((otherLat - myLat) * Math.PI) / 180;
      const dLng = ((otherLng - myLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((myLat * Math.PI) / 180) *
          Math.cos((otherLat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return null;
  }, [myProfile, profileData]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          setProfileData(userDoc.data() as UserProfile);
        }

        // Check if this operator is favorited by current user
        if (myProfile?.uid && myProfile.role === "client" && uid !== myProfile.uid) {
          const myDoc = await getDoc(doc(db, "users", myProfile.uid));
          if (myDoc.exists()) {
            const myData = myDoc.data() as ClientProfile;
            setIsFavorite(myData.savedOperators?.includes(uid) || false);
          }
        }

        // Fetch reviews (bidirectional — reviews about this user)
        try {
          const reviewsQuery = query(
            collection(db, "reviews"),
            where("revieweeId", "==", uid),
            limit(20)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          let fetchedReviews = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));

          // Also try legacy format where operatorId is the reviewee
          if (fetchedReviews.length === 0) {
            try {
              const legacyQuery = query(
                collection(db, "reviews"),
                where("operatorId", "==", uid),
                limit(20)
              );
              const legacySnap = await getDocs(legacyQuery);
              fetchedReviews = legacySnap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
            } catch {}
          }

          setReviews(fetchedReviews);
        } catch {
          // No reviews or index issue
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-[#6B7C8F] gap-3">
        <div className="animate-spin-slow">
          <Image src="/logo.svg" alt="Loading" width={40} height={40} />
        </div>
        <p className="text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-[#6B7C8F]">
        <Snowflake className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-semibold">User not found</p>
        <button onClick={() => router.back()} className="mt-4 text-[#4361EE] text-sm font-medium hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const isOnline = (profileData as unknown as Record<string, unknown>)?.isOnline !== false;
  const memberSince = profileData.createdAt
    ? new Date(
        typeof profileData.createdAt === "object" && "seconds" in (profileData.createdAt as unknown as Record<string, unknown>)
          ? ((profileData.createdAt as unknown as { seconds: number }).seconds * 1000)
          : profileData.createdAt as unknown as string
      ).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#6B7C8F] hover:text-[#0B1F33] mb-4 text-sm font-medium transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile Header - Instagram-like */}
      <div className="bg-white rounded-2xl border border-[#E6EEF6] overflow-hidden">
        {/* Cover / Gradient */}
        <div className="h-32 bg-[#4361EE] relative">
          <div className="absolute inset-0 bg-[url('/logo.svg')] bg-center bg-no-repeat opacity-10" style={{ backgroundSize: "60px" }} />
        </div>

        {/* Avatar & Info */}
        <div className="px-6 -mt-12 pb-6">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative">
              <div className="w-24 h-24 bg-[#4361EE] rounded-2xl flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg">
                {profileData.displayName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl font-bold text-[#0B1F33] truncate">{profileData.displayName}</h1>
              <p className="text-sm text-[#6B7C8F] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profileData.city}, {profileData.province} area
                {distance !== null && (
                  <span className="ml-2 text-[#4361EE] font-medium">
                    • {distance.toFixed(1)} km away
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-6 mb-4">
            {isOperator && (
              <>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#0B1F33]">{operatorProfile.completedJobs || 0}</p>
                  <p className="text-xs text-[#6B7C8F]">Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#0B1F33] flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    {operatorProfile.rating?.toFixed(1) || "–"}
                  </p>
                  <p className="text-xs text-[#6B7C8F]">{operatorProfile.reviewCount || 0} reviews</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#0B1F33]">{operatorProfile.serviceRadius || 0}</p>
                  <p className="text-xs text-[#6B7C8F]">km radius</p>
                </div>
              </>
            )}
            <div className="text-center">
              <p className="text-lg font-bold text-[#0B1F33]">{memberSince}</p>
              <p className="text-xs text-[#6B7C8F]">Joined</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-[#E8EDFD] text-[#4361EE] rounded-full text-xs font-semibold capitalize">
              {isOperator ? "Snow Removal Operator" : "Client"}
            </span>
            {isOperator && operatorProfile.isStudent && (
              <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-semibold flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Student
              </span>
            )}
            {isOperator && operatorProfile.verified && (
              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-semibold">
                ✓ Verified
              </span>
            )}
            {isOnline && (
              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-semibold">
                Online
              </span>
            )}
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3">
              {myProfile?.role === "client" && isOperator && (
                <>
                  <button
                    onClick={() => {
                      // In future: create a chat/job with this operator
                      router.push("/dashboard/find");
                    }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4361EE] text-white rounded-xl font-semibold text-sm hover:bg-[#1a6dd4] transition"
                  >
                    <Briefcase className="w-4 h-4" />
                    Hire
                  </button>
                  <button
                    onClick={async () => {
                      if (!myProfile?.uid || togglingFavorite) return;
                      setTogglingFavorite(true);
                      try {
                        const myDocRef = doc(db, "users", myProfile.uid);
                        const myDoc = await getDoc(myDocRef);
                        if (myDoc.exists()) {
                          const myData = myDoc.data() as ClientProfile;
                          const savedOps = myData.savedOperators || [];
                          const { updateDoc: ud } = await import("firebase/firestore");
                          if (isFavorite) {
                            await ud(myDocRef, {
                              savedOperators: savedOps.filter(id => id !== uid)
                            });
                            setIsFavorite(false);
                          } else {
                            await ud(myDocRef, {
                              savedOperators: [...savedOps, uid]
                            });
                            setIsFavorite(true);
                          }
                        }
                      } catch (error) {
                        console.error("Error toggling favorite:", error);
                      } finally {
                        setTogglingFavorite(false);
                      }
                    }}
                    disabled={togglingFavorite}
                    className={`px-4 py-2.5 border rounded-xl font-semibold text-sm transition ${
                      isFavorite
                        ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                        : "border-[#E6EEF6] text-[#0B1F33] hover:bg-[#F7FAFC]"
                    } disabled:opacity-50`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-600" : ""}`} />
                  </button>
                </>
              )}
              <button
                onClick={() => router.push("/dashboard/messages")}
                className="btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E6EEF6] text-[#0B1F33] rounded-xl font-semibold text-sm hover:bg-[#F7FAFC] transition"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </button>
            </div>
          )}
          {isOwnProfile && (
            <Link
              href="/dashboard/settings"
              className="btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E6EEF6] text-[#0B1F33] rounded-xl font-semibold text-sm hover:bg-[#F7FAFC] transition w-full"
            >
              Edit Profile
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {isOperator ? (
        <div className="flex gap-1 mt-4 bg-white rounded-xl border border-[#E6EEF6] p-1">
          {[
            { key: "about" as const, label: "About" },
            { key: "services" as const, label: "Services" },
            { key: "reviews" as const, label: `Reviews (${reviews.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-[#E8EDFD] text-[#4361EE]"
                  : "text-[#6B7C8F] hover:text-[#0B1F33]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-1 mt-4 bg-white rounded-xl border border-[#E6EEF6] p-1">
          {[
            { key: "about" as const, label: "About" },
            { key: "reviews" as const, label: `Reviews (${reviews.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-[#E8EDFD] text-[#4361EE]"
                  : "text-[#6B7C8F] hover:text-[#0B1F33]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-4 space-y-4">
        {/* About Tab */}
        {(activeTab === "about") && (
          <>
            {/* Distance Map — show both locations when viewing another user, not own profile */}
            {!isOwnProfile && distance !== null && myProfile?.city && profileData.city && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
                <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Distance — {distance.toFixed(1)} km apart
                </h3>
                <div className="rounded-xl overflow-hidden border border-[#E6EEF6]">
                  <ServiceRadiusMap
                    address=""
                    city={profileData.city}
                    province={profileData.province}
                    postalCode={profileData.postalCode}
                    radiusKm={Math.max(Math.ceil(distance / 2), 3)}
                  />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-[#6B7C8F]">
                    <MapPin className="w-3 h-3 inline mr-0.5" />
                    You: {myProfile.city}, {myProfile.province}
                  </span>
                  <span className="text-[#4361EE] font-semibold">{distance.toFixed(1)} km</span>
                  <span className="text-[#6B7C8F]">
                    <MapPin className="w-3 h-3 inline mr-0.5" />
                    {profileData.displayName}: {profileData.city}, {profileData.province}
                  </span>
                </div>
              </div>
            )}

            {/* Service Area Map — show approximate radius, never exact address */}
            {profileData.city && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
                <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Service Area
                </h3>
                <div className="rounded-xl overflow-hidden border border-[#E6EEF6]">
                  <ServiceRadiusMap
                    address=""
                    city={profileData.city}
                    province={profileData.province}
                    postalCode={profileData.postalCode}
                    radiusKm={isOperator ? (operatorProfile.serviceRadius || 10) : 5}
                  />
                </div>
                <p className="text-xs text-[#6B7C8F] mt-2 text-center">
                  {isOperator
                    ? `Serves within ${operatorProfile.serviceRadius || 10} km of ${profileData.city}`
                    : `Located in ${profileData.city}, ${profileData.province}`}
                </p>
              </div>
            )}

            {isOperator && operatorProfile.bio && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
                <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-2">About</h3>
                <p className="text-sm text-[#0B1F33] leading-relaxed">{operatorProfile.bio}</p>
              </div>
            )}

            {isOperator && operatorProfile.equipment?.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
                <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Equipment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {operatorProfile.equipment.map((eq) => (
                    <span key={eq} className="px-3 py-1.5 bg-[#F7FAFC] border border-[#E6EEF6] rounded-full text-sm text-[#0B1F33] font-medium">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio Photos */}
            {isOperator && operatorProfile.portfolioPhotos && operatorProfile.portfolioPhotos.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
                <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Work Photos
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {operatorProfile.portfolioPhotos.map((photo, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F7FAFC]">
                      <img src={photo} alt={`Work ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client property details (visible to the client themselves and operators viewing them) */}
            {!isOperator && (isOwnProfile || myProfile?.role === "operator") && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
                <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-3">Property Details</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-[#6B7C8F]">Size:</span>{" "}
                    <span className="font-medium text-[#0B1F33] capitalize">{clientProfile.propertyDetails?.propertySize || "Not set"}</span>
                  </p>
                  <p>
                    <span className="text-[#6B7C8F]">Services:</span>{" "}
                    <span className="font-medium text-[#0B1F33]">
                      {clientProfile.propertyDetails?.serviceTypes?.map((s) => SERVICE_LABELS[s]).join(", ") || "Not set"}
                    </span>
                  </p>
                  {clientProfile.propertyDetails?.specialInstructions && (
                    <p>
                      <span className="text-[#6B7C8F]">Notes:</span>{" "}
                      <span className="font-medium text-[#0B1F33]">
                        {clientProfile.propertyDetails.specialInstructions}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Services Tab */}
        {activeTab === "services" && isOperator && (
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6">
            <h3 className="text-sm font-semibold text-[#6B7C8F] uppercase tracking-wide mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Services & Pricing (CAD)
            </h3>
            <div className="space-y-3">
              {operatorProfile.serviceTypes?.map((s) => (
                <div key={s} className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{SERVICE_EMOJI[s]}</span>
                    <span className="font-medium text-[#0B1F33]">{SERVICE_LABELS[s]}</span>
                  </div>
                  <span className="font-bold text-[#4361EE]">
                    {s === "driveway"
                      ? `$${operatorProfile.pricing?.driveway?.small || "–"} – $${operatorProfile.pricing?.driveway?.large || "–"}`
                      : s === "walkway"
                      ? `$${operatorProfile.pricing?.walkway || "–"}`
                      : `$${operatorProfile.pricing?.sidewalk || "–"}`}
                  </span>
                </div>
              ))}
            </div>
            {operatorProfile.pricing?.hourlyRate && (
              <div className="mt-4 p-4 bg-[#E8EDFD] rounded-xl text-center">
                <p className="text-sm text-[#4361EE]">Hourly Rate</p>
                <p className="text-2xl font-bold text-[#4361EE]">${operatorProfile.pricing.hourlyRate}/hr</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {/* Rating Summary */}
            {isOperator && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6 text-center">
                <p className="text-4xl font-bold text-[#0B1F33]">{operatorProfile.rating?.toFixed(1) || "0.0"}</p>
                <div className="flex justify-center mt-1">
                  <StarRating rating={operatorProfile.rating || 0} size="md" />
                </div>
                <p className="text-sm text-[#6B7C8F] mt-1">
                  Based on {reviews.length || operatorProfile.reviewCount || 0} reviews
                </p>
              </div>
            )}

            {!isOperator && reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-6 text-center">
                <p className="text-4xl font-bold text-[#0B1F33]">
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                </p>
                <div className="flex justify-center mt-1">
                  <StarRating rating={reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length} size="md" />
                </div>
                <p className="text-sm text-[#6B7C8F] mt-1">
                  Based on {reviews.length} reviews
                </p>
              </div>
            )}

            {/* Individual Reviews */}
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-2xl border border-[#E6EEF6] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-[#6B7C8F]">
                      {review.createdAt
                        ? new Date(
                            typeof review.createdAt === "object" && "seconds" in (review.createdAt as unknown as Record<string, unknown>)
                              ? ((review.createdAt as unknown as { seconds: number }).seconds * 1000)
                              : review.createdAt as unknown as string
                          ).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-[#0B1F33]">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-[#E6EEF6] p-8 text-center text-[#6B7C8F]">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No reviews yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
