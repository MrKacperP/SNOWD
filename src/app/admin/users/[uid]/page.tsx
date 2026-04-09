"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminCard } from "@/components/admin/AdminUI";
import { useAdminData } from "@/components/admin/AdminProvider";

export default function AdminUserDetailPage() {
  const params = useParams<{ uid: string }>();
  const { users, jobs, transactions, supportTickets } = useAdminData();
  const user = users.find((u) => u.id === params.uid);

  if (!user) {
    return (
      <AdminCard className="p-6">
        <p className="text-sm text-[#6B7280]">User not found.</p>
        <Link href="/admin/users" className="text-sm text-[#3B82F6] mt-2 inline-block">Back to users</Link>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-4">
      <AdminCard className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#DBEAFE] text-[#3B82F6] text-sm font-bold flex items-center justify-center">{user.avatar}</div>
          <div>
            <p className="text-lg font-semibold text-[#1A1A2E]">{user.name}</p>
            <p className="text-sm text-[#6B7280]">{user.email}</p>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="p-5">
        <p className="font-semibold text-[#1A1A2E]">Job History</p>
        <div className="mt-2 text-sm text-[#374151] space-y-1">
          {jobs.filter((j) => j.postedBy === user.name).map((j) => (
            <p key={j.id}>{j.title}</p>
          ))}
          {jobs.filter((j) => j.postedBy === user.name).length === 0 && <p>No jobs found.</p>}
        </div>
      </AdminCard>

      <AdminCard className="p-5">
        <p className="font-semibold text-[#1A1A2E]">Transaction History</p>
        <div className="mt-2 text-sm text-[#374151] space-y-1">
          {transactions
            .filter((t) => t.fromUser === user.name || t.toUser === user.name)
            .map((t) => (
              <p key={t.id}>{t.id.toUpperCase()} • ${t.amount.toFixed(2)} • {t.status}</p>
            ))}
          {transactions.filter((t) => t.fromUser === user.name || t.toUser === user.name).length === 0 && <p>No transactions found.</p>}
        </div>
      </AdminCard>

      <AdminCard className="p-5">
        <p className="font-semibold text-[#1A1A2E]">Open Support Tickets</p>
        <div className="mt-2 text-sm text-[#374151] space-y-1">
          {supportTickets.filter((s) => s.userName === user.name && s.status !== "Resolved").map((s) => (
            <p key={s.id}>{s.subject} • {s.status}</p>
          ))}
          {supportTickets.filter((s) => s.userName === user.name && s.status !== "Resolved").length === 0 && <p>No open tickets.</p>}
        </div>
      </AdminCard>
    </div>
  );
}
