"use client";

import React, { useState } from "react";
import { AdminCard, ConfirmModal } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

export default function AdminSettingsPage() {
  const { settings, setSettings } = useAdminData();
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dangerAction, setDangerAction] = useState<"delete-verifications" | "wipe-test-data" | null>(null);
  const [dangerText, setDangerText] = useState("");

  const validateGeneral = () => {
    const next: Record<string, string> = {};
    if (!settings.siteName.trim()) next.siteName = "Site name is required";
    if (!settings.supportEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail)) {
      next.supportEmail = "Valid support email is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validatePassword = () => {
    const next: Record<string, string> = {};
    if (!passwordForm.current) next.current = "Current password required";
    if (passwordForm.next.length < 8) next.next = "New password must be at least 8 characters";
    if (passwordForm.next !== passwordForm.confirm) next.confirm = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveGeneral = () => {
    if (!validateGeneral()) return;
  };

  const saveSecurity = () => {
    if (!validatePassword()) return;
    setPasswordForm({ current: "", next: "", confirm: "" });
  };

  return (
    <div className="space-y-4">
      <AdminCard className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1A2E]">General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-[#374151]">Site name</label>
            <input
              value={settings.siteName}
              onChange={(e) => setSettings((prev) => ({ ...prev, siteName: e.target.value }))}
              className={`mt-1 w-full h-10 px-3 rounded-lg border ${errors.siteName ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}
            />
            {errors.siteName && <p className="text-xs text-[#DC2626] mt-1">{errors.siteName}</p>}
          </div>
          <div>
            <label className="text-sm text-[#374151]">Support email</label>
            <input
              value={settings.supportEmail}
              onChange={(e) => setSettings((prev) => ({ ...prev, supportEmail: e.target.value }))}
              className={`mt-1 w-full h-10 px-3 rounded-lg border ${errors.supportEmail ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}
            />
            {errors.supportEmail && <p className="text-xs text-[#DC2626] mt-1">{errors.supportEmail}</p>}
          </div>
        </div>
        <div className="max-w-[300px]">
          <label className="text-sm text-[#374151]">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[#E5E7EB]"
          >
            <option>America/Toronto</option>
            <option>America/Vancouver</option>
            <option>America/New_York</option>
          </select>
        </div>
        <button onClick={saveGeneral} className="h-9 px-3 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold">Save</button>
      </AdminCard>

      <AdminCard className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1A2E]">Notifications</h2>
        <div className="space-y-2 text-sm">
          {[
            { key: "newVerification", label: "New verification" },
            { key: "newClaim", label: "New claim" },
            { key: "newSupportTicket", label: "New support ticket" },
            { key: "largeTransaction", label: "Large transaction flagged" },
          ].map((entry) => {
            const key = entry.key as keyof typeof settings.notifications;
            return (
              <label key={entry.key} className="flex items-center justify-between p-2 rounded-lg border border-[#E5E7EB]">
                <span>{entry.label}</span>
                <input
                  type="checkbox"
                  checked={settings.notifications[key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, [key]: e.target.checked },
                    }))
                  }
                />
              </label>
            );
          })}
        </div>
      </AdminCard>

      <AdminCard className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1A2E]">Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <input
              type="password"
              placeholder="Current password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))}
              className={`w-full h-10 px-3 rounded-lg border ${errors.current ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}
            />
            {errors.current && <p className="text-xs text-[#DC2626] mt-1">{errors.current}</p>}
          </div>
          <div>
            <input
              type="password"
              placeholder="New password"
              value={passwordForm.next}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, next: e.target.value }))}
              className={`w-full h-10 px-3 rounded-lg border ${errors.next ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}
            />
            {errors.next && <p className="text-xs text-[#DC2626] mt-1">{errors.next}</p>}
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
              className={`w-full h-10 px-3 rounded-lg border ${errors.confirm ? "border-[#DC2626]" : "border-[#E5E7EB]"}`}
            />
            {errors.confirm && <p className="text-xs text-[#DC2626] mt-1">{errors.confirm}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.twoFactorEnabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, twoFactorEnabled: e.target.checked }))}
            />
            Enable 2FA
          </label>
          <select
            value={settings.sessionTimeout}
            onChange={(e) => setSettings((prev) => ({ ...prev, sessionTimeout: e.target.value as "15 min" | "30 min" | "1 hour" }))}
            className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm"
          >
            <option>15 min</option>
            <option>30 min</option>
            <option>1 hour</option>
          </select>
          <button onClick={saveSecurity} className="h-9 px-3 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold">Update Security</button>
        </div>
      </AdminCard>

      <AdminCard className="p-4 space-y-3 border-[#FCA5A5]">
        <h2 className="text-lg font-semibold text-[#B91C1C]">Danger Zone</h2>
        <p className="text-sm text-[#6B7280]">These actions are destructive and require confirmation.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDangerAction("delete-verifications")} className="h-9 px-3 rounded-lg bg-[#DC2626] text-white text-sm font-semibold">Delete all pending verifications</button>
          <button onClick={() => setDangerAction("wipe-test-data")} className="h-9 px-3 rounded-lg bg-[#B91C1C] text-white text-sm font-semibold">Wipe test data</button>
        </div>
      </AdminCard>

      {dangerAction && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center px-4" onClick={() => { setDangerAction(null); setDangerText(""); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1A1A2E]">Confirm destructive action</h3>
            <p className="text-sm text-[#6B7280] mt-2">Type <span className="font-semibold text-[#DC2626]">DELETE</span> to continue.</p>
            <input value={dangerText} onChange={(e) => setDangerText(e.target.value)} className={`mt-3 w-full h-10 px-3 rounded-lg border ${dangerText && dangerText !== "DELETE" ? "border-[#DC2626]" : "border-[#E5E7EB]"}`} />
            {dangerText && dangerText !== "DELETE" && <p className="text-xs text-[#DC2626] mt-1">You must type DELETE exactly.</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setDangerAction(null); setDangerText(""); }} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm">Cancel</button>
              <button disabled={dangerText !== "DELETE"} onClick={() => { setDangerAction(null); setDangerText(""); }} className="h-9 px-3 rounded-lg bg-[#DC2626] text-white text-sm font-semibold disabled:opacity-50">Execute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
