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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-[2.5rem] bg-card border border-border/50 shadow-2xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
        {/* Animated background rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
          <div className="absolute w-40 h-40 bg-primary/20 rounded-full animate-ping [animation-duration:2s]"></div>
          <div className="absolute w-56 h-56 border border-primary/20 rounded-full animate-ping [animation-duration:3s]"></div>
        </div>

        <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-primary/20">
          {callerName.charAt(0).toUpperCase()}
        </div>

        <div className="space-y-1 relative z-10">
          <p className="text-2xl font-black tracking-tight">{callerName}</p>
          <p className="text-sm font-medium text-muted-foreground">Incoming video call</p>
        </div>
        
        {actionError && (
          <p className="text-xs font-medium text-red-500 bg-red-500/10 px-3 py-2 rounded-xl relative z-10">
            {actionError}
          </p>
        )}
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 relative z-10">
          Auto-declining in {timeLeft}s
        </p>

        <div className="flex items-center gap-4 w-full relative z-10">
          <button onClick={handleDecline} className="flex-1 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-[10px] tracking-widest uppercase transition-colors">
            ✕ Decline
          </button>
          <button onClick={handleAccept} className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-500/20 transition-all">
            ✓ Accept
          </button>
        </div>
      </div>
    </div>
  );
}
