'use client';

import { useState, type ReactNode } from 'react';
import { MatchProvider } from '@/lib/match-context';
import { VideoProvider } from '@/components/video/VideoProvider';
import { IncomingCall } from '@/components/video/IncomingCall';
import { ActiveCall } from '@/components/video/ActiveCall';
import MatchFloatingBar from '@/components/dashboard/MatchFloatingBar';
import type { Call } from '@stream-io/video-react-sdk';

export default function DashboardProviders({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  // If there's an active call accepted from the dashboard, show it full-screen
  if (activeCall) {
    return (
      <VideoProvider>
        <ActiveCall
          call={activeCall}
          onEnd={() => setActiveCall(null)}
          subject="Study Session"
        />
      </VideoProvider>
    );
  }

  return (
    <VideoProvider>
      <MatchProvider>
        {/* IncomingCall sits at the root of the dashboard so tutors get
            ring notifications on ALL dashboard pages, not just the study room */}
        <IncomingCall onAccepted={(call) => setActiveCall(call)} />
        {children}
        <MatchFloatingBar />
      </MatchProvider>
    </VideoProvider>
  );
}
