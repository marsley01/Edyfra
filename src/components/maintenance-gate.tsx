"use client";

import { useEffect, useState } from "react";
import { getAdminGlobalSettings, checkAdminStatus } from "@/app/actions/admin";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  // Never block the initial render: the page HTML is streamed immediately and
  // the maintenance check runs in the background. If maintenance mode is on,
  // the full-screen notice replaces the content after hydration (no LCP/SEO hit).
  useEffect(() => {
    Promise.all([getAdminGlobalSettings(), checkAdminStatus()])
      .then(([settings, admin]) => {
        setMaintenanceMode(!!settings.maintenanceMode);
        setIsAdmin(admin);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (checked && maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-primary">Edyfra</h1>
        <h2 className="text-4xl md:text-5xl font-bold mb-2">We&apos;ll be right back.</h2>
        <p className="text-muted-foreground max-w-md">The platform is currently undergoing scheduled maintenance. Please check back later.</p>
      </div>
    );
  }

  return <>{children}</>;
}