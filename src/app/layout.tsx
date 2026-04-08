import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import PageVisitTracker from "@/components/PageVisitTracker";

export const metadata: Metadata = {
  title: "Snowd",
  description:
    "Connect with local snow removal operators in your Canadian neighbourhood. From professional plowing services to students with shovels — get your snow cleared fast.",
  keywords: ["snow removal", "Canada", "snow plowing", "driveway clearing", "snow shovelling"],
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
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
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
