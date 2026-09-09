"use client";

import Link from "next/link";
import { Home, ClipboardList, MessageSquare, Menu } from "lucide-react";
import styles from "./mobile.module.css";

export default function MobileNavigation({ pathname, unreadMessages = 0, pendingJobs = 0, menuOpen, onOpenMenu }: {
  pathname: string;
  unreadMessages?: number;
  pendingJobs?: number;
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const items = [
    { href: "/dashboard", label: "Home", icon: Home, count: 0 },
    { href: "/dashboard/jobs", label: "Jobs", icon: ClipboardList, count: pendingJobs },
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, count: unreadMessages },
  ];
  return <nav className={styles.bottomNav} aria-label="Primary navigation">
    {items.map(({ href, label, icon: Icon, count }) => {
      const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={count ? `${label}, ${count} ${label === "Jobs" ? "pending" : "unread"}` : label}>
        <span className={styles.navIcon}><Icon size={22} strokeWidth={active ? 2 : 1.7} aria-hidden="true" />{count > 0 && <span className={styles.badge} aria-hidden="true">{count > 9 ? "9+" : count}</span>}</span>
        <span>{label}</span>
      </Link>;
    })}
    <button type="button" onClick={onOpenMenu} aria-expanded={menuOpen} aria-controls="mobile-account-menu">
      <span className={styles.navIcon}><Menu size={22} strokeWidth={1.7} aria-hidden="true" /></span><span>More</span>
    </button>
  </nav>;
}
