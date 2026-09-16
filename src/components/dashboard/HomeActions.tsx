import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, MapPin, Users, Settings } from "lucide-react";
import styles from "./mobile.module.css";

export function BookingAction({ location }: { location: string }) {
  return <section className={`dashboard-widget ${styles.bookingCard}`} aria-labelledby="booking-heading">
    <p className={styles.location}><MapPin size={16} aria-hidden="true" />{location}</p>
    <h2 id="booking-heading">Need snow cleared?</h2>
    <p>Find a nearby shoveler for your driveway, walkway, or steps.</p>
    <Link href="/dashboard/find" className={styles.mainAction}>Find a shoveler <ArrowRight size={20} aria-hidden="true" /></Link>
    <span className={styles.actionNote}>Choose a shoveler, then send a job request.</span>
  </section>;
}

export function HomeActions({ operator = false }: { operator?: boolean }) {
  const items = [
    ...(operator ? [{ href: "/dashboard/clients", label: "Nearby clients", description: "Find clients in your service area", icon: Users }] : []),
    { href: "/dashboard/calendar", label: "Schedule", description: "Upcoming visits and requests", icon: CalendarDays },
    { href: "/dashboard/transactions", label: "Payments", description: operator ? "Earnings and payment history" : "Receipts and payment history", icon: CreditCard },
    { href: "/dashboard/settings", label: operator ? "Manage your profile" : "Your account & property", description: operator ? "Services, availability, and verification" : "Address, preferences, and account details", icon: Settings },
  ];
  return <nav className={styles.shortcuts} aria-label="Dashboard shortcuts">
    {items.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href}>
      <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
      <span><strong>{label}</strong><span>{description}</span></span>
      <ArrowRight size={18} aria-hidden="true" />
    </Link>)}
  </nav>;
}
