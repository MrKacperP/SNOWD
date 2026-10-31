import type { Metadata } from "next";

// Sample-data copy of the client app, framed by the landing page demo.
export const metadata: Metadata = { title: "Demo", robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
