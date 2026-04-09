"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileWarning,
  Headphones,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { AdminProvider, useAdminData } from "@/components/admin/AdminProvider";
import { StatusTag } from "@/components/admin/AdminUI";
import { relativeTime } from "@/lib/admin/utils";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {
    notifications,
    unreadNotifications,
    pendingVerificationCount,
    openSupportCount,
    supportUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    supportTickets,
  } = useAdminData();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [trayCollapsed, setTrayCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const resize = () => {
      setTrayCollapsed(window.innerWidth <= 1024);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const pageTitle = useMemo(() => {
    const map: Record<string, string> = {
      "/admin": "Overview",
      "/admin/users": "Users",
      "/admin/verifications": "Verifications",
      "/admin/jobs": "Jobs",
      "/admin/chats": "Chats",
      "/admin/support-chats": "Support",
      "/admin/calls": "Calls",
      "/admin/transactions": "Transactions",
      "/admin/claims": "Claims",
      "/admin/analytics": "Analytics",
      "/admin/activity": "User Activity",
      "/admin/employees": "Employees",
      "/admin/settings": "Settings",
    };
    return map[pathname] ?? "Admin";
  }, [pathname]);

  const navSections = [
    {
      title: "Platform",
      items: [
        { href: "/admin", label: "Overview", icon: Home },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck, badge: pendingVerificationCount },
        { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
      ],
    },
    {
      title: "Communication",
      items: [
        { href: "/admin/chats", label: "Chats", icon: MessageSquare },
        { href: "/admin/support-chats", label: "Support", icon: Headphones, badge: openSupportCount },
        { href: "/admin/calls", label: "Calls", icon: Phone },
      ],
    },
    {
      title: "Finance",
      items: [
        { href: "/admin/transactions", label: "Transactions", icon: DollarSign },
        { href: "/admin/claims", label: "Claims", icon: FileWarning },
      ],
    },
    {
      title: "Insights",
      items: [
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/activity", label: "User Activity", icon: Activity },
      ],
    },
    {
      title: "Admin",
      items: [
        { href: "/admin/employees", label: "Employees", icon: UserCog },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-[#F8F9FA] text-[#1A1A2E]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/35" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-white border-r border-[#E5E7EB] shadow-xl">
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <Image src="/logo.png" alt="Snowd" width={24} height={24} />
                  <span className="font-semibold text-lg">Snowd</span>
                </Link>
                <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-md hover:bg-[#F3F4F6]" aria-label="Close menu">
                  <X className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>
              <nav className="px-3 py-3 flex-1 overflow-y-auto">
                {navSections.map((section) => (
                  <div key={section.title} className="mb-4">
                    <p className="px-2 mb-1.5 text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">{section.title}</p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition ${
                              active ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280] hover:bg-[#F3F4F6]"
                            }`}
                          >
                            {active && <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#3B82F6] rounded-r" />}
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="ml-auto min-w-5 h-5 rounded-full bg-[#3B82F6] text-white text-[11px] font-semibold px-1.5 flex items-center justify-center">{item.badge}</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      )}

      <div className="min-h-dvh grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:flex border-r border-[#E5E7EB] bg-white sticky top-0 h-dvh">
          <div className="h-full w-full flex flex-col">
            <div className="px-4 py-4 border-b border-[#E5E7EB]">
              <Link href="/admin" className="flex items-center gap-2">
                <Image src="/logo.png" alt="Snowd" width={24} height={24} />
                <span className="font-semibold text-lg">Snowd</span>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626]">ADMIN</span>
              </Link>
            </div>

            <nav className="px-3 py-3 flex-1 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <p className="px-2 mb-1.5 text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">{section.title}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition ${
                            active ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280] hover:bg-[#F3F4F6]"
                          }`}
                        >
                          {active && <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#3B82F6] rounded-r" />}
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto min-w-5 h-5 rounded-full bg-[#3B82F6] text-white text-[11px] font-semibold px-1.5 flex items-center justify-center">{item.badge}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-[#E5E7EB]">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB]">
                <div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center text-xs font-bold">
                  {(profile?.displayName || "A").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{profile?.displayName || "Admin"}</p>
                  <p className="text-xs text-[#6B7280] truncate">{profile?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  className="p-1.5 rounded-md hover:bg-[#F3F4F6]"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="grid min-h-dvh" style={{ gridTemplateColumns: trayCollapsed ? "minmax(0,1fr)" : "minmax(0,1fr) 300px" }}>
            <div className="min-w-0 border-r border-[#E5E7EB]">
              <header className="h-[64px] sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-3 sm:px-4 flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] inline-flex items-center justify-center"
                  aria-label="Open menu"
                >
                  <Menu className="w-4 h-4 text-[#374151]" />
                </button>
                <h1 className="text-lg sm:text-xl font-semibold min-w-0 truncate">{pageTitle}</h1>
                <div className="relative flex-1 max-w-[560px] hidden sm:block">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users, jobs, tickets..."
                    className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] pl-9 pr-3 text-sm outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifDropdown((v) => !v)}
                      className="w-10 h-10 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] flex items-center justify-center relative"
                      aria-label="Notifications"
                    >
                      <Bell className="w-4 h-4 text-[#374151]" />
                      {unreadNotifications > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444]" />}
                    </button>
                    {showNotifDropdown && (
                      <div className="absolute right-0 mt-2 w-[min(360px,92vw)] rounded-xl border border-[#E5E7EB] bg-white shadow-xl overflow-hidden z-50">
                        <div className="px-3 py-2 border-b border-[#E5E7EB] flex items-center justify-between">
                          <p className="text-sm font-semibold">Notifications</p>
                          <button onClick={markAllNotificationsRead} className="text-xs text-[#3B82F6] font-medium">Mark all as read</button>
                        </div>
                        <div className="max-h-[380px] overflow-y-auto">
                          {notifications.slice(0, 20).map((n) => (
                            <button
                              key={n.id}
                              onClick={() => {
                                markNotificationRead(n.id);
                                setShowNotifDropdown(false);
                                router.push(n.href);
                              }}
                              className={`w-full text-left px-3 py-2.5 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] ${!n.read ? "bg-[#EFF6FF]" : "bg-white"}`}
                            >
                              <p className="text-sm text-[#1A1A2E]">{n.message}</p>
                              <p className="text-xs text-[#6B7280] mt-0.5">{relativeTime(n.createdAt)}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center text-sm font-bold">
                    {(profile?.displayName || "A").slice(0, 2).toUpperCase()}
                  </div>
                </div>
              </header>

              <main className="p-3 sm:p-4 lg:p-5 overflow-x-hidden">
                <div className="mx-auto w-full max-w-[1400px]">{children}</div>
              </main>
            </div>

            {!trayCollapsed && (
              <aside className="min-w-0 hidden xl:block">
                <header className="h-[64px] sticky top-0 z-20 bg-white border-b border-[#E5E7EB] px-4 flex items-center justify-between">
                  <h2 className="font-semibold">Live Tray</h2>
                  <button
                    onClick={() => setTrayCollapsed(true)}
                    className="w-8 h-8 rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6] flex items-center justify-center"
                    aria-label="Collapse tray"
                  >
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </button>
                </header>
                <div className="p-4 space-y-4">
                  <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">Unread Notifications</p>
                      {unreadNotifications > 0 && <StatusTag label={String(unreadNotifications)} tone="blue" />}
                    </div>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            router.push(n.href);
                          }}
                          className={`w-full text-left p-2 rounded-lg border ${!n.read ? "bg-[#EFF6FF] border-[#BFDBFE]" : "bg-white border-[#E5E7EB]"}`}
                        >
                          <p className="text-xs text-[#1A1A2E]">{n.message}</p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">{relativeTime(n.createdAt)}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">Support Queue</p>
                      <StatusTag label={String(openSupportCount)} tone="purple" />
                    </div>
                    <p className="text-xs text-[#6B7280] mb-2">Unread replies: {supportUnreadCount}</p>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {supportTickets
                        .filter((t) => t.status !== "Resolved")
                        .slice(0, 8)
                        .map((ticket) => (
                          <Link key={ticket.id} href="/admin/support-chats" className="block p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]">
                            <p className="text-sm text-[#1A1A2E] font-medium truncate">{ticket.subject}</p>
                            <div className="mt-1 flex items-center justify-between">
                              <p className="text-xs text-[#6B7280] truncate">{ticket.userName}</p>
                              <StatusTag
                                label={ticket.status}
                                tone={ticket.status === "Open" ? "red" : ticket.status === "Waiting" ? "yellow" : "green"}
                              />
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      {trayCollapsed && (
        <button
          onClick={() => setTrayCollapsed(false)}
          className="hidden xl:flex fixed right-3 top-[80px] z-40 w-9 h-9 rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] items-center justify-center"
          aria-label="Open tray"
        >
          <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
        </button>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.role !== "admin" && profile?.role !== "employee") {
        router.push("/dashboard");
      }
    }
  }, [loading, profile?.role, router, user]);

  if (loading || !user || !profile || (profile.role !== "admin" && profile.role !== "employee")) {
    return <LoadingScreen />;
  }

  return (
    <AdminProvider>
      <LayoutContent>{children}</LayoutContent>
    </AdminProvider>
  );
}
