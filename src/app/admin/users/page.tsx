"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { Users, Search, Edit3, Trash2, Shield, Eye, X, Save, ExternalLink } from "lucide-react";
import Link from "next/link";
import DeleteConfirmPopup from "@/components/DeleteConfirmPopup";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "client" | "operator" | "admin">("all");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFields, setEditFields] = useState<Record<string, unknown>>({});
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)).sort((a, b) => a.displayName.localeCompare(b.displayName)));
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return u.displayName?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) || u.city?.toLowerCase().includes(term);
    }
    return true;
  });

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditFields({
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      city: user.city,
      province: user.province,
      idVerified: (user as unknown as Record<string, unknown>).idVerified || false,
      accountApproved: (user as unknown as Record<string, unknown>).accountApproved || false,
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.uid), editFields);
      setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, ...editFields } as UserProfile : u));
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, "users", deletingUser.uid));
      setUsers(users.filter(u => u.uid !== deletingUser.uid));
      setDeletingUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-[#4361EE]" />
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <span className="text-sm text-gray-500">({users.length} total)</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]/20"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "client", "operator", "admin"] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${roleFilter === r ? "bg-white text-[#4361EE] shadow-sm" : "text-gray-500"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading users...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {filtered.map(user => (
            <div key={user.uid} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition">
              <div className="w-10 h-10 bg-[#4361EE]/10 rounded-full flex items-center justify-center text-[#4361EE] font-bold shrink-0">
                {user.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === "admin" ? "bg-red-100 text-red-600" :
                    user.role === "operator" ? "bg-purple-100 text-purple-600" :
                    "bg-[#4361EE]/10 text-[#4361EE]"
                  }`}>{user.role}</span>
                  <span className="text-xs text-gray-400">{user.city}, {user.province}</span>
                  {(user as unknown as Record<string, unknown>).accountApproved === false && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Pending Approval</span>
                  )}
                  {(user as unknown as Record<string, unknown>).idVerified === true && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">ID Verified</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Link href={`/dashboard/u/${user.uid}`} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition" title="View public profile">
                  <Eye className="w-4 h-4" />
                </Link>
                <Link href={`/admin/users/${user.uid}`} className="p-2 text-[#4361EE] hover:bg-[#4361EE]/10 rounded-lg transition" title="Full edit mode">
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button onClick={() => handleEdit(user)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition" title="Quick edit">
                  <Edit3 className="w-4 h-4" />
                </button>
                {user.role !== "admin" && (
                  <button onClick={() => setDeletingUser(user)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmPopup
        isOpen={!!deletingUser}
        onConfirm={handleDelete}
        onCancel={() => setDeletingUser(null)}
        title="Delete this user?"
        itemName={deletingUser ? `${deletingUser.displayName} (${deletingUser.email})` : undefined}
        message="This will permanently remove this user and all their associated data from the platform."
        loading={deleteLoading}
      />

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {[
              { key: "displayName", label: "Display Name" },
              { key: "phone", label: "Phone" },
              { key: "city", label: "City" },
              { key: "province", label: "Province" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type="text"
                  value={(editFields[key] as string) || ""}
                  onChange={e => setEditFields({ ...editFields, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#4361EE]/20 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select
                value={(editFields.role as string) || "client"}
                onChange={e => setEditFields({ ...editFields, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="client">Client</option>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(editFields.accountApproved)}
                onChange={e => setEditFields({ ...editFields, accountApproved: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Account Approved</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(editFields.idVerified)}
                onChange={e => setEditFields({ ...editFields, idVerified: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">ID Verified</span>
            </label>
            <button onClick={handleSave} className="w-full py-2.5 bg-[#4361EE] text-white rounded-xl font-medium hover:bg-[#3651D4] transition flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
