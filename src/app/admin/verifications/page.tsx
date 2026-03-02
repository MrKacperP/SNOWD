"use client";

import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { sendAdminNotif } from "@/lib/adminNotifications";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  AlertTriangle,
  BadgeCheck,
  FileText,
  Users,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type PendingUser = UserProfile & {
  idPhotoUrl?: string;
  accountApproved?: boolean;
  idVerified?: boolean;
  verificationStatus?: string;
};

export default function AdminVerificationsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotate, setLightboxRotate] = useState(0);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as PendingUser));

      // Only show operators — clients are auto-approved and don't need verification
      const operators = all.filter((u) => u.role === "operator");

      // Pending: has uploaded ID, not yet fully approved+verified
      const pending = operators.filter(
        (u) => u.idPhotoUrl && !(u.idVerified && u.accountApproved)
      );
      // Approved: id verified and account approved
      const approved = operators.filter((u) => u.idPhotoUrl && u.idVerified && u.accountApproved);

      // Sort pending oldest first (most urgent)
      const sortByDate = (a: PendingUser, b: PendingUser) => {
        const aT =
          (a.createdAt as unknown as { seconds?: number })?.seconds ||
          new Date(a.createdAt as unknown as string).getTime() / 1000 ||
          0;
        const bT =
          (b.createdAt as unknown as { seconds?: number })?.seconds ||
          new Date(b.createdAt as unknown as string).getTime() / 1000 ||
          0;
        return aT - bT;
      };

      setPendingUsers(pending.sort(sortByDate));
      setApprovedUsers(approved.sort((a, b) => sortByDate(b, a)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (uid: string) => {
    setProcessingUid(uid);
    try {
      await updateDoc(doc(db, "users", uid), {
        idVerified: true,
        accountApproved: true,
        verificationStatus: "approved",
        approvedAt: new Date(),
        verified: true,
      });

      // Send in-app notification to the operator
      await addDoc(collection(db, "notifications"), {
        uid,
        type: "account_approved",
        title: "Account Approved! 🎉",
        message: "Your ID has been verified and your account is now public. Clients can find and hire you!",
        read: false,
        createdAt: serverTimestamp(),
      });

      // Send admin notification
      const user = pendingUsers.find((u) => u.uid === uid);
      sendAdminNotif({
        type: "account_approved",
        message: `Account approved: ${user?.displayName || uid}`,
        uid,
        meta: { name: user?.displayName || "", email: user?.email || "" },
      });

      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert("Failed to approve account.");
    } finally {
      setProcessingUid(null);
    }
  };

  const handleReject = async (uid: string) => {
    setProcessingUid(uid);
    try {
      await updateDoc(doc(db, "users", uid), {
        idVerified: false,
        accountApproved: false,
        verificationStatus: "rejected",
        verified: false,
      });

      // Send in-app notification to the operator about rejection
      await addDoc(collection(db, "notifications"), {
        uid,
        type: "account_rejected",
        title: "Verification Not Approved",
        message: "Your ID verification was not approved. Please upload a clearer photo of your government ID that matches your account name.",
        read: false,
        createdAt: serverTimestamp(),
      });

      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert("Failed to reject account.");
    } finally {
      setProcessingUid(null);
    }
  };

  const toDate = (t: unknown): string => {
    if (!t) return "—";
    try {
      if (typeof t === "object" && t !== null && "seconds" in t) {
        return format(new Date((t as { seconds: number }).seconds * 1000), "MMM d, yyyy");
      }
      return format(new Date(t as string), "MMM d, yyyy");
    } catch {
      return "—";
    }
  };

  const displayList = tab === "pending" ? pendingUsers : approvedUsers;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-[#246EB9]" />
        <h1 className="text-2xl font-bold">ID Verifications</h1>
        <span className="text-sm text-gray-500">
          ({pendingUsers.length} pending)
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-amber-900">{pendingUsers.length}</p>
            <p className="text-sm text-amber-700">Awaiting Review</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <BadgeCheck className="w-8 h-8 text-green-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-green-900">{approvedUsers.length}</p>
            <p className="text-sm text-green-700">Verified & Live</p>
          </div>
        </div>
        <div className="bg-[#246EB9]/5 border border-[#246EB9]/20 rounded-2xl p-4 flex items-center gap-3">
          <Users className="w-8 h-8 text-[#246EB9] shrink-0" />
          <div>
            <p className="text-2xl font-bold text-[#246EB9]">{pendingUsers.length + approvedUsers.length}</p>
            <p className="text-sm text-[#246EB9]/70">Total IDs Uploaded</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["pending", "approved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? "bg-white text-[#246EB9] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "pending" ? `Pending (${pendingUsers.length})` : `Approved (${approvedUsers.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading verification queue...</div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          {tab === "pending" ? (
            <>
              <BadgeCheck className="w-14 h-14 text-green-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No pending ID verifications at this time.</p>
            </>
          ) : (
            <>
              <FileText className="w-14 h-14 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-700">No verified accounts yet</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((u) => (
            <div
              key={u.uid}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {/* User Header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                <div className="w-11 h-11 bg-[#246EB9]/10 rounded-full flex items-center justify-center text-[#246EB9] font-bold text-lg shrink-0">
                  {u.displayName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{u.displayName}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        u.role === "operator"
                          ? "bg-purple-100 text-purple-600"
                          : u.role === "admin"
                          ? "bg-red-100 text-red-600"
                          : "bg-[#246EB9]/10 text-[#246EB9]"
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.idVerified && u.accountApproved && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> Verified & Live
                      </span>
                    )}
                    {!u.idVerified && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Pending Verification
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {u.email} &bull; {u.city}, {u.province} &bull; Joined {toDate(u.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    href={`/admin/users/${u.uid}`}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full Profile
                  </Link>
                </div>
              </div>

              {/* ID Photo + Actions */}
              <div className="flex flex-col sm:flex-row gap-4 p-5">
                {/* ID Photo */}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Government ID
                  </p>
                  {u.idPhotoUrl ? (
                    loadErrors[u.uid] ? (
                      <div className="bg-gray-50 rounded-xl border border-gray-200 py-8 text-center">
                        <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 mb-2">Image failed to load</p>
                        <a
                          href={u.idPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#246EB9] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Open in new tab
                        </a>
                      </div>
                    ) : (
                      <div
                        className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-zoom-in group"
                        style={{ maxHeight: 260 }}
                        onClick={() => {
                          setLightboxUrl(u.idPhotoUrl!);
                          setLightboxZoom(1);
                          setLightboxRotate(0);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u.idPhotoUrl}
                          alt={`${u.displayName}'s Government ID`}
                          className="w-full object-contain"
                          style={{ maxHeight: 260 }}
                          onError={() =>
                            setLoadErrors((prev) => ({ ...prev, [u.uid]: true }))
                          }
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium text-gray-700 shadow-lg">
                            <ZoomIn className="w-4 h-4" /> Click to zoom
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No ID uploaded yet</p>
                    </div>
                  )}
                </div>

                {/* Account Details & Approve/Reject */}
                <div className="sm:w-64 shrink-0 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Account Details
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Full Name</span>
                      <span className="font-semibold text-gray-900">{u.displayName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium text-gray-900">{u.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Address</span>
                      <span className="font-medium text-gray-900 text-right max-w-[150px]">
                        {u.address || `${u.city}, ${u.province}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ID Status</span>
                      {u.idVerified ? (
                        <span className="font-semibold text-green-600">Verified</span>
                      ) : (
                        <span className="font-semibold text-amber-600">Not Verified</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account</span>
                      {u.accountApproved ? (
                        <span className="font-semibold text-green-600">Approved</span>
                      ) : (
                        <span className="font-semibold text-orange-600">Pending</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {tab === "pending" && (
                    <div className="pt-2 space-y-2">
                      <button
                        disabled={processingUid === u.uid || !u.idPhotoUrl}
                        onClick={() => handleApprove(u.uid)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {processingUid === u.uid ? "Processing..." : "Approve & Go Live"}
                      </button>
                      <button
                        disabled={processingUid === u.uid}
                        onClick={() => handleReject(u.uid)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {tab === "approved" && (
                    <div className="pt-2">
                      <button
                        disabled={processingUid === u.uid}
                        onClick={() => handleReject(u.uid)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Revoke Approval
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="absolute top-4 right-4 flex items-center gap-2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxZoom((z) => Math.min(z + 0.5, 4))}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLightboxZoom((z) => Math.max(z - 0.5, 0.5))}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLightboxRotate((r) => r + 90)}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition"
              title="Rotate"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <span className="text-white/60 text-sm font-mono mx-2">
              {Math.round(lightboxZoom * 100)}%
            </span>
            <button
              onClick={() => setLightboxUrl(null)}
              className="w-10 h-10 bg-red-500/80 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="overflow-auto max-w-full max-h-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Government ID"
              className="max-w-none transition-transform duration-200"
              style={{
                transform: `scale(${lightboxZoom}) rotate(${lightboxRotate}deg)`,
                transformOrigin: "center center",
              }}
              draggable={false}
            />
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            Click backdrop to close &bull; Use controls to zoom &amp; rotate
          </p>
        </div>
      )}
    </div>
  );
}
