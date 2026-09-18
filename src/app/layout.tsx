import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import BrowserSupport from "@/components/support/BrowserSupport";
import PageVisitTracker from "@/components/PageVisitTracker";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f8fb" };

export const metadata: Metadata = {
  metadataBase: new URL("https://snowd.ca"),
  title: {
    default: "SNOWD | Neighborhood snow removal",
    template: "%s | snowd.ca",
  },
  description:
    "Book a nearby shoveler or earn clearing snow in your neighborhood with SNOWD.",
  keywords: ["snow removal", "Canada", "students", "seniors", "driveway clearing", "snow shovelling"],
  openGraph: {
    title: "SNOWD | Snow help, right on your block",
    description: "Book nearby snow help or earn clearing driveways in your neighborhood.",
    images: ["/landing/snowd-neighborhood-hero-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SNOWD | Snow help, right on your block",
    description: "Book nearby snow help or earn clearing driveways in your neighborhood.",
    images: ["/landing/snowd-neighborhood-hero-v2.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${instrumentSans.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="icon" href="/icon.png" sizes="any" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <BrowserSupport>
            <PageVisitTracker />
            {children}
          </BrowserSupport>
        </AuthProvider>
      </body>
    </html>
  );
}
