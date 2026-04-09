"use client";

import React, { useState } from "react";
import { AdminCard, ConfirmModal, EmptyState, tableCell, tableHead } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

export default function AdminEmployeesPage() {
  const { employees, updateEmployeeRole, deactivateEmployee, inviteEmployee } = useAdminData();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Support Agent" as "Super Admin" | "Moderator" | "Support Agent" });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const submitInvite = () => {
    const nextErrors: { name?: string; email?: string } = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Valid email is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    inviteEmployee(form.name.trim(), form.email.trim(), form.role);
    setInviteOpen(false);
    setForm({ name: "", email: "", role: "Support Agent" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setInviteOpen(true)} className="h-10 px-4 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold">Invite New Employee</button>
      </div>

      <AdminCard className="overflow-hidden">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr>
              <th className={tableHead}>Avatar</th>
              <th className={tableHead}>Name</th>
              <th className={tableHead}>Email</th>
              <th className={tableHead}>Role</th>
              <th className={tableHead}>Status</th>
              <th className={tableHead}>Last Login</th>
              <th className={tableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-[#E5E7EB]">
                <td className={tableCell}><div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#3B82F6] text-xs font-semibold flex items-center justify-center">{emp.avatar}</div></td>
                <td className={tableCell}>{emp.name}</td>
                <td className={tableCell}>{emp.email}</td>
                <td className={tableCell}>
                  <select value={emp.role} onChange={(e) => updateEmployeeRole(emp.id, e.target.value as "Super Admin" | "Moderator" | "Support Agent")} className="h-8 px-2 rounded-md border border-[#E5E7EB] text-sm bg-white">
                    <option>Super Admin</option>
                    <option>Moderator</option>
                    <option>Support Agent</option>
                  </select>
                </td>
                <td className={tableCell}>{emp.status}</td>
                <td className={tableCell}>{emp.lastLogin}</td>
                <td className={tableCell}>
                  <button onClick={() => setDeactivateId(emp.id)} className="h-8 px-2.5 rounded-md border border-[#E5E7EB] text-xs text-[#DC2626]">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && <EmptyState title="No employees" subtitle="Invite your first internal employee." />}
      </AdminCard>

      {inviteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" onClick={() => setInviteOpen(false)}>
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative w-full max-w-md rounded-xl bg-white border border-[#E5E7EB] shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1A1A2E]">Invite Employee</h3>
            <div className="mt-4 space-y-3">
              <div>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Name"
                  className={`w-full h-10 px-3 rounded-lg border ${errors.name ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}
                />
                {errors.name && <p className="text-xs text-[#DC2626] mt-1">{errors.name}</p>}
              </div>
              <div>
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className={`w-full h-10 px-3 rounded-lg border ${errors.email ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}
                />
                {errors.email && <p className="text-xs text-[#DC2626] mt-1">{errors.email}</p>}
              </div>
              <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as "Super Admin" | "Moderator" | "Support Agent" }))} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB]">
                <option>Super Admin</option>
                <option>Moderator</option>
                <option>Support Agent</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setInviteOpen(false)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm">Cancel</button>
              <button onClick={submitInvite} className="h-9 px-3 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold">Send Invite</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deactivateId}
        title="Deactivate employee"
        description="This will set the employee account status to Inactive."
        confirmLabel="Deactivate"
        confirmTone="danger"
        onConfirm={() => {
          if (deactivateId) deactivateEmployee(deactivateId);
          setDeactivateId(null);
        }}
        onClose={() => setDeactivateId(null)}
      />
    </div>
  );
}
