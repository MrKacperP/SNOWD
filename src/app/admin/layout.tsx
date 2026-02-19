"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Users,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Phone,
  UserCog,
  Briefcase,
  ExternalLink,
  Headphones,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.role !== "admin" && profile?.role !== "employee") {
        router.push("/dashboard");
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile || (profile.role !== "admin" && profile.role !== "employee")) {
    return <LoadingScreen />;
  }

  const isAdmin = profile.role === "admin";
  const employeePermissions = (profile as unknown as { employeePermissions?: string[] }).employeePermissions || [];

  const allNavItems = [
    { href: "/admin", label: "Overview", icon: Home, permission: null },
    { href: "/admin/users", label: "Users", icon: Users, permission: "users" },
    { href: "/admin/jobs", label: "Jobs", icon: Briefcase, permission: null },
    { href: "/admin/chats", label: "Chats", icon: MessageSquare, permission: "chats" },
    { href: "/admin/support-chats", label: "Support", icon: Headphones, permission: "chats" },
    { href: "/admin/calls", label: "Calls", icon: Phone, permission: "calls" },
    { href: "/admin/transactions", label: "Transactions", icon: DollarSign, permission: "transactions" },
    { href: "/admin/claims", label: "Claims", icon: AlertTriangle, permission: "claims" },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics" },
    ...(isAdmin ? [
      { href: "/admin/employees", label: "Employees", icon: UserCog, permission: null },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: null },
    ] : []),
  ];

  const navItems = allNavItems.filter(item =>
    isAdmin || item.permission === null || employeePermissions.includes(item.permission)
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#4361EE]" />
            <span className="text-xl font-bold text-[#4361EE]">snowd</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isAdmin ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
              {isAdmin ? "ADMIN" : "STAFF"}
            </span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                  active ? "bg-[#4361EE]/10 text-[#4361EE]" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#4361EE] hover:bg-[#4361EE]/5 transition font-medium"
          >
            <ExternalLink className="w-5 h-5" />
            View Live App
          </Link>
          <button
            onClick={async () => { try { await signOut(); } catch {} router.push("/login"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#4361EE]" />
          <span className="font-bold text-[#4361EE]">snowd</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isAdmin ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
            {isAdmin ? "ADMIN" : "STAFF"}
          </span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition ${
                active ? "text-[#4361EE]" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
