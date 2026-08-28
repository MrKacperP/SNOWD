import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import PageVisitTracker from "@/components/PageVisitTracker";

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
    images: ["/landing/snowd-neighborhood-hero.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SNOWD | Snow help, right on your block",
    description: "Book nearby snow help or earn clearing driveways in your neighborhood.",
    images: ["/landing/snowd-neighborhood-hero.png"],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" sizes="any" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>
            <PageVisitTracker />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
