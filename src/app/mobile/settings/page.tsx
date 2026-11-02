"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";
export default function AppSettings() {
  const { user } = useAuth();
  return <main className="native-page"><div className="native-content">
    <header className="native-header"><Link href={user ? "/dashboard/settings" : "/mobile"}><ArrowLeft size={18}/> {user ? "Account settings" : "Welcome"}</Link><span className="native-brand">snowd<span>.</span></span></header>
    <h1>App & privacy</h1><p>Your information, your choices.</p>
    <section className="native-card"><h2>Permissions</h2><p>Location is requested when you choose to share your journey. You can enter an address manually and use the app without location permission.</p><p>Choose photos to verify your identity or show completed work. Only selected photos are uploaded. Camera access is used when you choose to take a photo.</p><p>Change camera and location access in your device’s Settings → SNOWD.</p></section>
    <section className="native-card"><h2>Payments & policies</h2><nav className="flex flex-col gap-2"><Link className="inline-flex min-h-11 items-center" href="/policies/payments">Payments, cancellations & refunds</Link><Link className="inline-flex min-h-11 items-center" href="/policies/privacy">Privacy & data use</Link><Link className="inline-flex min-h-11 items-center" href="/policies/terms">Terms of service</Link><Link className="inline-flex min-h-11 items-center" href="/policies/support">Help & reporting</Link></nav></section>
    <section className="native-card"><h2>Your account</h2><p>Manage your profile and request account deletion. We explain what is removed and what may need to be retained before you confirm.</p><Link className="inline-flex min-h-11 items-center" href="/account/delete">Delete account & data</Link></section>
    <p className="text-sm text-center">snowd · Mobile 1.0<br/>Service and support: <a className="underline" href="mailto:service.mississauga@gmail.com">service.mississauga@gmail.com</a></p>
  </div></main>;
}
