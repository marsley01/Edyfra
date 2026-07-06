'use client';

import { useState, useRef, useEffect } from 'react';
import { useVideoContext } from './VideoProvider';
import { DeviceCheck } from './DeviceCheck';
import { playOutgoingTone } from '@/lib/sounds';
import { CALL_SETTINGS } from '@/components/stream/styles/callSettings';
import type { Call } from '@stream-io/video-react-sdk';

interface StartCallButtonProps {
  roomId: string;
  otherUserId: string;
  otherUserName: string;
}

type Step = 'idle' | 'device-check' | 'calling' | 'error';

const RING_TIMEOUT_MS = 40_000; // 40 seconds before auto-cancel

export function StartCallButton({
  roomId,
  otherUserId,
  otherUserName,
}: StartCallButtonProps) {
  const { client, setActiveCall } = useVideoContext();
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const outgoingCallRef = useRef<Call | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSoundRef = useRef<(() => void) | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopSoundRef.current?.();
    };
  }, []);

  const cancelOutgoingCall = async (reason = 'cancelled') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopSoundRef.current?.();
    const call = outgoingCallRef.current;
    if (call) {
      try {
        await call.reject();
        console.log('[StartCallButton] Outgoing call cancelled:', reason);
      } catch (err) {
        console.error('[StartCallButton] Cancel/reject failed:', err);
      }
      outgoingCallRef.current = null;
    }
  };

  const handleStartCall = () => {
    if (localStorage.getItem('edyfra_video_perm') === 'granted') {
      handleDevicesReady();
    } else {
      setStep('device-check');
    }
  };

  const handleDevicesReady = async () => {
    if (!client) {
      setErrorMsg('Video service not ready. Please refresh the page.');
      setStep('error');
      return;
    }

    setStep('calling');
    stopSoundRef.current = playOutgoingTone();

    try {
      // Unique call ID per attempt so it rings every time
      const callId = `room-${roomId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const call = client.call('default', callId);
      outgoingCallRef.current = call;

      console.log('[StartCallButton] Creating ring call:', callId, '→ ringing:', otherUserId);

      await call.getOrCreate({
        ring: true,
        data: {
          members: [
            { user_id: client.streamClient.user!.id },
            { user_id: otherUserId },
          ],
          custom: {
            roomId,
            startedBy: client.streamClient.user!.name,
          },
          settings_override: CALL_SETTINGS as any,
        },
      });

      console.log('[StartCallButton] Call created, waiting for acceptance...');

      // Auto-cancel after timeout
      timeoutRef.current = setTimeout(async () => {
        console.log('[StartCallButton] Ring timed out — auto-cancelling');
        await cancelOutgoingCall('timeout');
        setErrorMsg(`${otherUserName} didn't answer. Try again.`);
        setStep('error');
      }, RING_TIMEOUT_MS);

      let unsubscribeAccepted: (() => void) | undefined;
      let unsubscribeRejected: (() => void) | undefined;
      let unsubscribeEnded: (() => void) | undefined;

      const cleanup = () => {
        unsubscribeAccepted?.();
        unsubscribeRejected?.();
        unsubscribeEnded?.();
        stopSoundRef.current?.();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      unsubscribeAccepted = call.on('call.accepted', async () => {
        console.log('[StartCallButton] ✅ Call accepted by remote — joining now');
        cleanup();

        try {
          await call.join({ create: false });
          console.log('[StartCallButton] Caller joined call successfully');
          outgoingCallRef.current = null;
          setActiveCall(call);
          setStep('idle');
        } catch (joinErr: any) {
          console.error('[StartCallButton] Caller join failed after accept:', joinErr);
          await cancelOutgoingCall('join-failed');
          setErrorMsg(joinErr?.message || 'Failed to connect to the call. Please try again.');
          setStep('error');
        }
      });

      unsubscribeRejected = call.on('call.rejected', (event: any) => {
        console.log('[StartCallButton] Call rejected:', event);
        cleanup();
        outgoingCallRef.current = null;
        setErrorMsg(`${otherUserName} declined the call.`);
        setStep('error');
      });

      unsubscribeEnded = call.on('call.ended', (event: any) => {
        console.log('[StartCallButton] Call ended unexpectedly:', event);
        cleanup();
        outgoingCallRef.current = null;
        setStep('idle');
      });
    } catch (err: any) {
      console.error('[StartCallButton] Call start failed:', err);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      outgoingCallRef.current = null;
      setErrorMsg(
        err?.message?.includes('already') || err?.message?.includes('exists')
          ? 'A call is already in progress. Please try again in a moment.'
          : err.message || 'Failed to start call. Please try again.'
      );
      setStep('error');
    }
  };

  const handleDevicesDenied = () => {
    setStep('idle');
  };

  if (step === 'device-check') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-3xl bg-card border border-border/50 shadow-2xl p-6">
          <DeviceCheck
            onReady={handleDevicesReady}
            onDenied={handleDevicesDenied}
          />
        </div>
      </div>
    );
  }

  if (step === 'calling') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-primary/20 text-2xl text-primary">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">Calling {otherUserName}...</p>
        <p className="text-xs text-muted-foreground">Waiting for them to answer</p>
        <button
          onClick={async () => {
            await cancelOutgoingCall('user-cancelled');
            setStep('idle');
          }}
          className="mt-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium transition-colors rounded-xl"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center space-y-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-center">
        <p className="text-sm font-medium text-red-500">⚠️ {errorMsg}</p>
        <button
          onClick={() => setStep('idle')}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-xl transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartCall}
      disabled={!client}
      className="flex items-center gap-2 h-10 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-600/20 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      title={!client ? 'Video service connecting...' : `Start video call with ${otherUserName}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
      <span className="hidden sm:inline">Video Call</span>
    </button>
  );
}
