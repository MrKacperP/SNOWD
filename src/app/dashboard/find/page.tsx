"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OperatorProfile, ClientProfile, ServiceType } from "@/lib/types";
import StarRating from "@/components/StarRating";
import {
  Search,
  MapPin,
  Snowflake,
  Truck,
  GraduationCap,
  Filter,
  DollarSign,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Heart,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SERVICE_LABELS: Record<ServiceType, string> = {
  driveway: "Driveway",
  walkway: "Walkway",
  sidewalk: "Sidewalk",
  "parking-lot": "Parking Lot",
  roof: "Roof",
  other: "Other",
};

export default function FindOperatorsPage() {
  const { user, profile } = useAuth();
  const clientProfile = profile as ClientProfile;
  const router = useRouter();
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
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [existingChatModal, setExistingChatModal] = useState<{
    operator: OperatorProfile;
    chatId: string;
  } | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteOperatorId, setFavoriteOperatorId] = useState<string | null>(null);

  // Fetch operators
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "operator"),
          where("onboardingComplete", "==", true)
        );
        const snap = await getDocs(q);
        setOperators(snap.docs.map((d) => ({ ...d.data() } as OperatorProfile)));
        
        // Load user's favorites
        if (user?.uid && clientProfile) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as ClientProfile;
            setFavorites(userData.savedOperators || []);
            setFavoriteOperatorId(userData.favoriteOperatorId || null);
          }
        }
      } catch (error) {
        console.error("Error fetching operators:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, [user?.uid, clientProfile]);

  // Filter and sort
  useEffect(() => {
    let results = [...operators];

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (op) =>
          op.displayName.toLowerCase().includes(term) ||
          op.businessName?.toLowerCase().includes(term) ||
          op.city.toLowerCase().includes(term) ||
          op.bio.toLowerCase().includes(term)
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
        if (favoriteOperatorId) {
          if (a.uid === favoriteOperatorId) return -1;
          if (b.uid === favoriteOperatorId) return 1;
        }
        return b.rating - a.rating;
      });
    } else if (sortBy === "price") {
      results.sort(
        (a, b) => {
          // Favorite operator always first
          if (favoriteOperatorId) {
            if (a.uid === favoriteOperatorId) return -1;
            if (b.uid === favoriteOperatorId) return 1;
          }
          return (a.pricing?.driveway?.medium || 0) - (b.pricing?.driveway?.medium || 0);
        }
      );
    }

    setFilteredOperators(results);
  }, [operators, searchTerm, filterService, filterStudents, filterVerified, filterEquipment, sortBy, favoriteOperatorId]);

  // Book an operator — check for existing chat first
  const bookOperator = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setBooking(true);

    try {
      // Check if there's an existing chat with this operator
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const chatsSnap = await getDocs(chatsQuery);
      const existingChat = chatsSnap.docs.find((d) => {
        const data = d.data();
        return data.participants?.includes(operator.uid);
      });

      if (existingChat) {
        // Show modal to reuse chat or create new request
        setExistingChatModal({
          operator,
          chatId: existingChat.id,
        });
        setBooking(false);
        return;
      }

      // No existing chat — create new job + chat
      await createNewJobAndChat(operator);
    } catch (error) {
      console.error("Error booking operator:", error);
      setBooking(false);
    }
  };

  // Create a brand new job and chat
  const createNewJobAndChat = async (operator: OperatorProfile) => {
    if (!user?.uid || !profile) return;
    setBooking(true);

    try {
      const jobRef = await addDoc(collection(db, "jobs"), {
        clientId: user.uid,
        operatorId: operator.uid,
        status: "pending",
        serviceTypes: clientProfile?.propertyDetails?.serviceTypes || ["driveway"],
        propertySize: clientProfile?.propertyDetails?.propertySize || "medium",
        address: clientProfile?.address || "",
        city: clientProfile?.city || "",
        province: clientProfile?.province || "",
        postalCode: clientProfile?.postalCode || "",
        specialInstructions: clientProfile?.propertyDetails?.specialInstructions || "",
        scheduledDate: null,
        scheduledTime: "ASAP",
        estimatedDuration: 45,
        price:
          operator.pricing?.driveway?.[
            (clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"
          ] || 40,
        paymentMethod: "cash",
        paymentStatus: "pending",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const chatRef = await addDoc(collection(db, "chats"), {
        jobId: jobRef.id,
        participants: [user.uid, operator.uid],
        lastMessage: "Job request sent",
        lastMessageTime: Timestamp.now(),
        unreadCount: { [user.uid]: 0, [operator.uid]: 1 },
        createdAt: Timestamp.now(),
      });

      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "jobs", jobRef.id), { chatId: chatRef.id });

      await addDoc(collection(db, "messages"), {
        chatId: chatRef.id,
        senderId: "system",
        senderName: "snowd.ca",
        type: "system",
        content: `${clientProfile?.displayName} has requested snow removal service. Please discuss details and confirm the booking.`,
        read: false,
        createdAt: Timestamp.now(),
      });

      router.push(`/dashboard/messages/${chatRef.id}`);
    } catch (error) {
      console.error("Error creating job:", error);
    } finally {
      setBooking(false);
    }
  };

  // Send a new request to the same operator via existing chat
  const sendNewRequestToExistingChat = async (
    operator: OperatorProfile,
    chatId: string
  ) => {
    if (!user?.uid || !profile) return;
    setBooking(true);

    try {
      // Create a new job linked to existing chat
      const jobRef = await addDoc(collection(db, "jobs"), {
        clientId: user.uid,
        operatorId: operator.uid,
        status: "pending",
        serviceTypes: clientProfile?.propertyDetails?.serviceTypes || ["driveway"],
        propertySize: clientProfile?.propertyDetails?.propertySize || "medium",
        address: clientProfile?.address || "",
        city: clientProfile?.city || "",
        province: clientProfile?.province || "",
        postalCode: clientProfile?.postalCode || "",
        specialInstructions: clientProfile?.propertyDetails?.specialInstructions || "",
        scheduledDate: null,
        scheduledTime: "ASAP",
        estimatedDuration: 45,
        price:
          operator.pricing?.driveway?.[
            (clientProfile?.propertyDetails?.propertySize || "medium") as "small" | "medium" | "large"
          ] || 40,
        paymentMethod: "cash",
        paymentStatus: "pending",
        chatId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update the chat's jobId to the new job
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "chats", chatId), {
        jobId: jobRef.id,
        lastMessage: "New job request sent",
        lastMessageTime: Timestamp.now(),
        [`unreadCount.${operator.uid}`]: 1,
      });

      // Send system message about the new request
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: "system",
        senderName: "snowd.ca",
        type: "system",
        content: `${clientProfile?.displayName} has sent a new snow removal request. Please discuss details and confirm the booking.`,
        read: false,
        createdAt: Timestamp.now(),
      });

      setExistingChatModal(null);
      router.push(`/dashboard/messages/${chatId}`);
    } catch (error) {
      console.error("Error sending new request:", error);
    } finally {
      setBooking(false);
    }
  };

  // Toggle favorite operator
  const toggleFavorite = async (operatorId: string) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const currentFavorites = favorites.includes(operatorId)
        ? favorites.filter((id) => id !== operatorId)
        : [...favorites, operatorId];
      
      await updateDoc(userRef, {
        savedOperators: currentFavorites,
      });
      
      setFavorites(currentFavorites);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // Set favorite operator (primary)
  const setAsFavorite = async (operatorId: string) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const newFavoriteId = favoriteOperatorId === operatorId ? null : operatorId;
      
      await updateDoc(userRef, {
        favoriteOperatorId: newFavoriteId,
      });
      
      setFavoriteOperatorId(newFavoriteId);
    } catch (error) {
      console.error("Error setting favorite:", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6 text-[#4361EE]" />
            Find Snow Removal Operators
          </h1>
          <p className="text-gray-500 mt-1">
            Browse local operators in {clientProfile?.city || "your area"}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, city, or service..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl border transition flex items-center gap-2 ${
            showFilters
              ? "bg-[#4361EE]/10 border-[#4361EE]/20 text-[#4361EE]"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-5 h-5" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value as ServiceType | "all")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                <option value="all">All Services</option>
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "rating" | "price" | "distance")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                <option value="rating">Highest Rated</option>
                <option value="price">Lowest Price</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Equipment</label>
              <select
                value={filterEquipment}
                onChange={(e) => setFilterEquipment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                <option value="all">Any Equipment</option>
                <option value="Shovel">Shovel</option>
                <option value="Snow Blower">Snow Blower</option>
                <option value="Plow Truck">Plow Truck</option>
                <option value="Salt Spreader">Salt Spreader</option>
                <option value="ATV/UTV Plow">ATV/UTV Plow</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterStudents} onChange={(e) => setFilterStudents(e.target.checked)} className="w-4 h-4 rounded text-[#4361EE]" />
                <span className="text-xs text-gray-700">Students Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterVerified} onChange={(e) => setFilterVerified(e.target.checked)} className="w-4 h-4 rounded text-[#4361EE]" />
                <span className="text-xs text-gray-700">ID Verified</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Snowflake className="w-8 h-8 mx-auto mb-2 animate-spin" />
          Loading operators...
        </div>
      ) : filteredOperators.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Snowflake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No operators found</h3>
          <p className="text-gray-400 mt-1">
            Try adjusting your search or filters, or check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{filteredOperators.length} operators found</p>
          {filteredOperators.map((op) => {
            const isExpanded = expandedOperator === op.uid;
            const mediumPrice = op.pricing?.driveway?.medium || "–";
            return (
              <div
                key={op.uid}
                className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition ${
                  op.uid === favoriteOperatorId ? "border-[#4361EE] shadow-sm" : "border-gray-100"
                }`}
              >
                <div
                  className="px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedOperator(isExpanded ? null : op.uid)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 bg-[#4361EE]/20 rounded-xl flex items-center justify-center text-[#4361EE] font-bold text-xl shrink-0">
                      {op.displayName?.charAt(0)?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/u/${op.uid}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-gray-900 hover:text-[#4361EE] hover:underline transition"
                        >
                          {op.businessName || op.displayName}
                        </Link>
                        {op.uid === favoriteOperatorId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#4361EE] text-white rounded-full text-xs font-medium">
                            ⭐ Favorite
                          </span>
                        )}
                        {op.isStudent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">
                            <GraduationCap className="w-3 h-3" /> Student
                          </span>
                        )}
                        {op.verified && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                            Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <StarRating rating={op.rating} size="sm" />
                          <span className="text-xs text-gray-400">
                            ({op.reviewCount})
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {op.city}, {op.province}
                        </span>
                      </div>

                      {/* Compact pricing & equipment summary */}
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="text-green-600 font-semibold">
                          From ${mediumPrice}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500 text-xs">
                          {op.equipment?.slice(0, 2).join(", ")}{op.equipment && op.equipment.length > 2 ? ` +${op.equipment.length - 2}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsFavorite(op.uid);
                        }}
                        className="p-2 hover:bg-orange-50 rounded-lg transition"
                        title={op.uid === favoriteOperatorId ? "Remove as favorite" : "Set as favorite"}
                      >
                        <Snowflake
                          className={`w-5 h-5 ${
                            op.uid === favoriteOperatorId
                              ? "fill-[#4361EE] text-[#4361EE]"
                              : "text-gray-400"
                          }`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(op.uid);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title={favorites.includes(op.uid) ? "Remove from saved" : "Save operator"}
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            favorites.includes(op.uid)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-50">
                    <p className="text-sm text-gray-600 mt-3">{op.bio}</p>

                    {/* Services & Pricing — cleaner layout */}
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing (CAD)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {op.pricing?.driveway?.small != null && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-xs text-gray-500">Small</p>
                            <p className="font-bold text-[#4361EE]">${op.pricing.driveway.small}</p>
                          </div>
                        )}
                        {op.pricing?.driveway?.medium != null && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-xs text-gray-500">Medium</p>
                            <p className="font-bold text-[#4361EE]">${op.pricing.driveway.medium}</p>
                          </div>
                        )}
                        {op.pricing?.driveway?.large != null && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-xs text-gray-500">Large</p>
                            <p className="font-bold text-[#4361EE]">${op.pricing.driveway.large}</p>
                          </div>
                        )}
                        {op.pricing?.walkway != null && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-xs text-gray-500">Walkway</p>
                            <p className="font-bold text-[#4361EE]">${op.pricing.walkway}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Equipment — compact chips */}
                    {op.equipment && op.equipment.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Equipment</p>
                        <div className="flex flex-wrap gap-1.5">
                          {op.equipment.map((eq) => (
                            <span
                              key={eq}
                              className="text-xs bg-[#4361EE]/20 text-[#4361EE] px-2.5 py-1 rounded-full font-medium"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => bookOperator(op)}
                        disabled={booking}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#4361EE] hover:bg-[#3651D4] text-white rounded-xl font-semibold transition disabled:opacity-50 hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {booking ? "Booking..." : "Request & Chat"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Existing Chat Modal */}
      {existingChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-[#4361EE] p-5 text-white relative">
              <button
                onClick={() => setExistingChatModal(null)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-lg">Existing Conversation</h2>
              <p className="text-white/90 text-sm mt-1">
                You already have a chat with {existingChatModal.operator.businessName || existingChatModal.operator.displayName}
              </p>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() =>
                  sendNewRequestToExistingChat(
                    existingChatModal.operator,
                    existingChatModal.chatId
                  )
                }
                disabled={booking}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4361EE] hover:bg-[#3651D4] text-white rounded-xl font-semibold transition disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                {booking ? "Sending..." : "Hey, I need help again!"}
              </button>
              <button
                onClick={() => {
                  setExistingChatModal(null);
                  router.push(`/dashboard/messages/${existingChatModal.chatId}`);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                <MessageSquare className="w-4 h-4" />
                Open Existing Chat
              </button>
              <button
                onClick={() => setExistingChatModal(null)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
