"use client";

import { type ReactNode } from "react";
import { MatchProvider } from "@/lib/match-context";
import MatchFloatingBar from "@/components/dashboard/MatchFloatingBar";

export default function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <MatchProvider>
      {children}
      <MatchFloatingBar />
    </MatchProvider>
  );
}
