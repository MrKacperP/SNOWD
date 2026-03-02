"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction, UserProfile } from "@/lib/types";
import { DollarSign, Search, Pencil, Trash2, X, Check, Filter } from "lucide-react";
import { format } from "date-fns";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<(Transaction & { clientName?: string; operatorName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const snap = await getDocs(collection(db, "transactions"));
      const txList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));

      const userCache: Record<string, string> = {};
      const resolveUser = async (uid: string) => {
        if (userCache[uid]) return userCache[uid];
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          const name = userDoc.exists() ? (userDoc.data() as UserProfile).displayName || uid : uid;
          userCache[uid] = name;
          return name;
        } catch { return uid; }
      };

      const enriched = await Promise.all(txList.map(async tx => ({
        ...tx,
        clientName: await resolveUser(tx.clientId),
        operatorName: await resolveUser(tx.operatorId),
      })));

      enriched.sort((a, b) => {
        const toMs = (t: unknown) => typeof t === "object" && t !== null && "seconds" in t ? (t as { seconds: number }).seconds * 1000 : 0;
        return toMs(b.createdAt) - toMs(a.createdAt);
      });

      setTransactions(enriched);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts: unknown) => {
    try {
      if (typeof ts === "object" && ts !== null && "seconds" in ts)
        return format(new Date((ts as { seconds: number }).seconds * 1000), "MMM d, yyyy h:mm a");
    } catch {}
    return "—";
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ amount: tx.amount, status: tx.status, paymentMethod: tx.paymentMethod, tipAmount: tx.tipAmount, cashReceived: tx.cashReceived });
  };

  const handleSave = async (id: string) => {
    try {
      await updateDoc(doc(db, "transactions", id), { ...editForm });
      setEditingId(null);
      fetchTransactions();
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-700",
    held: "bg-blue-100 text-blue-700",
  };

  const filtered = transactions.filter(tx => {
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return tx.clientName?.toLowerCase().includes(term) || tx.operatorName?.toLowerCase().includes(term) || tx.id.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-[#246EB9]" />
        <h1 className="text-2xl font-bold">All Transactions</h1>
        <span className="text-sm text-gray-400">({transactions.length} total)</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client, operator, or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="held">Held</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading transactions...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tx => (
            <div key={tx.id} className="bg-white rounded-xl border border-gray-100 p-4">
              {editingId === tx.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Amount ($)</label>
                      <input type="number" value={editForm.amount || 0} onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Status</label>
                      <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as Transaction["status"] })} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="paid">Paid</option>
                        <option value="held">Held</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Payment Method</label>
                      <select value={editForm.paymentMethod || "credit"} onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value as "credit" | "cash" | "e-transfer" })} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="credit">Credit</option>
                        <option value="cash">Cash</option>
                        <option value="e-transfer">E-Transfer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Tip ($)</label>
                      <input type="number" value={editForm.tipAmount || 0} onChange={e => setEditForm({ ...editForm, tipAmount: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Cash Received ($)</label>
                      <input type="number" value={editForm.cashReceived || 0} onChange={e => setEditForm({ ...editForm, cashReceived: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                    <button onClick={() => handleSave(tx.id)} className="px-4 py-1.5 bg-[#246EB9] text-white text-sm rounded-lg hover:bg-[#3651DE]"><Check className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 font-bold shrink-0">$</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">${tx.amount?.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[tx.status] || "bg-gray-100 text-gray-600"}`}>{tx.status}</span>
                      {tx.paymentMethod && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{tx.paymentMethod}</span>}
                    </div>
                    <p className="text-sm text-gray-500">{tx.clientName} → {tx.operatorName}</p>
                    {tx.tipAmount ? <p className="text-xs text-green-600">Tip: ${tx.tipAmount.toFixed(2)}</p> : null}
                    {tx.cashReceived ? <p className="text-xs text-amber-600">Cash received: ${tx.cashReceived.toFixed(2)}</p> : null}
                    <p className="text-xs text-gray-400 mt-0.5">{formatTime(tx.createdAt)} · ID: {tx.id.slice(0, 8)}…</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEdit(tx)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#246EB9] transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(tx.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No transactions found.</div>}
        </div>
      )}
    </div>
  );
}
