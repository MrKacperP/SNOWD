
import IconSwap from "@/components/ui/IconSwap";
import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, MapPin, Users, Settings, ClipboardList } from "lucide-react";
import styles from "./mobile.module.css";

export function BookingAction({ location }: { location: string }) {
  return <section className={`dashboard-widget ${styles.bookingCard}`} aria-labelledby="booking-heading">
    <p className={styles.location}><MapPin size={16} aria-hidden="true" />{location}</p>
    <h2 id="booking-heading">Need snow cleared?</h2><p>Find a nearby shoveler for your driveway, walkway, or steps.</p>
    <Link href="/dashboard/find" className={styles.mainAction}><IconSwap icon={<ArrowRight size={20} aria-hidden="true" />}>Find a shoveler <ArrowRight size={20} aria-hidden="true" /></IconSwap></Link>
    <span className={styles.actionNote}>Choose a shoveler, then send a job request.</span>
  </section>;
}

export function HomeActions({ operator = false }: { operator?: boolean }) {
  const items = [
    { href: operator ? "/dashboard/clients" : "/dashboard/jobs", label: operator ? "Neighbors Nearby" : "Work orders", icon: operator ? Users : ClipboardList },
    { href: "/dashboard/calendar", label: "Scheduling", icon: CalendarDays },
    { href: "/dashboard/transactions", label: "Payments", icon: CreditCard },
    { href: "/dashboard/settings", label: "Manage Profile", icon: Settings },
  ];
  return <nav className={styles.shortcuts} aria-label="Dashboard shortcuts">
    {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label}>
      <span className={styles.shortcutIcon}><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
      <strong className={styles.shortcutTitle}>{label}</strong>
      <span className={styles.shortcutHoverAsset} aria-hidden="true"><Icon size={44} strokeWidth={1.2} /></span>
      <ArrowRight className={styles.shortcutArrow} size={18} aria-hidden="true" />
    </Link>)}
  </nav>;
}
