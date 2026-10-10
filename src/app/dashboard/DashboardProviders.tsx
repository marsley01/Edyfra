'use client';

import type { ReactNode } from 'react';
import { MatchProvider } from '@/lib/match-context';
import { VideoProvider } from '@/components/video/VideoProvider';
import MatchFloatingBar from '@/components/dashboard/MatchFloatingBar';

export default function DashboardProviders({ children }: { children: ReactNode }) {
  // VideoProvider renders the incoming-call sheet and the full-screen call UI
  // itself, on top of the page, so rings reach users on every dashboard page
  // and the page underneath keeps its state during a call.
  return (
    <VideoProvider>
      <MatchProvider>
        {children}
        <MatchFloatingBar />
      </MatchProvider>
    </VideoProvider>
  );
}
