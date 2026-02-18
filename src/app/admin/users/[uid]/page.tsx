"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Job, Transaction } from "@/lib/types";
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Phone,
  Mail,
  Shield,
  Star,
  Briefcase,
  DollarSign,
  MessageSquare,
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  BadgeCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminEditUserPage() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"profile" | "jobs" | "transactions" | "documents">("profile");

  // Editable fields
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = { uid: snap.id, ...snap.data() } as UserProfile;
          setUser(data);
          setFields({
            displayName: data.displayName || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "client",
            city: data.city || "",
            province: data.province || "",
            postalCode: data.postalCode || "",
            address: data.address || "",
            idVerified: (data as unknown as Record<string, unknown>).idVerified || false,
            isOnline: data.isOnline || false,
            bio: (data as unknown as Record<string, unknown>).bio || "",
            businessName: (data as unknown as Record<string, unknown>).businessName || "",
            serviceRadius: (data as unknown as Record<string, unknown>).serviceRadius || 0,
            rating: (data as unknown as Record<string, unknown>).rating || 0,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [uid]);

  useEffect(() => {
    if (tab === "jobs") {
      const fetchJobs = async () => {
        try {
          const [clientSnap, opSnap] = await Promise.all([
            getDocs(query(collection(db, "jobs"), where("clientId", "==", uid))),
            getDocs(query(collection(db, "jobs"), where("operatorId", "==", uid))),
          ]);
          const all = [
            ...clientSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)),
            ...opSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)),
          ];
          // deduplicate
          const seen = new Set<string>();
          setJobs(all.filter(j => { if (seen.has(j.id)) return false; seen.add(j.id); return true; }).sort((a, b) => {
            const aT = (a.createdAt as unknown as { seconds: number })?.seconds || 0;
            const bT = (b.createdAt as unknown as { seconds: number })?.seconds || 0;
            return bT - aT;
          }));
        } catch (e) { console.error(e); }
      };
      fetchJobs();
    } else if (tab === "transactions") {
      const fetchTxns = async () => {
        try {
          const [cSnap, oSnap] = await Promise.all([
            getDocs(query(collection(db, "transactions"), where("clientId", "==", uid))),
            getDocs(query(collection(db, "transactions"), where("operatorId", "==", uid))),
          ]);
          const all = [
            ...cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)),
            ...oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)),
          ];
          const seen = new Set<string>();
          setTransactions(all.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; }).sort((a, b) => {
            const aT = (a.createdAt as unknown as { seconds: number })?.seconds || 0;
            const bT = (b.createdAt as unknown as { seconds: number })?.seconds || 0;
            return bT - aT;
          }));
        } catch (e) { console.error(e); }
      };
      fetchTxns();
    }
  }, [tab, uid]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), fields);
      setUser(prev => prev ? { ...prev, ...fields } as UserProfile : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const toDate = (t: unknown): string => {
    if (!t) return "—";
    try {
      if (typeof t === "object" && t !== null && "seconds" in t) {
        return format(new Date((t as { seconds: number }).seconds * 1000), "MMM d, yyyy");
      }
      return format(new Date(t as string), "MMM d, yyyy");
    } catch { return "—"; }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-gray-400">Loading user...</div>;
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-red-500">User not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/users")}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-[#4361EE]/10 rounded-full flex items-center justify-center text-[#4361EE] font-bold text-xl">
            {user.displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.displayName}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                user.role === "operator" ? "bg-purple-100 text-purple-600" :
                user.role === "admin" ? "bg-red-100 text-red-600" :
                "bg-[#4361EE]/10 text-[#4361EE]"
              }`}>{user.role}</span>
              <span className="text-xs text-gray-400">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Preview link */}
        <Link
          href={`/dashboard/u/${uid}`}
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition"
        >
          <Eye className="w-4 h-4" /> Public Profile
        </Link>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
            saved
              ? "bg-green-100 text-green-700"
              : "bg-[#4361EE] text-white hover:bg-[#3249D6]"
          }`}
        >
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : saving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {/* Admin Edit Banner */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">Admin Edit Mode — Changes are applied directly to this user&apos;s account.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(["profile", "jobs", "transactions", "documents"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition ${tab === t ? "bg-white text-[#4361EE] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "displayName", label: "Display Name", icon: User },
              { key: "email", label: "Email", icon: Mail },
              { key: "phone", label: "Phone", icon: Phone },
              { key: "address", label: "Address", icon: MapPin },
              { key: "city", label: "City", icon: MapPin },
              { key: "province", label: "Province", icon: MapPin },
              { key: "postalCode", label: "Postal Code", icon: MapPin },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {label}
                </label>
                <input
                  type="text"
                  value={(fields[key] as string) || ""}
                  onChange={e => setFields({ ...fields, [key]: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE]/20 focus:outline-none"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Role
              </label>
              <select
                value={(fields.role as string) || "client"}
                onChange={e => setFields({ ...fields, role: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE]/20 focus:outline-none"
              >
                <option value="client">Client</option>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>

          {/* Operator-specific fields */}
          {(user.role === "operator" || (fields.role as string) === "operator") && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-purple-500" /> Operator Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "businessName", label: "Business Name" },
                  { key: "serviceRadius", label: "Service Radius (km)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                    <input
                      type="text"
                      value={(fields[key] as string) || ""}
                      onChange={e => setFields({ ...fields, [key]: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE]/20 focus:outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={(fields.rating as number) || 0}
                    onChange={e => setFields({ ...fields, rating: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE]/20 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bio</label>
                <textarea
                  value={(fields.bio as string) || ""}
                  onChange={e => setFields({ ...fields, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4361EE]/20 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            {[
              { key: "idVerified", label: "ID Verified", desc: "Mark this user as identity-verified" },
              { key: "isOnline", label: "Online", desc: "Force online/offline status" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setFields({ ...fields, [key]: !fields[key] })}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${fields[key] ? "bg-[#4361EE]" : "bg-gray-200"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${fields[key] ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Account info */}
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-3 text-sm text-gray-500">
            <div><span className="font-medium text-gray-700">UID:</span> <span className="font-mono text-xs break-all">{user.uid}</span></div>
            <div><span className="font-medium text-gray-700">Joined:</span> {toDate(user.createdAt)}</div>
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {tab === "jobs" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No jobs found for this user.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.map(job => (
                <div key={job.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 text-sm">{job.address}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      job.status === "completed" ? "bg-green-100 text-green-700" :
                      job.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                      job.status === "cancelled" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{job.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-3">
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />CAD {job.price}</span>
                    <span>{toDate(job.createdAt)}</span>
                    <span>{(job.serviceTypes || []).join(", ")}</span>
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Link href={`/dashboard/messages/${job.chatId}`} className="text-xs text-[#4361EE] hover:underline flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> View Chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (() => {
        const raw = user as unknown as Record<string, unknown>;
        const idPhoto = raw.idPhotoUrl as string | undefined;
        const transcript = raw.studentTranscriptUrl as string | undefined;
        const isStudent = raw.isStudent as boolean | undefined;
        const isVerified = fields.idVerified as boolean;

        return (
          <div className="space-y-4">
            {/* ID Photo */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4361EE]" /> Government ID
                </h3>
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" /> Not Verified
                    </span>
                  )}
                </div>
              </div>

              {idPhoto ? (
                <>
                  <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 mb-4" style={{ maxHeight: 340 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={idPhoto}
                      alt="Government ID"
                      className="w-full object-contain max-h-80"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={idPhoto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#4361EE] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open full size
                    </a>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => {
                          setFields({ ...fields, idVerified: true });
                          setTimeout(handleSave, 100);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve ID
                      </button>
                      <button
                        onClick={() => {
                          setFields({ ...fields, idVerified: false });
                          setTimeout(handleSave, 100);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No ID document uploaded yet.</p>
                  <p className="text-xs mt-1">The user has not submitted their government ID.</p>
                </div>
              )}
            </div>

            {/* Student Transcript */}
            {(isStudent || transcript) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-500" /> Student Transcript
                  </h3>
                  {(raw.studentVerified as boolean) ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified Student
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                </div>

                {transcript ? (
                  <>
                    <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 mb-4" style={{ maxHeight: 340 }}>
                      {/* Try as image first; if it's a PDF the link below handles it */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={transcript}
                        alt="Student Transcript"
                        className="w-full object-contain max-h-80"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={transcript}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#4361EE] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View document
                      </a>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={async () => {
                            await updateDoc(doc(db, "users", uid), { studentVerified: true });
                            setUser(prev => prev ? { ...prev, studentVerified: true } as unknown as UserProfile : prev);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition"
                        >
                          <BadgeCheck className="w-4 h-4" /> Verify Student
                        </button>
                        <button
                          onClick={async () => {
                            await updateDoc(doc(db, "users", uid), { studentVerified: false });
                            setUser(prev => prev ? { ...prev, studentVerified: false } as unknown as UserProfile : prev);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">User marked as student but no transcript uploaded yet.</p>
                  </div>
                )}
              </div>
            )}

            {!idPhoto && !transcript && !isStudent && (
              <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
                No documents to review for this user.
              </div>
            )}
          </div>
        );
      })()}

      {/* Transactions Tab */}
      {tab === "transactions" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No transactions found for this user.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map(txn => (
                <div key={txn.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{txn.paymentMethod || "Payment"}</p>
                    <p className="text-xs text-gray-500">{toDate(txn.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${txn.amount} CAD</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      txn.status === "paid" ? "bg-green-100 text-green-700" :
                      txn.status === "refunded" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{txn.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
