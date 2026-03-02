"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  DollarSign,
  MapPin,
  Bell,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserX,
  AlertTriangle,
  CheckCircle,
  Globe,
  Percent,
  Clock,
  Wrench,
  Eye,
  EyeOff,
} from "lucide-react";

interface PlatformSettings {
  platformName: string;
  platformFee: number; // percentage (e.g., 15 = 15%)
  minimumJobPrice: number;
  maximumServiceRadius: number; // km
  maintenanceMode: boolean;
  registrationOpen: boolean;
  requireIdVerification: boolean;
  autoApproveAccounts: boolean;
  allowCashPayments: boolean;
  allowETransferPayments: boolean;
  activeProvinces: string[];
  supportEmail: string;
  maxActiveJobsPerOperator: number;
  cancellationWindowMinutes: number;
  updatedAt?: Date;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "snowd.ca",
  platformFee: 15,
  minimumJobPrice: 25,
  maximumServiceRadius: 50,
  maintenanceMode: false,
  registrationOpen: true,
  requireIdVerification: true,
  autoApproveAccounts: false,
  allowCashPayments: true,
  allowETransferPayments: true,
  activeProvinces: ["ON", "QC", "BC", "AB"],
  supportEmail: "kacperprymicz@gmail.com",
  maxActiveJobsPerOperator: 5,
  cancellationWindowMinutes: 60,
};

