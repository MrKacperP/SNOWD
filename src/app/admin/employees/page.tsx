"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { UserProfile, EmployeePermission } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import {
  UserCog,
  Plus,
  Trash2,
  Save,
  X,
  Shield,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

const ALL_PERMISSIONS: { key: EmployeePermission; label: string; desc: string }[] = [
  { key: "users", label: "Users", desc: "View & edit user accounts" },
  { key: "chats", label: "Chats", desc: "View support chats" },
  { key: "calls", label: "Calls", desc: "Handle incoming calls & verify identity" },
  { key: "transactions", label: "Transactions", desc: "View payment records" },
  { key: "claims", label: "Claims", desc: "Manage disputes & claims" },
  { key: "analytics", label: "Analytics", desc: "View platform analytics" },
];

const OWNER_EMAIL = "kacperprymicz@gmail.com";

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<EmployeePermission[]>([]);

  // New employee form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPerms, setNewPerms] = useState<EmployeePermission[]>(["calls", "chats"]);
  const [showPass, setShowPass] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "employee"));
        const snap = await getDocs(q);
        setEmployees(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleAddEmployee = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setAddError("All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setAddError("Password must be at least 6 characters.");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, newEmail.trim(), newPassword);
      const uid = cred.user.uid;

      // Create Firestore profile
      const employeeProfile = {
        uid,
        email: newEmail.trim(),
        displayName: newName.trim(),
        phone: "",
        role: "employee",
        onboardingComplete: true,
        province: "",
        city: "",
        postalCode: "",
        address: "",
        isOnline: false,
        themePreference: "light",
        employeePermissions: newPerms,
        addedByAdmin: user?.uid || "",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", uid), employeeProfile);
      setEmployees(prev => [...prev, { ...employeeProfile, createdAt: new Date() } as unknown as UserProfile]);

      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewPerms(["calls", "chats"]);
      setShowAdd(false);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === "auth/email-already-in-use") {
        setAddError("An account with this email already exists.");
      } else {
        setAddError(error.message || "Failed to create employee account.");
      }
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (emp: UserProfile) => {
    setEditingId(emp.uid);
    setEditPerms((emp as unknown as { employeePermissions?: EmployeePermission[] }).employeePermissions || []);
  };

  const savePerms = async (uid: string) => {
    try {
      await updateDoc(doc(db, "users", uid), { employeePermissions: editPerms });
      setEmployees(prev => prev.map(e => e.uid === uid ? { ...e, employeePermissions: editPerms } as unknown as UserProfile : e));
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const removeEmployee = async (uid: string) => {
    if (!confirm("Remove this employee? They will lose all admin access.")) return;
    try {
      await updateDoc(doc(db, "users", uid), { role: "client", employeePermissions: [] });
      setEmployees(prev => prev.filter(e => e.uid !== uid));
    } catch (e) {
      console.error(e);
    }
  };

  const togglePerm = (perm: EmployeePermission, list: EmployeePermission[], setList: (l: EmployeePermission[]) => void) => {
    setList(list.includes(perm) ? list.filter(p => p !== perm) : [...list, perm]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="w-6 h-6 text-[#246EB9]" />
          <div>
            <h1 className="text-2xl font-bold">Employee Accounts</h1>
            <p className="text-sm text-gray-500">Manage staff access to admin sections</p>
          </div>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(""); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#246EB9] text-white rounded-xl font-medium hover:bg-[#1B5A9A] transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Owner card */}
      <div className="bg-[#246EB9]/10 rounded-2xl border border-[#246EB9]/20 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#246EB9] rounded-full flex items-center justify-center text-white font-bold text-sm">
            K
          </div>
          <div>
            <p className="font-bold text-gray-900">Kacper Prymicz</p>
            <p className="text-xs text-gray-500">{OWNER_EMAIL}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Owner
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-green-500" />
          Full access to all sections. Only this account can add/remove employees.
        </p>
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Employee Account</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Full Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#246EB9]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="employee@snowd.ca"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#246EB9]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Temporary Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#246EB9]/20 focus:outline-none pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium">Section Access</label>
              <div className="space-y-2">
                {ALL_PERMISSIONS.map(p => (
                  <label key={p.key} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={newPerms.includes(p.key)}
                      onChange={() => togglePerm(p.key, newPerms, setNewPerms)}
                      className="w-4 h-4 accent-[#246EB9]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {addError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>
            )}

            <button
              onClick={handleAddEmployee}
              disabled={adding}
              className="w-full py-2.5 bg-[#246EB9] text-white rounded-xl font-medium hover:bg-[#1B5A9A] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {adding ? "Creating Account..." : <><Plus className="w-4 h-4" /> Create Employee Account</>}
            </button>
          </div>
        </div>
      )}

      {/* Employees list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <UserCog className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No employees yet</p>
          <p className="text-sm text-gray-400 mt-1">Add staff to help manage the platform.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const perms = (emp as unknown as { employeePermissions?: EmployeePermission[] }).employeePermissions || [];
            const isEditing = editingId === emp.uid;
            return (
              <div key={emp.uid} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                    {emp.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{emp.displayName}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </div>
                  <span className="text-xs font-medium bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">STAFF</span>
                </div>

                {isEditing ? (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Edit Permissions</p>
                    {ALL_PERMISSIONS.map(p => (
                      <label key={p.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPerms.includes(p.key)}
                          onChange={() => togglePerm(p.key, editPerms, setEditPerms)}
                          className="w-4 h-4 accent-[#246EB9]"
                        />
                        <span className="text-sm text-gray-700">{p.label}</span>
                      </label>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => savePerms(emp.uid)}
                        className="flex-1 py-2 bg-[#246EB9] text-white rounded-xl text-sm font-medium hover:bg-[#1B5A9A] transition flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {perms.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No permissions assigned</span>
                      ) : perms.map(p => (
                        <span key={p} className="text-xs bg-[#246EB9]/10 text-[#246EB9] px-2 py-0.5 rounded-full font-medium capitalize">{p}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(emp)}
                        className="flex-1 py-2 border border-[#246EB9]/30 text-[#246EB9] rounded-xl text-sm font-medium hover:bg-[#246EB9]/5 transition"
                      >
                        Edit Permissions
                      </button>
                      <button
                        onClick={() => removeEmployee(emp.uid)}
                        className="p-2 text-red-500 hover:bg-red-50 border border-red-100 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
