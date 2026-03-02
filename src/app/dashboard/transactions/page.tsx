"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction, ServiceType } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  Filter,
  Calendar,
  ArrowLeft,
  Banknote,
  CreditCard,
  HandCoins,
  ExternalLink,
  Settings,
  Loader2,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SERVICE_LABELS: Record<ServiceType, string> = {
  driveway: "Driveway",
  walkway: "Walkway",
  sidewalk: "Sidewalk",
  "parking-lot": "Parking Lot",
  roof: "Roof",
  other: "Other",
};

type FilterStatus = "all" | "held" | "paid" | "refunded" | "cancelled";

import { OperatorProfile } from "@/lib/types";

export default function TransactionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [stripeLoading, setStripeLoading] = useState(false);

  const isOperator = profile?.role === "operator";

  const handleManageStripe = async () => {
    if (!profile?.uid) return;
    setStripeLoading(true);
    try {
      const accountId = (profile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId;
      if (!accountId) {
        // Navigate to settings to set up Stripe (in-app navigation)
        router.push("/dashboard/settings?tab=payment");
        return;
      }
      const res = await fetch("/api/stripe/account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.onboardingUrl;
    } catch (error) {
      console.error("Stripe redirect error:", error);
      alert("Failed to open Stripe dashboard. Please try again.");
    } finally {
      setStripeLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.uid) return;

    const field = isOperator ? "operatorId" : "clientId";

    // Try with orderBy first, fallback without
    const q = query(
      collection(db, "transactions"),
      where(field, "==", profile.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txns = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Transaction[];
        setTransactions(txns);
        setLoading(false);
      },
      (error) => {
        console.error("Transaction listener error:", error);
        // Fallback without orderBy
        const fallbackQ = query(
          collection(db, "transactions"),
          where(field, "==", profile.uid)
        );
        onSnapshot(fallbackQ, (snapshot) => {
          const txns = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const aTime = (a as Transaction).createdAt;
              const bTime = (b as Transaction).createdAt;
              const toMs = (t: unknown) => {
                if (!t) return 0;
                if (typeof t === "object" && t !== null && "seconds" in t)
                  return (t as { seconds: number }).seconds * 1000;
                return new Date(t as string).getTime();
              };
              return toMs(bTime) - toMs(aTime);
            }) as Transaction[];
          setTransactions(txns);
          setLoading(false);
        });
      }
    );

    return () => unsubscribe();
  }, [profile?.uid, isOperator]);

  const formatDate = (ts: unknown): string => {
    if (!ts) return "";
    try {
      if (typeof ts === "object" && ts !== null && "toDate" in ts)
        return format((ts as Timestamp).toDate(), "MMM d, yyyy");
      if (typeof ts === "object" && ts !== null && "seconds" in ts)
        return format(new Date((ts as { seconds: number }).seconds * 1000), "MMM d, yyyy");
      if (typeof ts === "string") return format(new Date(ts), "MMM d, yyyy");
      if (ts instanceof Date) return format(ts, "MMM d, yyyy");
    } catch {}
    return "";
  };

  const filteredTransactions = transactions.filter(
    (t) => filter === "all" || t.status === filter
  );

  // Stats
  const totalEarned = transactions
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalHeld = transactions
    .filter((t) => t.status === "held")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRefunded = transactions
    .filter((t) => t.status === "refunded")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalCash = transactions
    .filter((t) => t.paymentMethod === "cash" && t.status === "paid")
    .reduce((sum, t) => sum + (t.cashReceived || t.amount || 0), 0);
  const totalTips = transactions
    .reduce((sum, t) => sum + (t.tipAmount || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-[#6B7C8F] gap-3">
        <div className="animate-spin-slow">
          <Image src="/logo.svg" alt="Loading" width={40} height={40} />
        </div>
        <p className="text-sm">Loading transactions...</p>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-[#0B1F33]">
            {isOperator ? "Earnings" : "Payment History"}
          </h1>
        </div>
        {isOperator && (
          <button
            onClick={handleManageStripe}
            disabled={stripeLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#246EB9]/10 text-[#246EB9] rounded-xl text-sm font-semibold hover:bg-[#246EB9]/20 transition disabled:opacity-50"
          >
            {stripeLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            Manage Stripe
          </button>
        )}
      </div>

      {/* Stripe Setup Banner — shown for operators who haven't connected Stripe */}
      {isOperator && !(profile as OperatorProfile & { stripeConnectAccountId?: string })?.stripeConnectAccountId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-amber-900">Set Up Payments to Get Paid</h3>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                Connect your bank account with Stripe so clients can pay you directly — and you can receive payouts.
              </p>
            </div>
          </div>
          <button
            onClick={handleManageStripe}
            disabled={stripeLoading}
            className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition disabled:opacity-50"
          >
            {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {stripeLoading ? "Setting up..." : "Connect Stripe & Get Paid"}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#E6EEF6] p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-[#6B7C8F]">{isOperator ? "Earned" : "Paid"}</span>
          </div>
          <p className="text-xl font-bold text-green-600">${(totalEarned / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6EEF6] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-[#6B7C8F]">Held</span>
          </div>
          <p className="text-xl font-bold text-yellow-600">${(totalHeld / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6EEF6] p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-[#6B7C8F]">Refunded</span>
          </div>
          <p className="text-xl font-bold text-red-500">${(totalRefunded / 100).toFixed(2)}</p>
        </div>
        {isOperator && (
          <>
            <div className="bg-white rounded-2xl border border-[#E6EEF6] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-[#6B7C8F]">Cash Received</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">${(totalCash / 100).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6EEF6] p-4">
              <div className="flex items-center gap-2 mb-1">
                <HandCoins className="w-4 h-4 text-[#246EB9]" />
                <span className="text-xs font-medium text-[#6B7C8F]">Tips</span>
              </div>
              <p className="text-xl font-bold text-[#246EB9]">${(totalTips / 100).toFixed(2)}</p>
            </div>
          </>
        )}
      </div>

      {/* Earnings Analytics Chart */}
      {isOperator && transactions.filter(t => t.status === "paid").length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E6EEF6] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#0B1F33] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#246EB9]" />
              Earnings (14 days)
            </h2>
            <span className="text-xs text-[#6B7C8F]">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              ${(totalEarned / 100).toFixed(2)} total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={(() => {
              const now = Date.now();
              const days: Record<string, number> = {};
              for (let i = 13; i >= 0; i--) {
                days[format(subDays(now, i), "MMM d")] = 0;
              }
              transactions.forEach((tx) => {
                if (tx.status !== "paid") return;
                const ts = tx.createdAt;
                const ms = typeof ts === "object" && ts !== null && "seconds" in ts
                  ? (ts as { seconds: number }).seconds * 1000
                  : ts instanceof Date ? ts.getTime() : new Date(ts as string).getTime();
                if (ms > now - 14 * 86400000) {
                  const key = format(new Date(ms), "MMM d");
                  if (days[key] !== undefined) days[key] += (tx.amount || 0) / 100;
                }
              });
              return Object.entries(days).map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Earnings"]} />
              <Area type="monotone" dataKey="amount" stroke="#246EB9" fill="#246EB9" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stripe Portal Link for Operators */}
      {isOperator && (
        <div className="bg-[#246EB9]/5 rounded-2xl border border-[#246EB9]/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#246EB9]/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#246EB9]" />
              </div>
              <div>
                <p className="font-semibold text-[#0B1F33] text-sm">Stripe Dashboard</p>
                <p className="text-xs text-[#6B7C8F]">View payouts, bank details & tax info</p>
              </div>
            </div>
            <button
              onClick={handleManageStripe}
              disabled={stripeLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#246EB9] text-white rounded-xl text-sm font-semibold hover:bg-[#1B5A9A] transition disabled:opacity-50"
            >
              {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Open Stripe
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-[#6B7C8F] shrink-0" />
        {(["all", "held", "paid", "refunded", "cancelled"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === f
                ? "bg-[#246EB9] text-white"
                : "bg-[#F7FAFC] text-[#6B7C8F] hover:bg-[#E6EEF6]"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E6EEF6] p-12 text-center">
            <DollarSign className="w-10 h-10 mx-auto text-[#E6EEF6] mb-3" />
            <p className="text-[#6B7C8F] text-sm font-medium">
              {filter === "all" ? "No transactions yet" : `No ${filter} transactions`}
            </p>
            <p className="text-xs text-[#6B7C8F] mt-1">
              Transactions will appear here when payments are made
            </p>
          </div>
        ) : (
          filteredTransactions.map((txn) => (
            <Link
              key={txn.id}
              href={txn.chatId ? `/dashboard/messages/${txn.chatId}` : "#"}
              className="block bg-white rounded-2xl border border-[#E6EEF6] p-4 hover:shadow-md transition group"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    txn.status === "paid"
                      ? "bg-green-50 text-green-600"
                      : txn.status === "held"
                      ? "bg-yellow-50 text-yellow-600"
                      : txn.status === "refunded"
                      ? "bg-red-50 text-red-500"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isOperator ? (
                    <ArrowDownRight className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-[#0B1F33] truncate">
                      {isOperator ? txn.clientName || "Client" : txn.operatorName || "Operator"}
                    </p>
                    <p className={`text-sm font-bold ${
                      txn.status === "paid" ? "text-green-600" :
                      txn.status === "held" ? "text-yellow-600" :
                      txn.status === "refunded" ? "text-red-500" :
                      "text-gray-400"
                    }`}>
                      {isOperator ? "+" : "-"}${((txn.amount || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-[#6B7C8F] truncate mb-1">
                    {txn.description || txn.serviceTypes?.map((s) => SERVICE_LABELS[s]).join(", ") || "Snow removal"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[#6B7C8F]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(txn.createdAt)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        txn.status === "paid"
                          ? "bg-green-50 text-green-600"
                          : txn.status === "held"
                          ? "bg-yellow-50 text-yellow-600"
                          : txn.status === "refunded"
                          ? "bg-red-50 text-red-500"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {txn.status}
                    </span>
                    {txn.paymentMethod && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        {txn.paymentMethod === "cash" ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {txn.paymentMethod}
                      </span>
                    )}
                  </div>
                  {(txn.tipAmount || txn.cashReceived) && (
                    <div className="flex items-center gap-3 text-xs mt-1">
                      {txn.tipAmount ? (
                        <span className="text-[#246EB9] font-medium">Tip: ${(txn.tipAmount / 100).toFixed(2)}</span>
                      ) : null}
                      {txn.cashReceived ? (
                        <span className="text-emerald-600 font-medium">Cash: ${(txn.cashReceived / 100).toFixed(2)}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
