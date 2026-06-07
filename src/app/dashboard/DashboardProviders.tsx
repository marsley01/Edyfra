"use client";

import { type ReactNode } from "react";
import { MatchProvider } from "@/lib/match-context";
import { StreamVideoProvider } from "@/components/stream/StreamVideoProvider";
import MatchFloatingBar from "@/components/dashboard/MatchFloatingBar";

export default function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <StreamVideoProvider>
      <MatchProvider>
        {children}
        <MatchFloatingBar />
      </MatchProvider>
    </StreamVideoProvider>
  );
}
