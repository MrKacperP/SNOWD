import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Junk Removal | snow.ca",
  description:
    "Fast, reliable junk removal across the Greater Toronto Area. Call or text for a quote.",
  keywords: ["junk removal", "GTA", "haul away", "Toronto", "furniture removal"],
};

export default function JunkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
