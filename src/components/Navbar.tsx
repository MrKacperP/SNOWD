"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Home,
  MessageSquare,
  Search,
  Settings,
  Menu,
  X,
  LogOut,
  DollarSign,
  User,
  ChevronUp,
  BarChart3,
  CalendarDays,
  Briefcase,
  Bell,
  CheckCheck,
  ClipboardList,
} from "lucide-react";
import { useWeather } from "@/context/WeatherContext";
import UserAvatar from "@/components/UserAvatar";

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingJobCount, setPendingJobCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{
    id: string;
    type?: string;
    title?: string;
    message?: string;
    read?: boolean;
    createdAt?: { seconds?: number };
  }[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifDesktopRef = useRef<HTMLDivElement>(null);
  const notifMobileRef = useRef<HTMLDivElement>(null);
  const { weather } = useWeather();

  const isClient = profile?.role === "client";
  const simplifiedClient = isClient && (((profile as unknown as Record<string, unknown>)?.simplifiedMode as boolean) || Number((profile as unknown as Record<string, unknown>)?.age || 0) >= 55);
  const isOnline = (profile as unknown as Record<string, unknown>)?.isOnline !== false;
  const getTourKey = (href: string) => {
    if (href === "/dashboard") return "nav-home";
    if (href === "/dashboard/find") return "nav-find";
    if (href === "/dashboard/log") return "nav-jobs";
    if (href === "/dashboard/jobs") return "nav-jobs";
    if (href === "/dashboard/messages") return "nav-messages";
    if (href === "/dashboard/calendar") return "nav-calendar";
    return undefined;
  };

  const navItems = simplifiedClient
    ? [
        { href: "/dashboard", label: "Home", icon: Home },
        { href: "/dashboard/find", label: "Book", icon: Search },
        { href: "/dashboard/log", label: "Progress", icon: ClipboardList },
        { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
      ]
    : isClient
    ? [
        { href: "/dashboard", label: "Home", icon: Home },
        { href: "/dashboard/find", label: "Find", icon: Search },
        { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
        { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
        { href: "/dashboard/transactions", label: "Payments", icon: DollarSign },
      ]
    : [
        { href: "/dashboard", label: "Home", icon: Home },
        { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
        { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
        { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      const clickedOutsideDesktop =
        notifDesktopRef.current && !notifDesktopRef.current.contains(e.target as Node);
      const clickedOutsideMobile =
        notifMobileRef.current && !notifMobileRef.current.contains(e.target as Node);
      if (clickedOutsideDesktop && clickedOutsideMobile) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", profile.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const count = data.unreadCount?.[profile.uid] || 0;
        total += count;
      });
      setUnreadCount(total);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  // Listen for pending job notifications (operators)
  useEffect(() => {
    if (!profile?.uid || isClient) return;
    const q = query(
      collection(db, "jobs"),
      where("operatorId", "==", profile.uid),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingJobCount(snapshot.docs.length);
    });
    return () => unsubscribe();
  }, [profile?.uid, isClient]);

  useEffect(() => {
    if (!profile?.uid) return;

    const notifQuery = query(
      collection(db, "notifications"),
      where("uid", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      notifQuery,
      (snapshot) => {
        const items = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<(typeof notifications)[number], "id">),
        }));
        setNotifications(items);
      },
      (error) => {
        if (error.code !== "failed-precondition") {
          console.error("Notifications listener error:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  };

  const notificationTime = (createdAt?: { seconds?: number }) => {
    if (!createdAt?.seconds) return "Just now";
    const d = new Date(createdAt.seconds * 1000);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const toggleOnlineStatus = async () => {
    if (!profile?.uid) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), { isOnline: !isOnline });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleSignOut = async () => {
    // Fire-and-forget the isOnline update so it never blocks logout
    if (profile?.uid) {
      updateDoc(doc(db, "users", profile.uid), { isOnline: false }).catch(() => {});
    }
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      router.push("/login");
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-card-solid)]/90 backdrop-blur-xl border-r border-[var(--border-color)] min-h-screen fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-[var(--border-color)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="snowd logo" width={34} height={34} />
            <span className="text-xl font-extrabold text-[var(--accent)]">
              snowd<span className="font-light text-gray-400">.ca</span>
            </span>
          </Link>
          {weather && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-[var(--accent-soft)] rounded-xl text-xs">
              <span className="text-lg">{weather.icon}</span>
              <div>
                <span className="font-bold text-gray-900">{weather.temp}°C</span>
                <span className="text-gray-500 ml-1">{weather.condition}</span>
                {weather.snowChance > 0 && (
                  <span className="ml-1.5 text-[var(--accent)] font-semibold">❄️{weather.snowChance}%</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 relative" ref={notifDesktopRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] hover:bg-[var(--bg-secondary)] transition text-sm font-semibold text-[var(--text-primary)]"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4 text-[var(--accent)]" />
              Notifications
              {unreadNotifications > 0 && (
                <span className="ml-auto unread-badge">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden z-50">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-color)]">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Notifications</p>
                  {unreadNotifications > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-xs text-[var(--text-muted)] text-center">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`w-full text-left px-3 py-2.5 border-b border-[var(--border-color)]/60 hover:bg-[var(--bg-secondary)] transition last:border-0 ${
                          n.read ? "opacity-80" : "bg-[var(--accent-soft)]/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent)] shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{n.title || "Notification"}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{n.message || "You have a new update."}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">{notificationTime(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const isMessages = item.href.includes("messages");
            const isJobs = item.href.includes("jobs");
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={getTourKey(item.href)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold tracking-wide relative ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {isMessages && unreadCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 unread-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {isJobs && pendingJobCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-[5px] rounded-[9px] flex items-center justify-center shadow-md shadow-orange-500/30">
                    {pendingJobCount > 9 ? "9+" : pendingJobCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t border-[var(--border-color)] relative" ref={menuRef}>
          {profileMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[var(--bg-card-solid)] backdrop-blur-xl rounded-xl border border-[var(--border-color)] shadow-lg overflow-hidden z-50">
              <button
                onClick={toggleOnlineStatus}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition text-left"
              >
                <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {isOnline ? "Online" : "Offline"}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  Tap to {isOnline ? "go offline" : "go online"}
                </span>
              </button>
              <div className="border-t border-gray-100" />
              <Link
                href={`/dashboard/u/${profile?.uid}`}
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition"
              >
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">View Profile</span>
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition"
              >
                <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Settings</span>
              </Link>
              <div className="border-t border-gray-100" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">Sign Out</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            data-tour="profile-menu"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition"
          >
            <div className="relative">
              <UserAvatar
                photoURL={(profile as unknown as Record<string, string>)?.avatar}
                role={profile?.role}
                displayName={profile?.displayName}
                size={36}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 status-dot ${isOnline ? "online" : "offline"}`} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {profile?.displayName || "User"}
              </p>
              <p className="text-xs text-[var(--text-secondary)] capitalize">{profile?.role || "user"}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${profileMenuOpen ? "" : "rotate-180"}`} />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-[var(--bg-card-solid)]/90 backdrop-blur-xl border-b border-[var(--border-color)] z-30 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="snowd logo" width={28} height={28} />
          <span className="text-lg font-extrabold text-[var(--accent)]">
            snowd<span className="font-light text-[var(--text-muted)]">.ca</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative" ref={notifMobileRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-card-solid)] relative"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 unread-badge" style={{ minWidth: "16px", height: "16px", fontSize: "9px", padding: "0 4px" }}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-card-solid)] rounded-2xl border border-[var(--border-color)] shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-color)]">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Notifications</p>
                  {unreadNotifications > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-xs text-[var(--text-muted)] text-center">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`w-full text-left px-3 py-2.5 border-b border-[var(--border-color)]/60 hover:bg-[var(--bg-secondary)] transition last:border-0 ${
                          n.read ? "opacity-80" : "bg-[var(--accent-soft)]/50"
                        }`}
                      >
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{n.title || "Notification"}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{n.message || "You have a new update."}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">{notificationTime(n.createdAt)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {weather && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[var(--accent-soft)] rounded-lg text-xs">
              <span>{weather.icon}</span>
              <span className="font-bold text-[var(--text-primary)]">{weather.temp}°</span>
            </div>
          )}
          <Link href={`/dashboard/u/${profile?.uid}`} className="relative">
            <UserAvatar
              photoURL={(profile as unknown as Record<string, string>)?.avatar}
              role={profile?.role}
              displayName={profile?.displayName}
              size={32}
            />
            <div className={`absolute -bottom-0.5 -right-0.5 status-dot ${isOnline ? "online" : "offline"}`} style={{ width: 8, height: 8 }} />
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-500">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-[var(--bg-card-solid)] backdrop-blur-xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-4">
              <button onClick={() => setMobileOpen(false)} className="p-1 text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-[var(--accent-soft)] rounded-xl">
              <div className="relative">
                <UserAvatar
                  photoURL={(profile as unknown as Record<string, string>)?.avatar}
                  role={profile?.role}
                  displayName={profile?.displayName}
                  size={40}
                />
                <div className={`absolute -bottom-0.5 -right-0.5 status-dot ${isOnline ? "online" : "offline"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{profile?.displayName || "User"}</p>
                <p className="text-xs text-[var(--text-secondary)] capitalize">{profile?.role || "user"}</p>
              </div>
            </div>

            <button
              onClick={toggleOnlineStatus}
              className="w-full flex items-center gap-3 px-4 py-2.5 mb-4 rounded-xl hover:bg-[var(--bg-secondary)] transition"
            >
              <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
              <span className="text-sm font-medium text-[var(--text-primary)]">{isOnline ? "Online" : "Offline"}</span>
            </button>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                const isMessages = item.href.includes("messages");
                const isJobs = item.href.includes("jobs");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={getTourKey(item.href)}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold tracking-wide relative ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                    {isMessages && unreadCount > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 unread-badge">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    {isJobs && pendingJobCount > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-[5px] rounded-[9px] flex items-center justify-center shadow-md shadow-orange-500/30">
                        {pendingJobCount > 9 ? "9+" : pendingJobCount}
                      </span>
                    )}
                  </Link>
                );
              })}
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold tracking-wide ${
                  pathname === "/dashboard/settings"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </nav>

              <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition font-semibold"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card-solid)]/90 backdrop-blur-xl border-t border-[var(--border-color)] z-30 flex safe-area-bottom">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const isMessages = item.href.includes("messages");
          const isJobs = item.href.includes("jobs");
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={getTourKey(item.href)}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-semibold transition-all duration-200 relative ${
                active ? "text-[var(--accent)]" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
              {isMessages && unreadCount > 0 && (
                <span className="absolute top-0.5 left-1/2 translate-x-1 unread-badge" style={{ fontSize: '9px', minWidth: '16px', height: '16px' }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {isJobs && pendingJobCount > 0 && (
                <span className="absolute top-0.5 left-1/2 translate-x-1 bg-orange-500 text-white font-bold rounded-full flex items-center justify-center shadow-md shadow-orange-500/30" style={{ fontSize: '9px', minWidth: '16px', height: '16px', padding: '0 4px' }}>
                  {pendingJobCount > 9 ? "9+" : pendingJobCount}
                </span>
              )}
              {active && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--accent)] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
