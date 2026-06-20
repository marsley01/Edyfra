'use client';

import { useEffect, useState } from 'react';
import { useStreamVideoClient } from '@stream-io/video-react-sdk';
import type { Call } from '@stream-io/video-react-sdk';

interface IncomingCallProps {
  onAccepted: (call: Call) => void;
}

export function IncomingCall({ onAccepted }: IncomingCallProps) {
  const client = useStreamVideoClient();
  const [ringingCall, setRingingCall] = useState<Call | null>(null);
  const [callerName, setCallerName] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!client) return;

    const unsubscribe = client.on('call.ring', (event: any) => {
      console.log('[IncomingCall] Incoming call event:', event);

      const call = client.call(event.call.type, event.call.id);

      const caller = event.members?.find(
        (m: any) => m.user_id !== client.streamClient.user?.id
      );

      setCallerName(caller?.user?.name || 'Someone');
      setRingingCall(call);
      setTimeLeft(30);
    });

    return () => unsubscribe();
  }, [client]);

  // Auto-decline after 30 seconds
  useEffect(() => {
    if (!ringingCall) return;

    if (timeLeft <= 0) {
      handleDecline();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringingCall, timeLeft]);

  const handleAccept = async () => {
    if (!ringingCall) return;

    try {
      await ringingCall.accept();
      await ringingCall.join();
      console.log('[IncomingCall] Call accepted and joined');
      onAccepted(ringingCall);
      setRingingCall(null);
    } catch (err) {
      console.error('[IncomingCall] Accept call failed:', err);
    }
  };

  const handleDecline = async () => {
    if (!ringingCall) return;

    try {
      await ringingCall.reject();
      console.log('[IncomingCall] Call rejected');
    } catch (err) {
      console.error('[IncomingCall] Decline call failed:', err);
    } finally {
      setRingingCall(null);
    }
  };

  if (!ringingCall) return null;

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        <div className="incoming-avatar">
          {callerName.charAt(0).toUpperCase()}
          <div className="incoming-ring-1" />
          <div className="incoming-ring-2" />
        </div>

        <p className="incoming-name">{callerName}</p>
        <p className="incoming-label">Incoming video call</p>
        <p className="incoming-timer">Auto-declining in {timeLeft}s</p>

        <div className="incoming-actions">
          <button onClick={handleDecline} className="decline-call-btn">
            ✕ Decline
          </button>
          <button onClick={handleAccept} className="accept-call-btn">
            ✓ Accept
          </button>
        </div>
      </div>
    </div>
  );
}
