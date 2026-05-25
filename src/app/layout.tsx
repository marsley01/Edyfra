import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorManager } from "@/components/theme-color-manager";
import { ConditionalShell } from "@/components/conditional-shell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PushSubscriptionManager } from "@/components/push-subscription-manager";
import { AssistLoopWidget } from "@/components/assistloop-widget";

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
  authors: [{ name: "Edyfra", url: "https://edyfra.space" }],
  creator: "Edyfra",
  metadataBase: new URL("https://edyfra.space"),
   openGraph: {
  type: "website",
  locale: "en_KE",
  url: "https://edyfra.space",
  siteName: "Edyfra",
  title: "Edyfra — Kenya's Institutional Study Platform",
  description: "AI-powered tutor matching, live study rooms, and institutional analytics for Kenyan scholars.",
},
  twitter: {
    card: "summary_large_image",
    title: "Edyfra — Kenya's Institutional Study Platform",
    description: "Connect with verified tutors across Kenya. Study smarter.",
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
    "geo.region": "KE",
    "geo.placename": "Nairobi",
    "geo.position": "-1.286389;36.817223",
    "ICBM": "-1.286389, 36.817223",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D1FE8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          <ServiceWorkerRegister />
          <PushSubscriptionManager />
          <Toaster richColors position="top-right" />
          <Analytics />
          <SpeedInsights />
          <AssistLoopWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
