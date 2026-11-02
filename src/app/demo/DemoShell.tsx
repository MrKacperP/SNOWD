"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import MobileNavigation from "@/components/dashboard/MobileNavigation";
import UserAvatar from "@/components/UserAvatar";
import { desktopNavigation } from "@/lib/appNavigation";
import SidebarWeather from "@/components/dashboard/SidebarWeather";
import type { WeatherData } from "@/context/WeatherContext";
import { CLIENT_NAME, type DemoRole, type DemoSpot } from "./demoData";

/** Sidebar and bottom bar copied from the dashboard layout, for either role. */
/** Sample snow-day weather, shown through the same card the real sidebar uses. */
const sampleWeather = (city: string): WeatherData => ({ temp: -6, feelsLike: -11, condition: "Light snow", icon: "", city, humidity: 84, windSpeed: 18, snowfallAmount: 4, snowfallUnit: "cm", code: 71, isDay: true, nextSnowDate: null });

export default function DemoShell({ role, spot, pathname, children }: { role: DemoRole; spot: DemoSpot; pathname: string; children: React.ReactNode }) {
  const weather = sampleWeather(spot.city);
  const name = role === "client" ? CLIENT_NAME : "Jamie Morgan";
  return <>
    <aside className="dashboard-sidebar fixed left-0 top-0 z-30 hidden h-dvh w-[248px] overflow-y-auto border-r border-[var(--border-color)] bg-[var(--card)] px-5 py-5  lg:flex lg:flex-col">
      <Link href="/dashboard" aria-label="snowd home" className="flex items-center gap-2.5 px-2 py-1">
        <Image src="/logo.png" alt="" width={30} height={30} />
        <span className="text-xl font-headline font-bold leading-none text-[var(--ink)]">snowd</span>
      </Link>
      <div className="mt-4"><SidebarWeather weather={weather} /></div>
      <nav aria-label="Primary navigation" className="desktop-navigation mt-4 grid gap-1">
        {desktopNavigation(role).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={20} aria-hidden="true" /><span className="flex-1">{label}</span></Link>
        ))}
      </nav>
      <button type="button" className="notif-trigger mt-4 shrink-0" data-unread={false}>
        <span className="notif-trigger-icon"><Bell className="h-4 w-4" aria-hidden="true" /></span>
        <span className="flex-1 text-sm font-bold">Notifications</span>
      </button>
      <div className="joined-menu relative mt-3 shrink-0">
        <button type="button" className="flex w-full items-center gap-3 rounded-[1.2rem] border border-[var(--ink)] bg-[var(--card)] px-4 py-3 shadow-[var(--surface-shadow)]">
          <div className="relative"><UserAvatar role={role} displayName={name} size={38} /><div className="absolute -bottom-0.5 -right-0.5 status-dot online" /></div>
          <div className="min-w-0 flex-1 text-left"><div className="truncate text-sm font-bold text-[var(--text-primary)]">{name}</div><div className="truncate text-xs capitalize text-[var(--text-muted)]">{role}</div></div>
          <Menu className="h-4 w-4 text-[var(--text-muted)]" />
        </button>
      </div>
    </aside>
    <MobileNavigation role={role} pathname={pathname} menuOpen={false} onOpenMenu={() => {}} />
    <main className="dashboard-main min-h-screen min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-20 lg:ml-[248px] lg:pb-10 lg:pt-8">
      <div className="container-app mt-4 md:mt-6">{children}</div>
    </main>
  </>;
}

