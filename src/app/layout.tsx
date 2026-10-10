import type { Metadata, Viewport } from "next";
import { Inter, DM_Sans, Syne } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorManager } from "@/components/theme-color-manager";

import { ConditionalShell } from "@/components/conditional-shell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PushSubscriptionManager } from "@/components/push-subscription-manager";

import { OverlayManagerProvider } from "@/lib/overlay-manager";
import { ClickFeedback } from "@/components/click-feedback";
import { MaintenanceGate } from "@/components/maintenance-gate";
import { JsonLd } from "@/components/json-ld";
import { CANONICAL_ORIGIN, getAppUrl } from "@/lib/app-url";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });

export const metadata: Metadata = {
  title: {
    default: "Edyfra — Tutors, Study Partners & Past Papers in Kenya",
    template: "%s | Edyfra",
  },
  description:
    "Find verified tutors and study partners, revise with KCSE past papers, and get instant help from Mash AI. Made for Kenyan high school and university students.",
  keywords: [
    "edyfra", "study platform kenya", "tutors kenya", "kcse past papers", "kcse revision", "AI learning", "university tutors",
    "high school tutors", "online study", "peer learning", "education kenya",
  ],
  authors: [{ name: "Edyfra", url: CANONICAL_ORIGIN }],
  creator: "Edyfra",
  metadataBase: new URL(CANONICAL_ORIGIN),
   openGraph: {
  type: "website",
  locale: "en_KE",
  url: CANONICAL_ORIGIN,
  siteName: "Edyfra",
  title: "Edyfra — Tutors, Study Partners & Past Papers in Kenya",
  description: "Find verified tutors and study partners, revise with KCSE past papers, and get instant help from Mash AI. Made for Kenyan high school and university students.",
  images: [{
    url: "/og-image.png",
    width: 1200,
    height: 630,
    alt: "Edyfra — study platform for Kenyan students",
  }],
},
  twitter: {
    card: "summary_large_image",
    title: "Edyfra — Tutors, Study Partners & Past Papers in Kenya",
    description: "Verified tutors, study partners, past papers and Mash AI, built for Kenyan students.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    other: [
      { rel: "icon", url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Edyfra",
    statusBarStyle: "black-translucent",
  },
  other: {
    "google-site-verification": "fh14-vbUDl1VxGmLpFqi38BKlZtrWPkw70ir-BYBWRo",
    "geo.region": "KE",
    "geo.placename": "Nairobi",
    "geo.position": "-1.286389;36.817223",
    "ICBM": "-1.286389, 36.817223",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF9500",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
const siteUrl = getAppUrl();

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Edyfra",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description:
    "Kenya's institutional study platform connecting students with verified tutors, AI-powered matching, live study rooms, and institutional analytics.",
  foundingDate: "2025",
  areaServed: "KE",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "support",
    email: "help@edyfra.online",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Edyfra",
  url: siteUrl,
  description:
    "Connect with verified tutors and elite peers across Kenya. AI-powered matching, live study rooms, and institutional analytics.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/dashboard/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${dmSans.variable} ${syne.variable} font-sans antialiased`} suppressHydrationWarning>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OverlayManagerProvider>
            <ThemeColorManager />
            <ClickFeedback />
            <MaintenanceGate>
              <ConditionalShell>{children}</ConditionalShell>
            </MaintenanceGate>
            <ServiceWorkerRegister />
            <PushSubscriptionManager />

            <Toaster richColors position="top-right" />
            <Analytics />
            <SpeedInsights />
          </OverlayManagerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

