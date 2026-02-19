import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import PageVisitTracker from "@/components/PageVisitTracker";

export const metadata: Metadata = {
  title: "snowd.ca — Snow Removal Marketplace",
  description:
    "Connect with local snow removal operators in your Canadian neighbourhood. From professional plowing services to students with shovels — get your snow cleared fast.",
  keywords: ["snow removal", "Canada", "snow plowing", "driveway clearing", "snow shovelling"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        {/* Prevent flash of wrong theme on page load */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('snowd-theme');
            if (t === 'dark') { document.documentElement.classList.add('dark'); }
          } catch(e) {}
        ` }} />
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
