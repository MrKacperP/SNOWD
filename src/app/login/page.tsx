import { Suspense } from "react";
import SimpleAuth from "@/components/SimpleAuth";
export default function LoginPage() {
  return <Suspense fallback={<main role="status">Loading sign-in…</main>}><SimpleAuth /></Suspense>;
}
