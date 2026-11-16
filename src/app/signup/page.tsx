import { Suspense } from "react";
import SimpleAuth from "@/components/SimpleAuth";
export default function SignUpPage() {
  return <Suspense fallback={<main role="status">Loading sign-up…</main>}><SimpleAuth /></Suspense>;
}
