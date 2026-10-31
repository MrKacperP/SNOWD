"use client";
import IconSwap from "@/components/ui/IconSwap";

import { useNotifications } from "@/context/NotificationContext";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import CompanyIdentity from "@/components/CompanyIdentity";
import { OperatorProfile } from "@/lib/types";
import AvailabilityToggle from "@/components/dashboard/AvailabilityToggle";
import MobileNavigation from "@/components/dashboard/MobileNavigation";
import { desktopNavigation } from "@/lib/appNavigation";


import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useWeather } from "@/context/WeatherContext";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import {
Bell,
CalendarDays,
CircleDollarSign,
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
  const { unreadNotifications, unreadMessages: unreadCount, pendingJobs: pendingJobCount, centerOpen, setCenterOpen } = useNotifications();

  const menuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogFocus(drawerOpen, drawerRef);
  const isOnline = profile?.role === "operator"
    ? (profile as unknown as Record<string, unknown>)?.isAvailable !== false
    : (profile as unknown as Record<string, unknown>)?.isOnline !== false;

  const navItems = desktopNavigation(profile?.role);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

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
      <aside className="dashboard-sidebar fixed left-0 top-0 z-30 hidden h-dvh w-[248px] overflow-y-auto border-r border-[var(--border-color)] bg-[var(--card)] px-5 py-5  lg:flex lg:flex-col">
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
            return <Link data-tour={tour} key={href} href={href} aria-current={active ? "page" : undefined}><IconSwap icon={<Icon size={20} aria-hidden="true" />}>
              <Icon size={20} aria-hidden="true" /><span className="flex-1">{label}</span>
              <UnreadBadge count={count} label={`${count} ${href.includes("jobs") ? "awaiting attention" : "unread"}`} />
            </IconSwap></Link>;
          })}
        </nav>

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={centerOpen}
          onClick={() => { setProfileMenuOpen(false); setCenterOpen(true); }}
          className="notif-trigger mt-4"
          data-unread={unreadNotifications > 0}
        ><IconSwap icon={<Bell className="h-4 w-4" />}>
          <span className="notif-trigger-icon"><Bell className="h-4 w-4" aria-hidden="true" /></span>
          <span className="flex-1 text-sm font-bold">Notifications</span>
          <UnreadBadge count={unreadNotifications} label={`${unreadNotifications} unread notifications`} />
        </IconSwap></button>

        <div className="joined-menu relative mt-4 shrink-0" ref={menuRef}>
          <button
            data-tour="profile-menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((value) => !value)}
            className="flex w-full items-center gap-3 rounded-[1.2rem] border border-[var(--ink)] bg-[var(--card)] px-4 py-3 shadow-[var(--surface-shadow)]"
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
            <div className="joined-menu-panel glass-readable-overlay">
              {profile?.role === "operator" && <div className="border-b border-[var(--border-soft)] px-4 py-3"><AvailabilityToggle online={isOnline} saving={statusSaving} error={statusError} onToggle={toggleOnlineStatus} /></div>}
              <Link href={`/dashboard/u/${profile?.uid}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><IconSwap icon={<User className="h-4 w-4" />}>
                <User className="h-4 w-4" />
                <span className="text-sm font-bold">View profile</span>
              </IconSwap></Link>
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><IconSwap icon={<Settings className="h-4 w-4" />}>
                <Settings className="h-4 w-4" />
                <span className="text-sm font-bold">Settings</span>
              </IconSwap></Link>
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50"><IconSwap icon={<LogOut className="h-4 w-4" />}>
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-bold">Sign out</span>
              </IconSwap></button>
            </div>
          ) : null}
        </div>
      </aside>

      <MobileNavigation role={profile?.role} pathname={pathname} unreadMessages={unreadCount} pendingJobs={pendingJobCount} unreadNotifications={unreadNotifications} menuOpen={drawerOpen} onOpenMenu={() => setDrawerOpen(true)} />

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div id="mobile-account-menu" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Account menu" tabIndex={-1} className="glass-readable-overlay absolute bottom-0 left-0 right-0 overflow-y-auto overscroll-contain max-h-[85dvh] w-full rounded-t-3xl px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[var(--surface-shadow)]" onClick={(event) => event.stopPropagation()}>
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
              <button aria-label="Close account menu" onClick={() => setDrawerOpen(false)} className="rounded-full border border-[var(--border-color)] p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <button type="button" className="notif-trigger mt-5" data-unread={unreadNotifications > 0} onClick={() => { setDrawerOpen(false); setCenterOpen(true); }}>
              <span className="notif-trigger-icon"><Bell className="h-4 w-4" aria-hidden="true" /></span>
              <span className="flex-1 text-left text-sm font-bold">Notifications</span>
              <UnreadBadge count={unreadNotifications} label={`${unreadNotifications} unread notifications`} />
            </button>

            <div className="mt-5 grid divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
              <Link href="/dashboard/calendar" onClick={() => setDrawerOpen(false)} className="flex min-h-13 items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><IconSwap icon={<CalendarDays className="h-5 w-5" />}><CalendarDays className="h-5 w-5" /><span>Schedule</span></IconSwap></Link>
              <Link href="/dashboard/transactions" onClick={() => setDrawerOpen(false)} className="flex min-h-13 items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><IconSwap icon={<CircleDollarSign className="h-5 w-5" />}><CircleDollarSign className="h-5 w-5" /><span>Payments</span></IconSwap></Link>
              {profile?.role === "operator" && <AvailabilityToggle online={isOnline} saving={statusSaving} error={statusError} onToggle={toggleOnlineStatus} />}
              <Link href={`/dashboard/u/${profile?.uid}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><IconSwap icon={<User className="h-4 w-4" />}>
                <User className="h-4 w-4" />
                <span className="text-sm font-bold">View profile</span>
              </IconSwap></Link>
              <Link href="/dashboard/settings" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]"><IconSwap icon={<Settings className="h-4 w-4" />}>
                <Settings className="h-4 w-4" />
                <span className="text-sm font-bold">Settings</span>
              </IconSwap></Link>
              <button onClick={handleSignOut} className="flex items-center gap-3 rounded-[1.2rem] bg-red-50 px-4 py-3 text-left text-red-600"><IconSwap icon={<LogOut className="h-4 w-4" />}>
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-bold">Sign out</span>
              </IconSwap></button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
