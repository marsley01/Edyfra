'use client';

import { useState } from 'react';

interface DeviceCheckProps {
  onReady: () => void;
  onDenied: () => void;
}

export function DeviceCheck({ onReady, onDenied }: DeviceCheckProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDevices = async () => {
    setChecking(true);
    setError(null);

    try {
      // Request both camera and mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Got access — stop the test stream immediately
      stream.getTracks().forEach((t) => t.stop());
      localStorage.setItem('edyfra_video_perm', 'granted');
      onReady();
    } catch (err: any) {
      console.error('[DeviceCheck] Device access error:', err);

      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setError(
          'Camera and microphone access was denied. Please allow access in your browser settings and try again.'
        );
        onDenied();
      } else if (err.name === 'NotFoundError') {
        setError(
          'No camera or microphone found. Please connect a device and try again.'
        );
        onDenied();
      } else {
        setError('Could not access your camera or microphone. Please try again.');
        onDenied();
      }
    } finally {
      setChecking(false);
    }
  };

  const checkAudioOnly = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        s.getTracks().forEach((t) => t.stop());
        onReady();
      })
      .catch(() => onDenied());
  };

  return (
    <div className="device-check">
      <div className="device-check-icon">📹</div>
      <h3>Before you join</h3>
      <p>Edyfra needs access to your camera and microphone for the video call.</p>

      {error && <div className="device-error">{error}</div>}

      <button
        onClick={checkDevices}
        disabled={checking}
        className="device-check-btn"
      >
        {checking ? 'Checking...' : 'Allow Camera and Microphone'}
      </button>

      <button className="audio-only-btn" onClick={checkAudioOnly}>
        Join with audio only
      </button>
    </div>
  );
}
