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
      <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 text-3xl shadow-inner">
        📹
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black tracking-tight text-foreground">Before you join</h3>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
          Edyfra needs access to your camera and microphone for the video call.
        </p>
      </div>

      {error && (
        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium p-3 rounded-xl text-left">
          {error}
        </div>
      )}

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={checkDevices}
          disabled={checking}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking...' : 'Allow Camera & Mic'}
        </button>

        <button 
          className="w-full h-12 bg-secondary/50 hover:bg-secondary text-foreground rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
          onClick={checkAudioOnly}
        >
          Join with audio only
        </button>
      </div>
    </div>
  );
}
