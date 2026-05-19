"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Bell,
  Briefcase,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import { useWeather } from "@/context/WeatherContext";
import UserAvatar from "@/components/UserAvatar";

type NotificationItem = {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: { seconds?: number };
};

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { weather } = useWeather();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingJobCount, setPendingJobCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const isClient = profile?.role === "client";
  const simplifiedClient =
    isClient &&
    (((profile as unknown as Record<string, unknown>)?.simplifiedMode as boolean) ||
      Number((profile as unknown as Record<string, unknown>)?.age || 0) >= 55);
  const isOnline = (profile as unknown as Record<string, unknown>)?.isOnline !== false;

  const navItems = useMemo(() => {
    if (simplifiedClient) {
      return [
        { href: "/dashboard", label: "Home", icon: Home },
        { href: "/dashboard/find", label: "Book", icon: Search },
        { href: "/dashboard/log", label: "Progress", icon: ClipboardList },
        { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
      ];
    }
    if (isClient) {
      return [
        { href: "/dashboard", label: "Home", icon: Home },
        { href: "/dashboard/find", label: "Find", icon: Search },
        { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
        { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
        { href: "/dashboard/transactions", label: "Payments", icon: Briefcase },
      ];
    }
    return [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
      { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/dashboard/analytics", label: "Analytics", icon: ClipboardList },
    ];
  }, [isClient, simplifiedClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setProfileMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", profile.uid));
    return onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach((chatDoc) => {
        total += chatDoc.data().unreadCount?.[profile.uid] || 0;
      });
      setUnreadCount(total);
    });
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid || isClient) return;
    const q = query(collection(db, "jobs"), where("operatorId", "==", profile.uid), where("status", "==", "pending"));
    return onSnapshot(q, (snapshot) => setPendingJobCount(snapshot.docs.length));
  }, [profile?.uid, isClient]);

  useEffect(() => {
    if (!profile?.uid) return;
    const notifQuery = query(
      collection(db, "notifications"),
      where("uid", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(
      notifQuery,
      (snapshot) => {
        const items = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<NotificationItem, "id">),
        }));
        setNotifications(items);
      },
      (error) => {
        if (error.code !== "failed-precondition") {
          console.error("Notifications listener error:", error);
        }
      }
    );
  }, [profile?.uid]);

  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const notificationTime = (createdAt?: { seconds?: number }) => {
    if (!createdAt?.seconds) return "Just now";
    return new Date(createdAt.seconds * 1000).toLocaleString([], {
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

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((notification) => !notification.read);
    if (!unread.length) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((notification) => batch.update(doc(db, "notifications", notification.id), { read: true }));
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  };

  const handleSignOut = async () => {
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
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[288px] border-r border-[var(--border-color)] bg-white/88 px-5 py-5 backdrop-blur-xl md:flex md:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-[1.5rem] bg-[#111111] px-4 py-4 text-white">
          <Image src="/logo.png" alt="snowd logo" width={34} height={34} />
          <div>
            <div className="text-lg font-headline font-bold leading-none">snowd<span className="text-[var(--accent-sun)]">.</span></div>
            <div className="mt-1 text-xs text-white/62">Snow service network</div>
          </div>
        </Link>

        <div className="mt-4 surface-panel p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Status</div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{profile?.displayName || "Your profile"}</div>
              <div className="mt-1 text-xs capitalize text-[var(--text-muted)]">{profile?.role || "user"}</div>
            </div>
            <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
          </div>
          {weather ? (
            <div className="mt-4 rounded-[1.2rem] bg-[var(--bg-secondary)] px-3 py-3">
              <div className="text-xs text-[var(--text-muted)]">Local weather</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <span>{weather.icon}</span>
                <span>{weather.temp}°C</span>
                <span className="text-[var(--text-muted)]">{weather.condition}</span>
              </div>
            </div>
          ) : null}
        </div>

        <nav className="mt-4 flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const showMessagesCount = item.href.includes("messages") && unreadCount > 0;
            const showJobCount = item.href.includes("jobs") && pendingJobCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[#111111] text-white shadow-[0_18px_35px_rgba(18,18,18,0.18)] [&_*]:text-white"
                    : "bg-white/60 text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {showMessagesCount ? <span className={`unread-badge ${active ? "bg-white text-black" : ""}`}>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
                {showJobCount ? <span className="unread-badge bg-[#17994f]">{pendingJobCount > 9 ? "9+" : pendingJobCount}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-4" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((value) => !value)}
            className="flex w-full items-center gap-3 rounded-[1.2rem] border border-[var(--border-color)] bg-white px-4 py-3 text-left"
          >
            <Bell className="h-4 w-4" />
            <span className="flex-1 text-sm font-semibold">Notifications</span>
            {unreadNotifications > 0 ? <span className="unread-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
          </button>
          {notifOpen ? (
            <div className="absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-[1.4rem] border border-[var(--border-color)] bg-white shadow-[0_24px_50px_rgba(18,18,18,0.16)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
                <div className="text-sm font-semibold">Notifications</div>
                {unreadNotifications > 0 ? (
                  <button onClick={markAllNotificationsRead} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => markNotificationRead(notification.id)}
                      className={`w-full border-b border-[var(--border-soft)] px-4 py-3 text-left last:border-b-0 ${notification.read ? "bg-white" : "bg-[var(--accent-soft)]"}`}
                    >
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{notification.title || "Notification"}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{notification.message || "You have a new update."}</div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">{notificationTime(notification.createdAt)}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No notifications yet.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative mt-4" ref={menuRef}>
          <button
            onClick={() => setProfileMenuOpen((value) => !value)}
            className="flex w-full items-center gap-3 rounded-[1.2rem] bg-white px-4 py-3 shadow-[0_12px_24px_rgba(18,18,18,0.06)]"
          >
            <div className="relative">
              <UserAvatar
                photoURL={(profile as unknown as Record<string, string>)?.avatar}
                role={profile?.role}
                displayName={profile?.displayName}
                size={38}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 status-dot ${isOnline ? "online" : "offline"}`} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{profile?.displayName || "User"}</div>
              <div className="truncate text-xs capitalize text-[var(--text-muted)]">{profile?.role || "user"}</div>
            </div>
            <Menu className="h-4 w-4 text-[var(--text-muted)]" />
          </button>

          {profileMenuOpen ? (
            <div className="absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-[1.4rem] border border-[var(--border-color)] bg-white shadow-[0_24px_50px_rgba(18,18,18,0.16)]">
              <button onClick={toggleOnlineStatus} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-secondary)]">
                <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
                <span className="text-sm font-semibold">{isOnline ? "Go offline" : "Go online"}</span>
              </button>
              <Link href={`/dashboard/u/${profile?.uid}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]">
                <User className="h-4 w-4" />
                <span className="text-sm font-semibold">View profile</span>
              </Link>
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-semibold">Settings</span>
              </Link>
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-semibold">Sign out</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-[var(--border-color)] bg-white/88 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.png" alt="snowd logo" width={30} height={30} />
            <div>
              <div className="text-base font-headline font-bold leading-none">snowd<span className="text-[var(--accent-sun)]">.</span></div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">marketplace</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setNotifOpen((value) => !value)} className="relative rounded-full border border-[var(--border-color)] bg-white p-2">
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 ? <span className="absolute -right-1 -top-1 unread-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
            </button>
            <button onClick={() => setDrawerOpen(true)} className="rounded-full border border-[var(--border-color)] bg-white p-2">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {notifOpen ? (
        <div className="fixed right-4 top-16 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.4rem] border border-[var(--border-color)] bg-white shadow-[0_24px_50px_rgba(18,18,18,0.16)] md:hidden" ref={notifRef}>
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
            <div className="text-sm font-semibold">Notifications</div>
            {unreadNotifications > 0 ? (
              <button onClick={markAllNotificationsRead} className="text-xs font-semibold text-[var(--text-muted)]">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length ? (
              notifications.map((notification) => (
                <button key={notification.id} onClick={() => markNotificationRead(notification.id)} className="w-full border-b border-[var(--border-soft)] px-4 py-3 text-left last:border-b-0">
                  <div className="text-sm font-semibold">{notification.title || "Notification"}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{notification.message || "You have a new update."}</div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-color)] bg-white/92 px-2 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const count = item.href.includes("messages") ? unreadCount : item.href.includes("jobs") ? pendingJobCount : 0;
            return (
              <Link key={item.href} href={item.href} className={`relative flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[11px] font-semibold ${active ? "bg-[#111111] text-white [&_*]:text-white" : "text-[var(--text-muted)]"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
                {count > 0 ? <span className={`absolute right-2 top-1 unread-badge ${active ? "bg-white text-black" : ""}`}>{count > 9 ? "9+" : count}</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-[88vw] max-w-[360px] bg-white px-5 py-5 shadow-[0_30px_80px_rgba(18,18,18,0.18)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  photoURL={(profile as unknown as Record<string, string>)?.avatar}
                  role={profile?.role}
                  displayName={profile?.displayName}
                  size={42}
                />
                <div>
                  <div className="text-sm font-semibold">{profile?.displayName || "User"}</div>
                  <div className="text-xs capitalize text-[var(--text-muted)]">{profile?.role || "user"}</div>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full border border-[var(--border-color)] p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            {weather ? (
              <div className="mt-5 rounded-[1.4rem] bg-[var(--bg-secondary)] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Weather</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <span>{weather.icon}</span>
                  <span>{weather.temp}°C</span>
                  <span className="text-[var(--text-muted)]">{weather.condition}</span>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-2">
              <button onClick={toggleOnlineStatus} className="flex items-center gap-3 rounded-[1.2rem] bg-[var(--bg-secondary)] px-4 py-3 text-left">
                <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
                <span className="text-sm font-semibold">{isOnline ? "Go offline" : "Go online"}</span>
              </button>
              <Link href={`/dashboard/u/${profile?.uid}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 rounded-[1.2rem] bg-[var(--bg-secondary)] px-4 py-3">
                <User className="h-4 w-4" />
                <span className="text-sm font-semibold">View profile</span>
              </Link>
              <Link href="/dashboard/settings" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 rounded-[1.2rem] bg-[var(--bg-secondary)] px-4 py-3">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-semibold">Settings</span>
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-3 rounded-[1.2rem] bg-red-50 px-4 py-3 text-left text-red-600">
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-semibold">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
