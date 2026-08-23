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
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange shadow-inner">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Before you join</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Camera and microphone access are needed for the video call.
        </p>
      </div>

      {error && (
        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl text-left">
          {error}
        </div>
      )}

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={checkDevices}
          disabled={checking}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking...' : 'Allow Camera & Mic'}
        </button>

        <button 
          className="w-full h-12 bg-secondary/50 hover:bg-secondary text-foreground rounded-xl transition-all text-sm font-medium"
          onClick={checkAudioOnly}
        >
          Join with audio only
        </button>
      </div>
    </div>
  );
}
