import Link from "next/link";
import { notFound } from "next/navigation";
import { mobilePolicies, policyDate } from "@/lib/mobilePolicies";
export function generateStaticParams() { return Object.keys(mobilePolicies).map(policy => ({ policy })); }
export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const document = mobilePolicies[policy];
  if (!document) notFound();
  return <main className="native-page"><article className="native-content native-policy">
    <header className="native-header"><Link href="/mobile/settings">← App & privacy</Link><span className="native-brand">snowd<span>.</span></span></header>
    <h1>{document.title}</h1><p>Updated {policyDate}</p>
    {document.sections.map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
    <nav className="native-links" aria-label="Policies"><Link href="/policies/privacy">Privacy</Link><Link href="/policies/terms">Terms</Link><Link href="/policies/payments">Payments</Link><Link href="/policies/support">Support</Link><Link href="/account/delete">Delete account</Link></nav>
  </article></main>;
}
