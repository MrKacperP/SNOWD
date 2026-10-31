"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import styles from "@/app/landing.module.css";

type MenuItem = { label: string; href: string; note: string };
const menus: { label: string; items: MenuItem[] }[] = [
  { label: "Homeowners", items: [
    { label: "Find a shoveler", href: "/signup?role=client", note: "Book help for your driveway" },
    { label: "Try the live demo", href: "#demo", note: "See the app before you sign up" },
    { label: "Pricing & payments", href: "#faq", note: "Up-front prices, no surprises" },
  ] },
  { label: "Shovelers", items: [
    { label: "Become a shoveler", href: "/signup?role=operator", note: "Earn clearing snow nearby" },
    { label: "How earning works", href: "#earn", note: "Pick jobs, get paid same day" },
  ] },
  { label: "Help", items: [
    { label: "Help centre", href: "#faq", note: "Answers to common questions" },
    { label: "Ask a question", href: "#ask", note: "No account needed" },
    { label: "Contact us", href: "mailto:support@snowd.ca", note: "support@snowd.ca" },
  ] },
];

function MenuLink({ item, onPick }: { item: MenuItem; onPick: () => void }) {
  const inner = <><strong>{item.label}</strong><small>{item.note}</small></>;
  return item.href.startsWith("/")
    ? <Link href={item.href} role="menuitem" onClick={onPick}>{inner}</Link>
    : <a href={item.href} role="menuitem" onClick={onPick}>{inner}</a>;
}

function Dropdown({ id, label, items, open, setOpen }: { id: string; label: string; items: MenuItem[]; open: boolean; setOpen: (id: string | null) => void }) {
  return (
    <div className={styles.navItem} data-open={open || undefined} onMouseEnter={() => setOpen(id)} onMouseLeave={() => setOpen(null)}>
      <button type="button" className={styles.navTrigger} aria-expanded={open} aria-haspopup="menu" aria-controls={`nav-${id}`} onClick={() => setOpen(open ? null : id)}>
        {label}<ChevronDown size={15} aria-hidden="true" />
      </button>
      <div id={`nav-${id}`} role="menu" className={styles.navMenu}>
        {items.map(item => <MenuLink key={item.label} item={item} onPick={() => setOpen(null)} />)}
      </div>
    </div>
  );
}

/** Landing top bar: OpenAI-style dropdown menus, kept to SNOWD's three audiences. */
export default function LandingNav({ brand }: { brand: React.ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <nav ref={ref} className={styles.nav} aria-label="Main navigation">
      <div className={styles.navLeft}>
        {brand}
        <div className={styles.navLinks}>
          {menus.map(menu => <Dropdown key={menu.label} id={menu.label} label={menu.label} items={menu.items} open={open === menu.label} setOpen={setOpen} />)}
        </div>
      </div>
      <div className={styles.navActions}>
        <Link href="/login" className={styles.navLogin}>Log in</Link>
        <Link href="/signup?role=client" className={styles.navSignup}>Sign up <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </nav>
  );
}