const ALL_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "NW Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "PEI" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dangerAction, setDangerAction] = useState<string | null>(null);
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Only allow admin (not employees)
  const isOwner = profile?.role === "admin";

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "platformSettings", "config"));
        if (docSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as PlatformSettings);
        }
      } catch (e) {
        console.error("Error loading settings:", e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!isOwner) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "platformSettings", "config"), {
        ...settings,
        updatedAt: new Date(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleProvince = (code: string) => {
    setSettings(prev => ({
      ...prev,
      activeProvinces: prev.activeProvinces.includes(code)
        ? prev.activeProvinces.filter(p => p !== code)
        : [...prev.activeProvinces, code],
    }));
  };

  // Danger zone actions
  const handleDangerAction = async () => {
    if (dangerConfirm !== "CONFIRM" || !dangerAction) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      if (dangerAction === "clear-notifications") {
        const snap = await getDocs(collection(db, "adminNotifications"));
        const batch = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(batch);
        setActionResult(`Cleared ${snap.docs.length} notifications`);
      } else if (dangerAction === "force-offline") {
        const snap = await getDocs(collection(db, "users"));
        const updates = snap.docs
          .filter(d => d.data().isOnline === true)
          .map(d => updateDoc(d.ref, { isOnline: false }));
        await Promise.all(updates);
        setActionResult(`Set ${updates.length} users offline`);
      } else if (dangerAction === "clear-support-chats") {
        const snap = await getDocs(collection(db, "supportChats"));
        const resolvedChats = snap.docs.filter(d => d.data().status === "resolved");
        await Promise.all(resolvedChats.map(d => deleteDoc(d.ref)));
        setActionResult(`Cleared ${resolvedChats.length} resolved support chats`);
      }
    } catch (e) {
      console.error("Danger action error:", e);
      setActionResult("Action failed — check console");
    } finally {
      setActionLoading(false);
      setDangerAction(null);
      setDangerConfirm("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-[#246EB9] animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Owner Only</h2>
        <p className="text-gray-500">Only the platform owner can access settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-[#246EB9]" />
          <h1 className="text-2xl font-bold">Platform Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#246EB9] text-white rounded-xl text-sm font-semibold hover:bg-[#1B5A9A] transition disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* General */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-[#246EB9]" /> General
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Platform Name</label>
            <input
              value={settings.platformName}
              onChange={e => setSettings(prev => ({ ...prev, platformName: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Support Email</label>
            <input
              value={settings.supportEmail}
              onChange={e => setSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Fees */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
          <DollarSign className="w-4 h-4 text-green-600" /> Pricing & Fees
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Platform Fee (%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={settings.platformFee}
              onChange={e => setSettings(prev => ({ ...prev, platformFee: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
            />
            <p className="text-xs text-gray-400 mt-1">The % you take from each job</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Minimum Job Price ($)</label>
            <input
              type="number"
              min={0}
              value={settings.minimumJobPrice}
              onChange={e => setSettings(prev => ({ ...prev, minimumJobPrice: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Max Service Radius (km)</label>
            <input
              type="number"
              min={1}
              max={200}
              value={settings.maximumServiceRadius}
              onChange={e => setSettings(prev => ({ ...prev, maximumServiceRadius: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
            />
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
          <Wrench className="w-4 h-4 text-purple-600" /> Feature Controls
        </h2>
        <div className="space-y-4">
          {[
            { key: "maintenanceMode" as const, label: "Maintenance Mode", desc: "Show maintenance page to all non-admin users", icon: AlertTriangle, danger: true },
            { key: "registrationOpen" as const, label: "Open Registration", desc: "Allow new users to sign up", icon: UserX },
            { key: "requireIdVerification" as const, label: "Require ID Verification", desc: "Require government ID before account is approved", icon: Shield },
            { key: "autoApproveAccounts" as const, label: "Auto-Approve Accounts", desc: "Skip manual approval — accounts go live immediately", icon: CheckCircle },
            { key: "allowCashPayments" as const, label: "Allow Cash Payments", desc: "Let users pay operators with cash", icon: DollarSign },
            { key: "allowETransferPayments" as const, label: "Allow e-Transfer Payments", desc: "Let users pay via Interac e-Transfer", icon: DollarSign },
          ].map(toggle => {
            const enabled = settings[toggle.key];
            const Icon = toggle.icon;
            return (
              <button
                key={toggle.key}
                onClick={() => setSettings(prev => ({ ...prev, [toggle.key]: !prev[toggle.key] }))}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition text-left ${
                  toggle.danger && enabled
                    ? "border-red-200 bg-red-50"
                    : enabled
                    ? "border-green-200 bg-green-50/50"
                    : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  toggle.danger && enabled ? "bg-red-100 text-red-600" : enabled ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{toggle.label}</p>
                  <p className="text-xs text-gray-500">{toggle.desc}</p>
                </div>
                {enabled ? (
                  <ToggleRight className="w-8 h-8 text-green-500 shrink-0" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Operator Limits */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-orange-500" /> Operator Limits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Max Active Jobs per Operator</label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxActiveJobsPerOperator}
              onChange={e => setSettings(prev => ({ ...prev, maxActiveJobsPerOperator: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cancellation Window (minutes)</label>
            <input
              type="number"
              min={0}
              max={1440}
              value={settings.cancellationWindowMinutes}
              onChange={e => setSettings(prev => ({ ...prev, cancellationWindowMinutes: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#246EB9]/20"
            />
            <p className="text-xs text-gray-400 mt-1">How long clients can cancel without penalty</p>
          </div>
        </div>
      </div>

      {/* Active Service Areas */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
          <MapPin className="w-4 h-4 text-red-500" /> Active Service Areas
        </h2>
        <p className="text-sm text-gray-500 mb-4">Select which provinces snowd operates in</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_PROVINCES.map(prov => {
            const active = settings.activeProvinces.includes(prov.code);
            return (
              <button
                key={prov.code}
                onClick={() => toggleProvince(prov.code)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition border ${
                  active
                    ? "bg-[#246EB9]/10 text-[#246EB9] border-[#246EB9]/20"
                    : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
                }`}
              >
                {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{prov.code}</span>
                <span className="text-xs opacity-60 truncate">{prov.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <h2 className="font-bold text-red-600 flex items-center gap-2 mb-5">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h2>
        <div className="space-y-3">
          {[
            { key: "clear-notifications", label: "Clear All Notifications", desc: "Delete all admin notifications", icon: Bell },
            { key: "force-offline", label: "Force All Users Offline", desc: "Set every user's status to offline", icon: UserX },
            { key: "clear-support-chats", label: "Clear Resolved Support Chats", desc: "Delete all resolved/closed support conversations", icon: Trash2 },
          ].map(action => {
            const Icon = action.icon;
            return (
              <div key={action.key} className="flex items-center gap-4 p-4 rounded-xl border border-red-100 bg-red-50/30">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
                <button
                  onClick={() => { setDangerAction(action.key); setDangerConfirm(""); setActionResult(null); }}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition shrink-0"
                >
                  Execute
                </button>
              </div>
            );
          })}
        </div>
        {actionResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {actionResult}
          </div>
        )}
      </div>

      {/* Danger Confirmation Modal */}
      {dangerAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDangerAction(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Are you sure?</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              This action cannot be undone. Type <strong>CONFIRM</strong> to proceed.
            </p>
            <input
              value={dangerConfirm}
              onChange={e => setDangerConfirm(e.target.value)}
              placeholder="Type CONFIRM"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 text-center font-mono mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setDangerAction(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDangerAction}
                disabled={dangerConfirm !== "CONFIRM" || actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Execute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
