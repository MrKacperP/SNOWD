"use client";
import { notificationWasViewed } from "@/lib/notificationReadState";
import CompanyIdentity from "@/components/CompanyIdentity";
import { OperatorProfile } from "@/lib/types";
import AvailabilityToggle from "@/components/dashboard/AvailabilityToggle";
import MobileNavigation from "@/components/dashboard/MobileNavigation";
import SupportChatButton from "@/components/SupportChatButton";
import { primaryNavigation } from "@/lib/appNavigation";

import { useUserChats } from "@/hooks/useUserChats";

import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useWeather } from "@/context/WeatherContext";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { db } from "@/lib/firebase";
import {
collection,
doc,
onSnapshot,
query,
updateDoc,
where,
writeBatch,
} from "firebase/firestore";
import {
Bell,
Briefcase,
CalendarDays,
CheckCheck,
LogOut,
Menu,
Settings,
User,
X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { useEffect,useRef,useState } from "react";
import { formatDistanceToNow } from "date-fns";

type NotificationItem = {
  id: string;
  chatId?: string;
  jobId?: string;
  operatorId?: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: { seconds?: number };
  preview?: string;
};

const formatNotificationTime = (createdAt?: { seconds?: number }) => {
  if (!createdAt?.seconds) return "Just now";
  return formatDistanceToNow(new Date(createdAt.seconds * 1000), { addSuffix: true });
};

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { weather } = useWeather();

  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const statusLock = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingJobCount, setPendingJobCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogFocus(drawerOpen, drawerRef);
  const notifRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notifOpen || !window.matchMedia("(max-width: 1023px)").matches) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [notifOpen]);
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const target = profileMenuOpen ? menuRef.current : notifOpen ? notifRef.current : null;
    if (!target) return;
    const frame = requestAnimationFrame(() => target.closest("aside")?.scrollTo({ top: target.offsetTop + target.offsetHeight - (target.closest("aside")?.clientHeight ?? 0), behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [profileMenuOpen, notifOpen]);

  const isClient = profile?.role === "client";
  const isOnline = profile?.role === "operator"
    ? (profile as unknown as Record<string, unknown>)?.isAvailable !== false
    : (profile as unknown as Record<string, unknown>)?.isOnline !== false;

  const navItems = primaryNavigation(profile?.role);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setProfileMenuOpen(false);
      if (![notifRef.current, mobileNotifRef.current, mobileNotifButtonRef.current].some((element) => element?.contains(event.target as Node))) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeDrawer = () => { if (desktop.matches) setDrawerOpen(false); };
    desktop.addEventListener("change", closeDrawer);
    return () => desktop.removeEventListener("change", closeDrawer);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setNotifOpen(false);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const { chats: inboxChats } = useUserChats(profile?.uid, profile?.role);
  const unreadCount = inboxChats.reduce((count, chat) => count + (chat.unreadCount?.[profile?.uid || ""] || 0), 0);

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

    );
    return onSnapshot(
      notifQuery,
      (snapshot) => {
        const items = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...(snap.data() as Omit<NotificationItem, "id">),
        }));
        setNotifications(items.filter(item => !item.read).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setNotificationError("");
      },
      (error) => {
        setNotificationError("Could not load updates. Reload the page to try again.");
        if (error.code !== "failed-precondition") {
          console.error("Notifications listener error:", error);
        }
      }
    );
  }, [profile?.uid]);

  useEffect(() => {
    const acknowledgeVisible = async () => {
      if (document.visibilityState !== "visible") return;
      const viewed = notifications.filter(item => notificationWasViewed(item, pathname)).slice(0, 450);
      if (!viewed.length) return;
      const batch = writeBatch(db);
      viewed.forEach(item => batch.update(doc(db, "notifications", item.id), { read: true }));
      try { await batch.commit(); } catch { setNotificationError("Could not clear read updates. Please reload to retry."); }
    };
    void acknowledgeVisible();
    document.addEventListener("visibilitychange", acknowledgeVisible);
    return () => document.removeEventListener("visibilitychange", acknowledgeVisible);
  }, [notifications, pathname]);

  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const notificationTitle = (notification: NotificationItem) => {
    const titles: Record<string, string> = {
      "Cash payment pending": "Cash payment needed",
      "Cash payment needed": "Cash payment needed",
      "Work completed · cash payment due": "Cash payment due",
      "Work completed": "Job complete",
      "Cash refund recorded": "Cash refund recorded",
      "Account Approved": "Account approved",
      "Verification Rejected": "Verification needs attention",
    };
    const title = notification.title?.trim();
    return title ? titles[title] || title : "New update";
  };

  const toggleOnlineStatus = async () => {
    if (!profile?.uid || statusLock.current) return;
    statusLock.current = true;
    setStatusSaving(true);
    setStatusError("");
    try {
      await updateDoc(doc(db, "users", profile.uid), { isAvailable: !isOnline });
    } catch (error) {
      console.error("Error toggling status:", error);
      setStatusError("Could not update your status. Please try again.");
    } finally {
      statusLock.current = false;
      setStatusSaving(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Failed to mark notification read:", error);
      setNotificationError("Could not mark this update as read. Please try again.");
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((notification) => !notification.read);
    if (!unread.length) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((notification) => batch.update(doc(db, "notifications", notification.id), { read: true }));
      await batch.commit();
      setNotificationError("");
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
      setNotificationError("Could not mark updates as read. Please try again.");
    }
  };

  const handleSignOut = async () => {
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
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-[248px] overflow-y-auto border-r-[3px] border-[var(--border-color)] bg-[var(--card)] px-5 py-5  lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-[1.5rem] bg-[var(--ink)] px-4 py-4 text-white">
          <Image src="/logo.png" alt="snowd logo" width={34} height={34} />
          <div>
            <div className="text-lg font-headline font-bold leading-none">snowd<span className="text-[var(--accent-sun)]">.</span></div>
            <div className="mt-1 text-xs text-white/62">Snow service network</div>
          </div>
        </Link>

        <div className="mt-4 surface-panel p-4">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Account</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0 break-words">
              <div className="text-sm font-bold text-[var(--text-primary)]"><CompanyIdentity person={profile as OperatorProfile} name={(profile as OperatorProfile)?.businessName || profile?.displayName || "Your profile"} /></div>
              <div className="mt-1 text-xs capitalize text-[var(--text-muted)]">{profile?.role || "user"}</div>
            </div>
            {profile?.role !== "operator" && <div className={`status-dot ${isOnline ? "online" : "offline"}`} />}
          </div>
          {profile?.role === "operator" && <div className="mt-3"><AvailabilityToggle online={isOnline} saving={statusSaving} error={statusError} onToggle={toggleOnlineStatus} /></div>}
          {weather ? (
            <div className="mt-4 rounded-[1.2rem] bg-[var(--bg-secondary)] px-3 py-3">
              <div className="text-xs text-[var(--text-muted)]">Local weather</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-bold">
                <span>{weather.icon}</span>
                <span>{weather.temp}°C</span>
                <span className="text-[var(--text-muted)]">{weather.condition}</span>
              </div>
            </div>
          ) : null}
        </div>

        <nav aria-label="Primary navigation" className="desktop-navigation mt-5 grid gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            const count = href.includes("messages") ? unreadCount : href.includes("jobs") ? pendingJobCount : 0;
            const tour = href === "/dashboard" ? "nav-home" : href.includes("jobs") ? "nav-jobs" : href.includes("messages") ? "nav-messages" : href.includes("calendar") ? "nav-calendar" : undefined;
            return <Link data-tour={tour} key={href} href={href} aria-current={active ? "page" : undefined}>
              <Icon size={20} aria-hidden="true" /><span className="flex-1">{label}</span>
              {count > 0 && <span className="unread-badge">{count > 9 ? "9+" : count}</span>}
            </Link>;
          })}
        </nav>

        <div className="joined-menu relative mt-4 shrink-0" ref={notifRef}>
          <button
            aria-expanded={notifOpen}
            onClick={() => { setProfileMenuOpen(false); setNotifOpen((value) => !value); }}
            className="flex w-full items-center gap-3 rounded-[1.2rem] border-[3px] border-[var(--border-color)] bg-[var(--card)] px-4 py-3 text-left"
          >
            <Bell className="h-4 w-4" />
            <span className="flex-1 text-sm font-bold">Notifications</span>
            {unreadNotifications > 0 ? <span className="unread-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
          </button>
          {notifOpen ? (
            <div className="joined-menu-panel">
              <div className="flex items-center justify-between border-b-[3px] border-[var(--border-color)] px-4 py-3">
                <div className="text-sm font-bold">Notifications</div>
                {unreadNotifications > 0 ? (
                  <button onClick={markAllNotificationsRead} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[var(--text-muted)]">
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="max-h-[min(320px,calc(100dvh-160px))] overflow-y-auto overscroll-contain">
                {notificationError && notifications.length > 0 && <p role="alert" className="p-4 text-sm text-red-700">{notificationError}</p>}
                {notifications.length ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => { markNotificationRead(notification.id); if (notification.type === "booking-invite" && notification.operatorId) { setNotifOpen(false); router.push(`/dashboard/find?operator=${encodeURIComponent(notification.operatorId)}`); } else if (notification.jobId && notification.type !== "message") { setNotifOpen(false); router.push(`/dashboard/jobs/${encodeURIComponent(notification.jobId)}`); } else if (notification.chatId) { setNotifOpen(false); router.push(`/dashboard/messages/${encodeURIComponent(notification.chatId)}`); } }}
                      aria-label={`${notification.read ? "Read" : "Unread"} notification: ${notificationTitle(notification)}`}
                      className={`w-full border-b border-[var(--border-soft)] border-l-4 px-4 py-3 text-left transition last:border-b-0 hover:bg-[var(--bg-secondary)] ${notification.read ? "border-l-transparent bg-[var(--card)]" : "border-l-[var(--accent)] bg-[var(--accent-soft)]"}`}
                    >
                      <span className="flex items-start gap-3 text-sm leading-5 text-[var(--text-primary)]">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read ? "bg-[var(--border-color)]" : "bg-[var(--accent)]"}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className={`block break-words ${notification.read ? "font-semibold" : "font-extrabold"}`}>{notificationTitle(notification)}</span>
                          {(notification.preview || notification.message) && <span className="mt-1 block line-clamp-2 text-xs font-normal leading-4 text-[var(--text-secondary)]">{notification.preview || notification.message}</span>}
                          <span className="mt-1 block text-[11px] font-normal text-[var(--text-muted)]">{formatNotificationTime(notification.createdAt)}</span>
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">{notificationError || "No notifications yet. Job and payment updates will appear here."}</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="joined-menu relative mt-4 shrink-0" ref={menuRef}>
          <button
            data-tour="profile-menu"
            aria-expanded={profileMenuOpen}
            onClick={() => { setNotifOpen(false); setProfileMenuOpen((value) => !value); }}
            className="flex w-full items-center gap-3 rounded-[1.2rem] border-[3px] border-[var(--ink)] bg-[var(--card)] px-4 py-3 shadow-[var(--surface-shadow)]"
          >
            <div className="relative">
              <UserAvatar
                logoURL={(profile as unknown as Record<string, string>)?.logoUrl} photoURL={(profile as unknown as Record<string, string>)?.avatar}
                role={profile?.role}
                displayName={profile?.displayName}
                size={38}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 status-dot ${isOnline ? "online" : "offline"}`} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-bold text-[var(--text-primary)]">{profile?.displayName || "User"}</div>
              <div className="truncate text-xs capitalize text-[var(--text-muted)]">{profile?.role || "user"}</div>
            </div>
            <Menu className="h-4 w-4 text-[var(--text-muted)]" />
          </button>

          {profileMenuOpen ? (
            <div className="joined-menu-panel">
              <Link href={`/dashboard/u/${profile?.uid}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]">
                <User className="h-4 w-4" />
                <span className="text-sm font-bold">View profile</span>
              </Link>
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-bold">Settings</span>
              </Link>
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-bold">Sign out</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b-[3px] border-[var(--border-color)] bg-[var(--card)] px-4 py-3  lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.png" alt="snowd logo" width={30} height={30} />
            <div>
              <div className="text-base font-headline font-bold leading-none">snowd<span className="text-[var(--accent-sun)]">.</span></div>
              <div className="mt-1 hidden min-[360px]:block text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">marketplace</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <SupportChatButton inline />
            <button ref={mobileNotifButtonRef} aria-label="Notifications" aria-expanded={notifOpen} onClick={() => { setDrawerOpen(false); setNotifOpen((value) => !value); }} className="relative rounded-full border-[3px] border-[var(--border-color)] bg-[var(--card)] p-2">
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 ? <span className="absolute -right-1 -top-1 unread-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}
            </button>

          </div>
        </div>
      </header>

      {notifOpen ? (
        <div className="fixed left-0 right-0 top-[69px] z-40 w-full overflow-hidden rounded-b-3xl border border-t-0 border-[var(--border-color)] bg-[var(--card)] shadow-[var(--surface-shadow)] lg:hidden" ref={mobileNotifRef}>
          <div className="flex items-center justify-between border-b-[3px] border-[var(--border-color)] px-4 py-3">
            <div className="text-sm font-bold">Notifications</div>
            {unreadNotifications > 0 ? (
              <button onClick={markAllNotificationsRead} className="min-h-11 text-xs font-bold text-[var(--text-muted)]">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(320px,calc(100dvh-160px))] overflow-y-auto overscroll-contain">
            {notificationError && notifications.length > 0 && <p role="alert" className="p-4 text-sm text-red-700">{notificationError}</p>}
                {notifications.length ? (
              notifications.map((notification) => (
                <button key={notification.id} onClick={() => { markNotificationRead(notification.id); if (notification.type === "booking-invite" && notification.operatorId) { setNotifOpen(false); router.push(`/dashboard/find?operator=${encodeURIComponent(notification.operatorId)}`); } else if (notification.jobId && notification.type !== "message") { setNotifOpen(false); router.push(`/dashboard/jobs/${encodeURIComponent(notification.jobId)}`); } else if (notification.chatId) { setNotifOpen(false); router.push(`/dashboard/messages/${encodeURIComponent(notification.chatId)}`); } }} className="w-full border-b border-[var(--border-soft)] px-4 py-3 text-left last:border-b-0">
                  <span className="flex items-center gap-3 text-sm font-semibold leading-5">
                    {!notification.read && <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />}
                    <span className="min-w-0 break-words">
                      <span className="block">{notificationTitle(notification)}</span>
                      {(notification.preview || notification.message) && <span className="mt-1 block text-xs font-normal leading-5 text-[var(--text-secondary)]">{notification.preview || notification.message}</span>}
                      <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]">{formatNotificationTime(notification.createdAt)}</span>
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">{notificationError || "No notifications yet. Job and payment updates will appear here."}</div>
            )}
          </div>
        </div>
      ) : null}

      <MobileNavigation role={profile?.role} pathname={pathname} unreadMessages={unreadCount} pendingJobs={pendingJobCount} menuOpen={drawerOpen} onOpenMenu={() => { setNotifOpen(false); setDrawerOpen(true); }} />

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div id="mobile-account-menu" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Account menu" tabIndex={-1} className="absolute bottom-0 left-0 right-0 overflow-y-auto overscroll-contain max-h-[85dvh] w-full rounded-t-3xl bg-[var(--card)] px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[var(--surface-shadow)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  logoURL={(profile as unknown as Record<string, string>)?.logoUrl} photoURL={(profile as unknown as Record<string, string>)?.avatar}
                  role={profile?.role}
                  displayName={profile?.displayName}
                  size={42}
                />
                <div>
                  <div className="text-sm font-bold">{profile?.displayName || "User"}</div>
                  <div className="text-xs capitalize text-[var(--text-muted)]">{profile?.role || "user"}</div>
                </div>
              </div>
              <button aria-label="Close account menu" onClick={() => setDrawerOpen(false)} className="rounded-full border-[3px] border-[var(--border-color)] p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
              <Link href="/dashboard/calendar" onClick={() => setDrawerOpen(false)} className="flex min-h-13 items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><CalendarDays className="h-5 w-5" /><span>Schedule</span></Link>
              <Link href="/dashboard/transactions" onClick={() => setDrawerOpen(false)} className="flex min-h-13 items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><Briefcase className="h-5 w-5" /><span>Payments</span></Link>
              {profile?.role === "operator" && <AvailabilityToggle online={isOnline} saving={statusSaving} error={statusError} onToggle={toggleOnlineStatus} />}
              <Link href={`/dashboard/u/${profile?.uid}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]">
                <User className="h-4 w-4" />
                <span className="text-sm font-bold">View profile</span>
              </Link>
              <Link href="/dashboard/settings" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-bold">Settings</span>
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-3 rounded-[1.2rem] bg-red-50 px-4 py-3 text-left text-red-600">
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-bold">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
