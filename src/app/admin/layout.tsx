"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
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
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { AdminProvider, useAdminData } from "@/components/admin/AdminProvider";
import { StatusTag } from "@/components/admin/AdminUI";
import { relativeTime } from "@/lib/admin/utils";
import type { AdminNotification } from "@/lib/admin/types";
import "./admin.css";

function AdminNotificationContent({ notification }: { notification: AdminNotification }) {
  const title = notification.title || notification.message || "New notification";
  const context = [notification.senderName, notification.chatLabel].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-[var(--ink)]">{title}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${notification.priority === "high" ? "bg-red-50 text-red-700" : notification.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"}`}>{notification.priority}</span>
        {notification.actionRequired ? <span className="text-[10px] font-bold uppercase text-[#C2410C]">Action needed</span> : <span className="text-[10px] font-medium text-[var(--text-muted)]">Informational</span>}
      </div>
      {context ? <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-muted)]">{context}</p> : null}
      {notification.preview && notification.preview !== title ? (
        <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--text-secondary)]">{notification.preview}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{relativeTime(notification.createdAt)}</p>
    </div>
  );
}

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
    supportTickets, users, jobs, dataErrors, loading,
  } = useAdminData();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const searchResults = search.trim() ? [
    ...users.filter(u => [u.id, u.name, u.email].join(" ").toLowerCase().includes(search.toLowerCase())).map(u => ({ label: u.name, detail: u.email, href: `/admin/users/${u.id}` })),
    ...jobs.filter(j => [j.id, j.title, j.address].join(" ").toLowerCase().includes(search.toLowerCase())).map(j => ({ label: j.title, detail: j.address, href: `/admin/jobs?id=${j.id}` })),
    ...supportTickets.filter(t => [t.id, t.subject, t.userName].join(" ").toLowerCase().includes(search.toLowerCase())).map(t => ({ label: t.subject, detail: t.userName, href: `/admin/support-chats?id=${t.id}` })),
  ].slice(0, 12) : [];
  const readNotification = async (id: string) => { try { await markNotificationRead(id); } catch { setActionError("Could not save notification read status."); } };

  const [trayCollapsed, setTrayCollapsed] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const resize = () => {
      setTrayCollapsed(window.innerWidth < 1280);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const pageTitle = useMemo(() => {
    const map: Record<string, string> = {
      "/admin": "Overview",
      "/admin/reports": "Service reports",
      "/admin/notifications": "Notifications",
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
      title: "Workspace",
      items: [
        { href: "/admin", label: "Home", icon: Home },
        { href: "/admin/notifications", label: "Notifications", icon: Bell, badge: unreadNotifications },
        { href: "/admin/users", label: "Accounts", icon: Users },
        { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
        { href: "/admin/verifications", label: "Reviews", icon: ShieldCheck, badge: pendingVerificationCount },
        { href: "/admin/chats", label: "Messages", icon: MessageSquare },
        { href: "/admin/support-chats", label: "Support", icon: Headphones, badge: openSupportCount },
        { href: "/admin/transactions", label: "Payments", icon: DollarSign },
        { href: "/admin/reports", label: "Reports", icon: FileWarning },
        { href: "/admin/analytics", label: "Analytics", icon: DollarSign },
        { href: "/admin/claims", label: "Claims", icon: FileWarning },
        { href: "/admin/activity", label: "Audit history", icon: ShieldCheck },
        { href: "/admin/employees", label: "Team", icon: Users },
        { href: "/admin/calls", label: "Calls", icon: Headphones },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="admin-shell min-h-dvh bg-[var(--bg-primary)] text-[var(--ink)]">
      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/35" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-white border-r border-[var(--border)] shadow-[var(--surface-shadow)]">
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <Image src="/logo.png" alt="Snowd" width={24} height={24} />
                  <span className="font-semibold text-lg">Snowd</span>
                </Link>
                <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)]" aria-label="Close menu">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
              <nav className="px-3 py-3 flex-1 overflow-y-auto">
                {navSections.map((section) => (
                  <div key={section.title} className="mb-4">
                    <p className="px-2 mb-1.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{section.title}</p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            data-active={active}
                            className={`admin-nav-link group relative flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-sm transition ${
                              active ? "bg-[var(--bg-secondary)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                            }`}
                          >
                            {active && <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[var(--accent)] rounded-r" />}
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="ml-auto min-w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[11px] font-semibold px-1.5 flex items-center justify-center">{item.badge}</span>
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
        <aside className="admin-sidebar hidden lg:flex sticky top-0 h-dvh">
          <div className="h-full w-full flex flex-col">
            <div className="admin-sidebar-brand px-4 py-4">
              <Link href="/admin" className="flex items-center gap-2">
                <Image src="/logo.png" alt="Snowd" width={24} height={24} />
                <span className="font-semibold text-lg">Snowd</span>
              </Link>
            </div>

            <div className="mx-3 mt-3 rounded-[1.35rem] border-[3px] border-[#061321] bg-white p-3 shadow-[3px_3px_0_#061321]">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Status</p>
              <p className="mt-3 text-sm font-bold text-[var(--ink)]">SNOWD Admin</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">Operations workspace</p>
              <div className="mt-3 rounded-2xl bg-[#eaf1ee] px-3 py-2 text-xs font-semibold text-[#43574b]">Live platform data</div>
            </div>

            <nav className="px-3 py-3 flex-1 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <p className="px-2 mb-1.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{section.title}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          data-active={active}
                          className={`admin-nav-link group relative flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-sm transition ${
                            active ? "bg-[var(--bg-secondary)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                          }`}
                        >
                          {active && <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[var(--accent)] rounded-r" />}
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto min-w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[11px] font-semibold px-1.5 flex items-center justify-center">{item.badge}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="admin-sidebar-footer p-3">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-primary)] border-[3px] border-[var(--border)]">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] flex items-center justify-center text-xs font-bold">
                  {(profile?.displayName || "A").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{profile?.displayName || "Admin"}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{profile?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)]"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="grid min-h-dvh" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
            <div className="min-w-0 border-r border-[var(--border)]">
              <header className="admin-header h-[64px] sticky top-0 z-30 px-3 sm:px-4 flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-lg border-[3px] border-[var(--border)] bg-white hover:bg-[var(--bg-primary)] inline-flex items-center justify-center"
                  aria-label="Open menu"
                >
                  <Menu className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                <h1 className="text-lg sm:text-xl font-semibold min-w-0 truncate">{pageTitle}</h1>
                <div className="relative flex-1 max-w-[560px] hidden sm:block">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search accounts, jobs and support"
                    onKeyDown={e => { if (e.key === "Escape") setSearch(""); }}
                    placeholder="Search users, jobs, tickets..."
                    className="w-full h-10 rounded-lg border-[3px] border-[var(--border)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  {search.trim() && <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white border shadow-lg max-h-80 overflow-y-auto z-50">{searchResults.map(result => <Link key={result.href} href={result.href} onClick={() => setSearch("")} className="block p-3 hover:bg-[var(--ice)]"><span className="block text-sm font-semibold">{result.label}</span><span className="text-xs text-[var(--text-muted)]">{result.detail}</span></Link>)}{!searchResults.length && <p className="p-4 text-sm">No matching records.</p>}</div>}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Link href="/admin/support-chats" aria-label={`Support messages, ${supportUnreadCount} unread`} className="relative admin-secondary"><MessageSquare className="w-4 h-4" />{supportUnreadCount > 0 && <span className="text-xs font-bold">{supportUnreadCount}</span>}</Link>
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifDropdown((v) => !v)}
                      className="admin-notification-button w-10 h-10 rounded-2xl border-[3px] flex items-center justify-center relative"
                      aria-label="Notifications"
                    >
                      <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
                      {unreadNotifications > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444]" />}
                    </button>
                    {showNotifDropdown && (
                      <div className="absolute right-0 mt-2 w-[min(360px,92vw)] rounded-xl border-[3px] border-[var(--border)] bg-white shadow-[var(--surface-shadow)] overflow-hidden z-50">
                        <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
                          <Link href="/admin/notifications" onClick={() => setShowNotifDropdown(false)} className="text-sm font-semibold">All notifications →</Link>
                          <button onClick={async () => { try { await markAllNotificationsRead(); } catch { setActionError("Could not mark notifications read."); } }} className="text-xs text-[var(--accent)] font-medium">Mark all as read</button>
                        </div>
                        <div className="max-h-[380px] overflow-y-auto">
                          {!notifications.length && <p className="p-4 text-sm">You’re all caught up.</p>}
                          {notifications.slice(0, 20).map((n) => (
                            <button
                              key={n.id}
                              onClick={() => {
                                void readNotification(n.id);
                                setShowNotifDropdown(false);
                                router.push(n.href);
                              }}
                              className={`w-full text-left px-3 py-2.5 border-b border-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] ${!n.read ? "bg-[var(--bg-secondary)]" : "bg-white"}`}
                            >
                              <AdminNotificationContent notification={n} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] flex items-center justify-center text-sm font-bold">
                    {(profile?.displayName || "A").slice(0, 2).toUpperCase()}
                  </div>
                </div>
              </header>

              <main className="p-3 sm:p-5 lg:p-7 overflow-x-hidden">
                <div className="admin-content mx-auto w-full">{loading && <p role="status" className="mb-4">Loading platform records…</p>}{dataErrors.map(error => <p role="alert" key={error} className="mb-3 p-3 border border-red-200 rounded-xl text-red-700">{error}</p>)}{actionError && <p role="alert" className="text-red-700 mb-3">{actionError}</p>}<Suspense fallback={<p>Loading workspace…</p>}>{children}</Suspense></div>
              </main>
            </div>

            {!trayCollapsed && (
              <aside className="admin-live-tray min-w-0 hidden xl:block">
                <header className="h-[64px] sticky top-0 z-20 bg-white border-b border-[var(--border)] px-4 flex items-center justify-between">
                  <h2 className="font-semibold">Live Tray</h2>
                  <button
                    onClick={() => setTrayCollapsed(true)}
                    className="w-8 h-8 rounded-md border-[3px] border-[var(--border)] hover:bg-[var(--bg-secondary)] flex items-center justify-center"
                    aria-label="Collapse tray"
                  >
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </header>
                <div className="p-4 space-y-4">
                  <div className="rounded-xl border-[3px] border-[var(--border)] bg-white shadow-[var(--surface-shadow)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">Unread Notifications</p>
                      {unreadNotifications > 0 && <StatusTag label={String(unreadNotifications)} tone="blue" />}
                    </div>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {notifications.filter(n => !n.read).slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            void readNotification(n.id);
                            router.push(n.href);
                          }}
                          className={`w-full text-left p-2 rounded-lg border ${!n.read ? "bg-[var(--bg-secondary)] border-[#BFDBFE]" : "bg-white border-[var(--border)]"}`}
                        >
                          <AdminNotificationContent notification={n} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border-[3px] border-[var(--border)] bg-white shadow-[var(--surface-shadow)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">Support Queue</p>
                      <StatusTag label={String(openSupportCount)} tone="purple" />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">Unread replies: {supportUnreadCount}</p>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {supportTickets
                        .filter((t) => t.status !== "Resolved")
                        .slice(0, 8)
                        .map((ticket) => (
                          <Link key={ticket.id} href={`/admin/support-chats?id=${ticket.id}`} className="block p-2 rounded-lg border-[3px] border-[var(--border)] hover:bg-[var(--bg-primary)]">
                            <p className="text-sm text-[var(--ink)] font-medium truncate">{ticket.subject}</p>
                            <div className="mt-1 flex items-center justify-between">
                              <p className="text-xs text-[var(--text-muted)] truncate">{ticket.userName}</p>
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
          className="admin-tray-toggle hidden xl:flex fixed right-3 top-[80px] z-40 w-9 h-9 rounded-lg border-[3px] border-[var(--border)] bg-white shadow-[var(--surface-shadow)] items-center justify-center"
          aria-label="Open tray"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" />
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
