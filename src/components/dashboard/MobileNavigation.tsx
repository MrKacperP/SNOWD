"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { primaryNavigation } from "@/lib/appNavigation";
import type { UserRole } from "@/lib/types";
import styles from "./mobile.module.css";

export default function MobileNavigation({ pathname, role, unreadMessages = 0, pendingJobs = 0, menuOpen, onOpenMenu }: {
  pathname: string;
  role?: UserRole;
  unreadMessages?: number;
  pendingJobs?: number;
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const items = primaryNavigation(role).map(item => ({
    ...item,
    count: item.href.includes("messages") ? unreadMessages : item.href.includes("jobs") ? pendingJobs : 0,
  }));
  return <nav className={styles.bottomNav} aria-label="Primary navigation">
    {items.map(({ href, label, icon: Icon, count, tour }) => {
      const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
      return <Link data-tour={tour} key={href} href={href} aria-current={active ? "page" : undefined} aria-label={count ? `${label}, ${count} ${label === "Work orders" ? "awaiting attention" : "unread"}` : label}>
        <span className={styles.navIcon}><Icon size={22} strokeWidth={active ? 2 : 1.7} aria-hidden="true" />{count > 0 && <span className={styles.badge} aria-hidden="true">{count > 9 ? "9+" : count}</span>}</span>
        <span>{label}</span>
      </Link>;
    })}
    <button data-tour="profile-menu" className={styles.moreButton} type="button" onClick={onOpenMenu} aria-expanded={menuOpen} aria-controls="mobile-account-menu" aria-label="More account options">
      <Menu size={22} strokeWidth={1.7} aria-hidden="true" />
    </button>
  </nav>;
}
