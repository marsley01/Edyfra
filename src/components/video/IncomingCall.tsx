'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVideoContext } from './VideoProvider';
import type { Call } from '@stream-io/video-react-sdk';

const PERM_KEY = 'edyfra_video_perm';

function requestMediaPermission(): Promise<boolean> {
  return navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      stream.getTracks().forEach((t) => t.stop());
      localStorage.setItem(PERM_KEY, 'granted');
      return true;
    })
    .catch(() => false);
}

interface IncomingCallProps {
  onAccepted: (call: Call) => void;
}

export function IncomingCall({ onAccepted }: IncomingCallProps) {
  const { client } = useVideoContext();
  const [ringingCall, setRingingCall] = useState<Call | null>(null);
  const [callerName, setCallerName] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [actionError, setActionError] = useState<string | null>(null);

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
      setActionError(null);
    });

    return () => unsubscribe();
  }, [client]);

  // Play ringing sound
  useEffect(() => {
    if (!ringingCall) return;

    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch((err) => console.log('[IncomingCall] Audio play blocked:', err));

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [ringingCall]);

  // Auto-decline after 30 seconds
  useEffect(() => {
    if (!ringingCall) return;
    if (timeLeft <= 0) {
      handleDecline();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [ringingCall, timeLeft]);

  const dismissCall = useCallback(() => {
    setRingingCall(null);
    setActionError(null);
  }, []);

  const handleAccept = async () => {
    if (!ringingCall) return;
    setActionError(null);

    try {
      await ringingCall.accept();

      const hasPerm = localStorage.getItem(PERM_KEY) === 'granted';
      if (!hasPerm) {
        const granted = await requestMediaPermission();
        if (!granted) {
          setActionError(
            'Camera and microphone access is needed to join the call. Please allow access in your browser settings.'
          );
          return;
        }
      }

      await ringingCall.join();
      console.log('[IncomingCall] Call accepted and joined');
      onAccepted(ringingCall);
      dismissCall();
    } catch (err: any) {
      console.error('[IncomingCall] Accept call failed:', err);
      setActionError(
        err?.message?.includes('SFU')
          ? 'Could not connect to the video server. Check your network and try again.'
          : 'Failed to accept the call. Please try again.'
      );
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
      dismissCall();
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
        {actionError && (
          <p className="incoming-error">{actionError}</p>
        )}
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
