'use client';

import { useState } from 'react';
import { Video, Mic, Loader2 } from 'lucide-react';
import { probeMedia } from '@/lib/video/media';

interface DeviceCheckProps {
  /** Called once at least the microphone works. `video` is false for audio-only. */
  onReady: (opts: { video: boolean }) => void;
  /** Called when the user backs out. */
  onDenied: () => void;
}

/**
 * Pre-call permission step. Triggers the browser prompt, explains exactly
 * what went wrong when access is blocked, and lets people join by voice
 * when only the camera is unavailable.
 */
export function DeviceCheck({ onReady, onDenied }: DeviceCheckProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraIssue, setCameraIssue] = useState<string | null>(null);

  const checkDevices = async () => {
    setChecking(true);
    setError(null);
    setCameraIssue(null);
    const result = await probeMedia();
    setChecking(false);

    if (result.audio && result.video) {
      onReady({ video: true });
      return;
    }
    if (result.audio) {
      // Mic works, camera doesn't: say why and offer voice-only
      setCameraIssue(result.videoError?.message ?? 'Your camera is unavailable.');
      return;
    }
    setError(result.error?.message ?? 'Could not access your microphone.');
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange shadow-inner">
        <Video className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Before you call</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your browser will ask to use your camera and microphone.
        </p>
      </div>

      {error && (
        <div role="alert" className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl text-left">
          {error}
        </div>
      )}
      {cameraIssue && (
        <div role="status" className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs p-3 rounded-xl text-left">
          {cameraIssue} You can still call with audio only.
        </div>
      )}

      <div className="w-full flex flex-col gap-3">
        {cameraIssue ? (
          <button
            onClick={() => onReady({ video: false })}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <Mic className="h-4 w-4" /> Call with audio only
          </button>
        ) : (
          <button
            onClick={checkDevices}
            disabled={checking}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            {checking ? 'Checking…' : error ? 'Try again' : 'Allow camera & mic'}
          </button>
        )}

        {cameraIssue && (
          <button
            onClick={checkDevices}
            disabled={checking}
            className="w-full h-12 bg-secondary/50 hover:bg-secondary text-foreground rounded-xl transition-all text-sm font-medium disabled:opacity-50"
          >
            Retry camera
          </button>
        )}

        <button
          className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl transition-all text-sm font-medium"
          onClick={onDenied}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
