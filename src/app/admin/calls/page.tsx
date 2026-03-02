"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  or,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Job } from "@/lib/types";
import {
  Phone,
  Search,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Mail,
  Shield,
  AlertTriangle,
  Eye,
  ChevronRight,
  RefreshCw,
  Briefcase,
  Star,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type VerifyStep = "search" | "confirm" | "verified";

const SECURITY_QUESTIONS = [
  "What is the email address on the account?",
  "What city is the address on file?",
  "What province is on the account?",
  "What is the postal code on the account?",
  "What phone number is associated with this account?",
];

export default function AdminCallsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [step, setStep] = useState<VerifyStep>("search");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checks, setChecks] = useState<Record<number, boolean | null>>({});
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [allPassed, setAllPassed] = useState(false);

  const verifyQuestions = [
    { q: SECURITY_QUESTIONS[0], answer: selected?.email || "" },
    { q: SECURITY_QUESTIONS[1], answer: selected?.city || "" },
    { q: SECURITY_QUESTIONS[2], answer: selected?.province || "" },
    { q: SECURITY_QUESTIONS[3], answer: selected?.postalCode || "" },
    { q: SECURITY_QUESTIONS[4], answer: selected?.phone || "" },
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const snap = await getDocs(collection(db, "users"));
      const term = searchTerm.toLowerCase().trim();
      const found = snap.docs
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter(u =>
          u.displayName?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.phone?.replace(/\D/g, "").includes(term.replace(/\D/g, "")) ||
          u.city?.toLowerCase().includes(term)
        );
      setResults(found.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = async (user: UserProfile) => {
    setSelected(user);
    setStep("confirm");
    setAnswers({});
    setChecks({});
    setAllPassed(false);

    // Fetch recent jobs
    setLoadingJobs(true);
    try {
      const [cSnap, oSnap] = await Promise.all([
        getDocs(query(collection(db, "jobs"), where("clientId", "==", user.uid))),
        getDocs(query(collection(db, "jobs"), where("operatorId", "==", user.uid))),
      ]);
      const all = [
        ...cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)),
        ...oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)),
      ];
      const seen = new Set<string>();
      const unique = all.filter(j => { if (seen.has(j.id)) return false; seen.add(j.id); return true; });
      unique.sort((a, b) => {
        const aT = (a.createdAt as unknown as { seconds: number })?.seconds || 0;
        const bT = (b.createdAt as unknown as { seconds: number })?.seconds || 0;
        return bT - aT;
      });
      setUserJobs(unique.slice(0, 5));
    } catch (e) { console.error(e); }
    finally { setLoadingJobs(false); }
  };

  const checkAnswer = (idx: number, input: string) => {
    const expected = verifyQuestions[idx].answer.toLowerCase().trim();
    const given = input.toLowerCase().trim().replace(/\s+/g, "");
    const exp = expected.replace(/\s+/g, "");
    // partial match also ok for address fields
    const pass = exp.length > 0 && (given.includes(exp) || exp.includes(given) || given === exp);
    setChecks(prev => ({ ...prev, [idx]: pass }));
  };

  const handleVerifyAll = () => {
    const newChecks: Record<number, boolean | null> = {};
    verifyQuestions.forEach((q, i) => {
      const input = (answers[i] || "").toLowerCase().trim().replace(/\s+/g, "");
      const exp = q.answer.toLowerCase().trim().replace(/\s+/g, "");
      newChecks[i] = exp.length > 0 && (input.includes(exp) || exp.includes(input) || input === exp);
    });
    setChecks(newChecks);
    const passed = Object.values(newChecks).filter(Boolean).length;
    setAllPassed(passed >= 3); // pass if they answer 3+ correctly
    if (passed >= 3) setStep("verified");
  };

  const toDate = (t: unknown): string => {
    if (!t) return "—";
    try {
      if (typeof t === "object" && t !== null && "seconds" in t)
        return format(new Date((t as { seconds: number }).seconds * 1000), "MMM d, yyyy");
      return format(new Date(t as string), "MMM d, yyyy");
    } catch { return "—"; }
  };

  const reset = () => {
    setStep("search");
    setSelected(null);
    setResults([]);
    setSearchTerm("");
    setAnswers({});
    setChecks({});
    setAllPassed(false);
    setUserJobs([]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Phone className="w-6 h-6 text-[#246EB9]" />
        <div>
          <h1 className="text-2xl font-bold">Call Verification</h1>
          <p className="text-sm text-gray-500">Verify caller identity before providing account assistance</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["search", "confirm", "verified"] as VerifyStep[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              step === s ? "bg-[#246EB9] text-white" :
              (["search", "confirm"].indexOf(step) > i) ? "bg-green-100 text-green-700" :
              "bg-gray-100 text-gray-500"
            }`}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
            {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
          </React.Fragment>
        ))}
        {step !== "search" && (
          <button onClick={reset} className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
            <RefreshCw className="w-3.5 h-3.5" /> New Call
          </button>
        )}
      </div>

      {/* Step 1: Search */}
      {step === "search" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Step 1: Find the Caller</h2>
          <p className="text-sm text-gray-500">Search by name, email, phone number, or city to identify the caller.</p>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Name, email, phone, or city..."
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#246EB9]/20 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className="px-5 py-3 bg-[#246EB9] text-white rounded-xl font-medium hover:bg-[#1B5A9A] transition disabled:opacity-50 text-sm"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {results.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
              {results.map(u => (
                <button
                  key={u.uid}
                  onClick={() => handleSelectUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F7FAFC] transition text-left"
                >
                  <div className="w-9 h-9 bg-[#246EB9]/10 rounded-full flex items-center justify-center text-[#246EB9] font-bold text-sm shrink-0">
                    {u.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{u.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email} · {u.city}, {u.province}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    u.role === "operator" ? "bg-purple-100 text-purple-600" : "bg-[#246EB9]/10 text-[#246EB9]"
                  }`}>{u.role}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && searchTerm && !searching && (
            <p className="text-sm text-gray-400 text-center py-4">No users found matching &quot;{searchTerm}&quot;</p>
          )}
        </div>
      )}

      {/* Step 2: Verify Identity */}
      {step === "confirm" && selected && (
        <div className="space-y-4">
          {/* Caller profile summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#246EB9]/10 rounded-full flex items-center justify-center text-[#246EB9] font-bold text-lg">
                {selected.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{selected.displayName}</p>
                <p className="text-sm text-gray-500">{selected.role} · Joined {toDate(selected.createdAt)}</p>
              </div>
              {(selected as unknown as { idVerified?: boolean }).idVerified && (
                <span className="flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  <Shield className="w-3 h-3" /> ID Verified
                </span>
              )}
            </div>

            {/* Recent jobs */}
            {loadingJobs ? (
              <p className="text-xs text-gray-400">Loading recent jobs...</p>
            ) : userJobs.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Recent Jobs</p>
                <div className="space-y-1">
                  {userJobs.slice(0, 3).map(job => (
                    <div key={job.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate flex-1 mr-2">{job.address}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium capitalize ${
                        job.status === "completed" ? "bg-green-100 text-green-700" :
                        job.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-gray-200 text-gray-600"
                      }`}>{job.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Verification questions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-[#246EB9]" />
              <h2 className="font-semibold text-gray-800">Step 2: Verify Identity</h2>
            </div>
            <p className="text-sm text-gray-500">Ask the caller these questions. Enter their answers below to verify. Need 3 out of 5 to pass.</p>

            <div className="space-y-3">
              {verifyQuestions.map((vq, i) => (
                <div key={i} className={`p-4 rounded-xl border transition ${
                  checks[i] === true ? "border-green-200 bg-green-50" :
                  checks[i] === false ? "border-red-200 bg-red-50" :
                  "border-gray-100 bg-gray-50"
                }`}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{vq.q}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={answers[i] || ""}
                      onChange={e => {
                        setAnswers(prev => ({ ...prev, [i]: e.target.value }));
                        setChecks(prev => ({ ...prev, [i]: null }));
                      }}
                      placeholder="Caller's answer..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#246EB9]/20 focus:outline-none bg-white"
                    />
                    {checks[i] === true && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                    {checks[i] === false && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleVerifyAll}
              className="w-full py-3 bg-[#246EB9] text-white rounded-xl font-semibold hover:bg-[#1B5A9A] transition"
            >
              Verify Identity
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verified — show account + actions */}
      {step === "verified" && selected && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="font-bold text-green-800">Identity Verified</p>
              <p className="text-sm text-green-700">
                You&apos;ve confirmed the caller is <strong>{selected.displayName}</strong>. You may now assist them with their account.
              </p>
            </div>
          </div>

          {/* Full account details for the call */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-[#246EB9]" /> Account Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Full Name", value: selected.displayName, icon: User },
                { label: "Email", value: selected.email, icon: Mail },
                { label: "Phone", value: selected.phone || "Not set", icon: Phone },
                { label: "City", value: selected.city || "—", icon: MapPin },
                { label: "Province", value: selected.province || "—", icon: MapPin },
                { label: "Address", value: selected.address || "Not set", icon: MapPin },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-gray-900 break-all">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {userJobs.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-gray-400" /> Recent Jobs
                </p>
                <div className="space-y-2">
                  {userJobs.map(job => (
                    <div key={job.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{job.address}</p>
                        <p className="text-xs text-gray-500">{toDate(job.createdAt)} · ${job.price} CAD · {(job.serviceTypes || []).join(", ")}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${
                        job.status === "completed" ? "bg-green-100 text-green-700" :
                        job.status === "cancelled" ? "bg-red-100 text-red-700" :
                        job.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{job.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/admin/users/${selected.uid}`}
              className="flex items-center justify-center gap-2 p-4 bg-[#246EB9] text-white rounded-2xl font-medium hover:bg-[#1B5A9A] transition"
            >
              <Eye className="w-5 h-5" /> Edit Account
            </Link>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-5 h-5" /> New Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
