"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

// Routes where the global nav + footer should be completely hidden
// (they have their own sidebar/layout)
const APP_ROUTES = [
  "/dashboard",
  "/admin",
  "/tutor",
  "/study-room",
  "/onboarding",
  "/login",
  "/signup",
];

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAppRoute = APP_ROUTES.some(route => pathname.startsWith(route));

  if (isAppRoute) {
    // No nav, no footer, no top padding — the app has its own layout
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20">{children}</main>
      <Footer />
    </>
  );
}
