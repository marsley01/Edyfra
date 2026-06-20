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
      <div className="call-modal-overlay">
        <div className="call-modal">
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
      <div className="calling-state">
        <audio src="/sounds/popcorn.mp3" autoPlay loop />
        <div className="calling-pulse">📞</div>
        <p>Calling {otherUserName}...</p>
        <p className="calling-sub">Waiting for them to answer</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="call-error">
        <p>⚠️ {errorMsg}</p>
        <button onClick={() => setStep('idle')}>Try Again</button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartCall}
      disabled={!client}
      className="start-call-btn"
      title={`Start video call with ${otherUserName}`}
    >
      <span>📹</span>
      <span>Start Video Call</span>
    </button>
  );
}
