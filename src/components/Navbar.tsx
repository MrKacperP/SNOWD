"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
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
  CloudSnow,
} from "lucide-react";
import { useWeather } from "@/context/WeatherContext";

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const { weather } = useWeather();

  const isClient = profile?.role === "client";
  const isOnline = (profile as unknown as Record<string, unknown>)?.isOnline !== false;

  const navItems = isClient
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

  const toggleOnlineStatus = async () => {
    if (!profile?.uid) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), { isOnline: !isOnline });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      if (profile?.uid) {
        await updateDoc(doc(db, "users", profile.uid), { isOnline: false });
      }
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-xl border-r border-[rgba(67,97,238,0.08)] min-h-screen fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-[rgba(67,97,238,0.08)]">
          <Link href="/dashboard" className="flex items-center gap-1">
            <span className="text-2xl font-extrabold text-[#4361EE]">
              snowd
            </span>
            <span className="text-2xl font-light text-gray-400">.ca</span>
          </Link>
          {weather && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-[#4361EE]/5 rounded-xl text-xs">
              <span className="text-lg">{weather.icon}</span>
              <div>
                <span className="font-bold text-gray-900">{weather.temp}°C</span>
                <span className="text-gray-500 ml-1">{weather.condition}</span>
                {weather.snowChance > 0 && (
                  <span className="ml-1.5 text-[#4361EE] font-semibold">❄️{weather.snowChance}%</span>
                )}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const isMessages = item.href.includes("messages");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold tracking-wide relative ${
                  active
                    ? "bg-[#4361EE]/10 text-[#4361EE] shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {isMessages && unreadCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 unread-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t border-[rgba(67,97,238,0.08)] relative" ref={menuRef}>
          {profileMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white/90 backdrop-blur-xl rounded-xl border border-[rgba(67,97,238,0.08)] shadow-lg overflow-hidden z-50">
              <button
                onClick={toggleOnlineStatus}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
              >
                <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
                <span className="text-sm font-medium text-gray-900">
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
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
              >
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">View Profile</span>
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
              >
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">Settings</span>
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
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition"
          >
            <div className="relative">
              <div className="w-9 h-9 bg-[#4361EE] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {profile?.displayName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 status-dot ${isOnline ? "online" : "offline"}`} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.displayName || "User"}
              </p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role || "user"}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${profileMenuOpen ? "" : "rotate-180"}`} />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(67,97,238,0.08)] z-30 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-1">
          <span className="text-xl font-extrabold text-[#4361EE]">
            snowd
          </span>
          <span className="text-xl font-light text-gray-400">.ca</span>
        </Link>
        <div className="flex items-center gap-2">
          {weather && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#4361EE]/10 rounded-lg text-xs">
              <span>{weather.icon}</span>
              <span className="font-bold text-gray-900">{weather.temp}°</span>
            </div>
          )}
          <Link href={`/dashboard/u/${profile?.uid}`} className="relative">
            <div className="w-8 h-8 bg-[#4361EE] rounded-full flex items-center justify-center text-white font-semibold text-xs">
              {profile?.displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>
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
            className="absolute right-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-4">
              <button onClick={() => setMobileOpen(false)} className="p-1 text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-[#4361EE]/5 rounded-xl">
              <div className="relative">
                <div className="w-10 h-10 bg-[#4361EE] rounded-full flex items-center justify-center text-white font-semibold">
                  {profile?.displayName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 status-dot ${isOnline ? "online" : "offline"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{profile?.displayName || "User"}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role || "user"}</p>
              </div>
            </div>

            <button
              onClick={toggleOnlineStatus}
              className="w-full flex items-center gap-3 px-4 py-2.5 mb-4 rounded-xl hover:bg-gray-50 transition"
            >
              <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
              <span className="text-sm font-medium text-gray-900">{isOnline ? "Online" : "Offline"}</span>
            </button>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                const isMessages = item.href.includes("messages");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold tracking-wide relative ${
                      active
                        ? "bg-[#4361EE]/10 text-[#4361EE]"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                    {isMessages && unreadCount > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 unread-badge">
                        {unreadCount > 9 ? "9+" : unreadCount}
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
                    ? "bg-[#4361EE]/10 text-[#4361EE]"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </nav>

            <div className="mt-6 pt-4 border-t border-gray-100">
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[rgba(67,97,238,0.08)] z-30 flex safe-area-bottom">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const isMessages = item.href.includes("messages");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-semibold transition-all duration-200 relative ${
                active ? "text-[#4361EE]" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
              {isMessages && unreadCount > 0 && (
                <span className="absolute top-0.5 left-1/2 translate-x-1 unread-badge" style={{ fontSize: '9px', minWidth: '16px', height: '16px' }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {active && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#4361EE] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
