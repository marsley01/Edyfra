'use client';

import { useState } from 'react';
import { useVideoContext } from './VideoProvider';
import { DeviceCheck } from './DeviceCheck';

interface StartCallButtonProps {
  roomId: string;
  otherUserId: string;
  otherUserName: string;
}

type Step = 'idle' | 'device-check' | 'calling' | 'error';

export function StartCallButton({
  roomId,
  otherUserId,
  otherUserName,
}: StartCallButtonProps) {
  const { client, setActiveCall } = useVideoContext();
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

    try {
      // Use roomId as the call ID so both sides always join the same call
      const callId = `room-${roomId}`;
      const call = client.call('default', callId);

      console.log('[StartCallButton] Creating call:', callId);

      // Create the call and ring the other user
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
        },
      });

      console.log('[StartCallButton] Call created, ringing:', otherUserId);

      // Join the call ourselves
      await call.join({ create: false });

      console.log('[StartCallButton] Joined call successfully');
      setActiveCall(call);
    } catch (err: any) {
      console.error('[StartCallButton] Call start failed:', err);
      setErrorMsg(
        err.message || 'Failed to start call. Please try again.'
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
        <audio src="/sounds/popcorn.mp3" autoPlay loop />
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-primary/20 text-2xl text-primary">📞</div>
        <p className="text-sm font-bold text-foreground">Calling {otherUserName}...</p>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Waiting for them to answer</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center space-y-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-center">
        <p className="text-sm font-medium text-red-500">⚠️ {errorMsg}</p>
        <button onClick={() => setStep('idle')} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">Try Again</button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartCall}
      disabled={!client}
      className="flex items-center gap-2 h-10 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-600/20 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
      title={`Start video call with ${otherUserName}`}
    >
      <span className="text-sm">📹</span>
      <span className="hidden sm:inline">Start Video Call</span>
    </button>
  );
}
