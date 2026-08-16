'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useVideoContext } from './VideoProvider';
import { playIncomingRingtone } from '@/lib/sounds';
import type { Call } from '@stream-io/video-react-sdk';

const PERM_KEY = 'edyfra_video_perm';

async function requestMediaPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((t) => t.stop());
    localStorage.setItem(PERM_KEY, 'granted');
    return true;
  } catch (err) {
    console.warn('[IncomingCall] Media permission denied:', err);
    // Try audio only
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      localStorage.setItem(PERM_KEY, 'granted');
      return true;
    } catch {
      return false;
    }
  }
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
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Keep stable ref to avoid stale closures in event handlers
  const ringingCallRef = useRef<Call | null>(null);
  ringingCallRef.current = ringingCall;

  useEffect(() => {
    if (!client) {
      console.log('[IncomingCall] No video client yet — skipping event subscription');
      return;
    }

    console.log('[IncomingCall] Subscribing to call events on client');

    const handleRing = (event: any) => {
      console.log('[IncomingCall] 🔔 call.ring event received:', JSON.stringify(event, null, 2));

      // Don't replace an already-ringing call
      if (ringingCallRef.current) {
        console.log('[IncomingCall] Already ringing, ignoring new ring');
        return;
      }

      const callType = event.call?.type || 'default';
      const callId = event.call?.id;

      if (!callId) {
        console.error('[IncomingCall] call.ring event missing call.id');
        return;
      }

      const call = client.call(callType, callId);
      console.log('[IncomingCall] Created call object:', callType, callId);

      // Find the caller — the member who is NOT the current user
      const currentUserId = client.streamClient?.user?.id;
      const caller = event.members?.find(
        (m: any) => m.user_id !== currentUserId
      );
      const name = caller?.user?.name || event.call?.created_by?.name || 'Someone';

      console.log('[IncomingCall] Caller:', name, '| Current user:', currentUserId);

      setCallerName(name);
      setRingingCall(call);
      setTimeLeft(30);
      setActionError(null);
    };

    const handleDismiss = (event: any) => {
      console.log('[IncomingCall] Call dismissed/ended/rejected:', event?.call?.id);
      setRingingCall((prev) => {
        if (prev && prev.id === event.call?.id) {
          return null;
        }
        return prev;
      });
    };

    // Stream Video SDK v1.x events on StreamVideoClient
    const unsubscribeRing = client.on('call.ring', handleRing);
    const unsubscribeEnded = client.on('call.ended', handleDismiss);
    const unsubscribeRejected = client.on('call.rejected', handleDismiss);

    return () => {
      console.log('[IncomingCall] Cleaning up call event listeners');
      unsubscribeRing();
      unsubscribeEnded();
      unsubscribeRejected();
    };
  }, [client]);

  // Play ringing sound
  useEffect(() => {
    if (!ringingCall) return;
    const stop = playIncomingRingtone();
    return stop;
  }, [ringingCall]);

  // Auto-decline countdown
  useEffect(() => {
    if (!ringingCall || isAccepting || isDeclining) return;

    if (timeLeft <= 0) {
      console.log('[IncomingCall] Auto-declining (timeout)');
      handleDecline();
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringingCall, timeLeft, isAccepting, isDeclining]);

  const dismissCall = useCallback(() => {
    setRingingCall(null);
    setActionError(null);
    setIsAccepting(false);
    setIsDeclining(false);
  }, []);

  const handleAccept = async () => {
    if (!ringingCall || isAccepting) return;

    setIsAccepting(true);
    setActionError(null);
    console.log('[IncomingCall] Accepting call:', ringingCall.id);

    try {
      // Step 1: Check / request media permissions BEFORE accepting
      // (accepting triggers server-side state change, so we confirm device access first)
      const hasPerm = localStorage.getItem(PERM_KEY) === 'granted';
      if (!hasPerm) {
        console.log('[IncomingCall] Requesting media permissions...');
        const granted = await requestMediaPermission();
        if (!granted) {
          setActionError(
            'Camera/microphone access is required. Please allow access in your browser settings and try again.'
          );
          setIsAccepting(false);
          return;
        }
      }

      // Step 2: Accept the call (signals to the caller that we answered)
      console.log('[IncomingCall] Calling ringingCall.accept()...');
      await ringingCall.accept();
      console.log('[IncomingCall] Accept() succeeded');

      // Step 3: Join the call (establishes WebRTC media connection)
      console.log('[IncomingCall] Calling ringingCall.join()...');
      await ringingCall.join();
      console.log('[IncomingCall] ✅ Joined call successfully');

      onAccepted(ringingCall);
      dismissCall();
    } catch (err: any) {
      console.error('[IncomingCall] ❌ Accept/join failed:', err);

      let message = 'Failed to accept the call. Please try again.';

      if (err?.message?.includes('SFU') || err?.message?.includes('sfu')) {
        message = 'Could not connect to the video server. Check your network and try again.';
      } else if (err?.message?.includes('permission') || err?.message?.includes('Permission')) {
        message = 'Camera or microphone access was denied. Check your browser settings.';
      } else if (err?.message?.includes('token') || err?.message?.includes('auth')) {
        message = 'Authentication error. Please refresh the page and try again.';
      } else if (err?.message?.includes('ended') || err?.message?.includes('rejected')) {
        message = 'The call was ended before you could join.';
        dismissCall();
        return;
      } else if (err?.message) {
        message = `Call failed: ${err.message}`;
      }

      setActionError(message);
      setIsAccepting(false);
    }
  };

  const handleDecline = useCallback(async () => {
    const call = ringingCallRef.current;
    if (!call || isDeclining) return;

    setIsDeclining(true);
    console.log('[IncomingCall] Declining call:', call.id);

    try {
      await call.reject();
      console.log('[IncomingCall] Call rejected');
    } catch (err) {
      console.error('[IncomingCall] Decline failed:', err);
    } finally {
      dismissCall();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeclining, dismissCall]);

  if (!ringingCall) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-[2.5rem] bg-card border border-border/50 shadow-2xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
        {/* Animated background rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
          <div className="absolute w-40 h-40 bg-primary/20 rounded-full animate-ping [animation-duration:2s]"></div>
          <div className="absolute w-56 h-56 border border-primary/20 rounded-full animate-ping [animation-duration:3s]"></div>
        </div>

        <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white text-4xl font-semibold shadow-lg shadow-primary/20">
          {callerName.charAt(0).toUpperCase() || '?'}
        </div>

        <div className="space-y-1 relative z-10">
          <p className="text-2xl font-semibold">{callerName}</p>
          <p className="text-sm text-muted-foreground">Incoming video call</p>
        </div>

        {actionError && (
          <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-xl relative z-10 w-full">
            {actionError}
          </p>
        )}

        {!isAccepting && !isDeclining && (
          <p className="text-xs text-muted-foreground/60 relative z-10">
            Auto-declining in {timeLeft}s
          </p>
        )}

        {(isAccepting || isDeclining) && (
          <p className="text-xs text-muted-foreground/60 relative z-10">
            {isAccepting ? 'Connecting...' : 'Declining...'}
          </p>
        )}

        <div className="flex items-center gap-4 w-full relative z-10">
          <button
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            className="flex-1 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAccepting ? 'Joining...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
