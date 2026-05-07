import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorManager } from "@/components/theme-color-manager";
import { ConditionalShell } from "@/components/conditional-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Edyfra — Kenya's Institutional Study Platform",
    template: "%s | Edyfra",
  },
  description:
    "Connect with verified tutors and elite peers across Kenya. AI-powered matching, live study rooms, and institutional analytics — built for the modern scholar.",
  keywords: [
    "edyfra", "study platform kenya", "tutors kenya", "AI learning", "university tutors",
    "high school tutors", "online study", "peer learning", "education kenya",
  ],
  authors: [{ name: "Edyfra", url: "https://edyfra.com" }],
  creator: "Edyfra",
  metadataBase: new URL("https://edyfra.com"),
   openGraph: {
  type: "website",
  locale: "en_KE",
  url: "https://edyfra.com",
  siteName: "Edyfra",
  title: "Edyfra — Kenya's Institutional Study Platform",
  description: "AI-powered tutor matching, live study rooms, and institutional analytics for Kenyan scholars.",
},
  twitter: {
    card: "summary_large_image",
    title: "Edyfra — Kenya's Institutional Study Platform",
    description: "Connect with verified tutors across Kenya. Study smarter.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorManager />
          <ConditionalShell>{children}</ConditionalShell>
          <Toaster richColors position="top-right" />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
