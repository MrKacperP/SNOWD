import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, MapPin, Users, Settings } from "lucide-react";
import styles from "./mobile.module.css";

export function BookingAction({ location }: { location: string }) {
  return <section className={`dashboard-widget ${styles.bookingCard}`} aria-labelledby="booking-heading">
    <p className={styles.location}><MapPin size={16} aria-hidden="true" />{location}</p>
    <h2 id="booking-heading">Meet snow removal?</h2>
    <Link href="/dashboard/find" className={styles.mainAction}>Find a shoveler <ArrowRight size={20} aria-hidden="true" /></Link>
  </section>;
}

export function HomeActions({ operator = false }: { operator?: boolean }) {
  const items = [
    ...(operator ? [{ href: "/dashboard/clients", label: "Nearby clients", icon: Users }] : []),
    { href: "/dashboard/calendar", label: "Schedule", icon: CalendarDays },
    { href: "/dashboard/transactions", label: "Payments", icon: CreditCard },
    { href: "/dashboard/settings", label: operator ? "Manage your profile" : "Your account & property", icon: Settings },
  ];
  return <nav className={styles.shortcuts} aria-label="Dashboard shortcuts">
    {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href}>
      <span className={styles.shortcutIcon}><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
      <strong className={styles.shortcutTitle}>{label}</strong>
      <span className={styles.shortcutHoverAsset} aria-hidden="true"><Icon size={44} strokeWidth={1.2} /></span>
      <ArrowRight className={styles.shortcutArrow} size={18} aria-hidden="true" />
    </Link>)}
  </nav>;
}
