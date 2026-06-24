'use client';

import {
  StreamCall,
  StreamTheme,
  ParticipantView,
  useCallStateHooks,
  useCall,
  SfuModels,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useEffect, useState } from 'react';
import type { Call } from '@stream-io/video-react-sdk';

// ── Call Timer ───────────────────────────────────────────────────────────────
function CallTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return <span className="text-xs font-mono font-black tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">🔴 {mins}:{secs}</span>;
}

// ── Video Grid ───────────────────────────────────────────────────────────────
function VideoGrid() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  return (
    <div className={`flex-1 min-h-0 min-w-0 p-4 grid gap-4 place-content-center w-full h-full ${
      participants.length === 1 ? 'grid-cols-1' :
      participants.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
      participants.length <= 4 ? 'grid-cols-2' :
      'grid-cols-2 md:grid-cols-3'
    }`}>
      {participants.map((p) => (
        <div
          key={p.sessionId}
          className={`relative rounded-[2rem] overflow-hidden bg-secondary/30 border-2 transition-all group shadow-xl ${
            p.isSpeaking ? 'border-primary ring-4 ring-primary/20 shadow-primary/20' : 'border-border/50'
          }`}
        >
          {p.publishedTracks.includes(SfuModels.TrackType.VIDEO) ? (
            <ParticipantView
              participant={p}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-secondary/50 to-secondary/20">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-black mb-3">
                {p.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="text-sm font-bold text-muted-foreground">{p.name}</span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <span className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase truncate max-w-[80%] border border-border/50 shadow-sm">
              {p.name}
              {p.isLocalParticipant && ' (You)'}
            </span>
            {!p.publishedTracks.includes(SfuModels.TrackType.AUDIO) && (
              <span className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center text-xs shadow-sm">🔇</span>
            )}
          </div>

          {p.isSpeaking && (
             <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Ringtone Player ────────────────────────────────────────────────────────────
function RingtonePlayer() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  useEffect(() => {
    if (participants.length === 1) {
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch((err) => console.log('[RingtonePlayer] Audio play blocked:', err));
      
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [participants.length]);

  return null;
}

// ── Call Controls ────────────────────────────────────────────────────────────
function CallControls({ onEnd }: { onEnd: () => void }) {
  const call = useCall();
  const { useMicrophoneState, useCameraState, useScreenShareState } =
    useCallStateHooks();

  const { microphone, isMute: micMuted } = useMicrophoneState();
  const { camera, isMute: camMuted } = useCameraState();
  const { screenShare, status: ssStatus } = useScreenShareState();

  const isScreenSharing = ssStatus === 'enabled';

  const toggleMic = async () => {
    try {
      micMuted ? await microphone.enable() : await microphone.disable();
    } catch (err) {
      console.error('[ActiveCall] Mic toggle failed:', err);
    }
  };

  const toggleCam = async () => {
    try {
      camMuted ? await camera.enable() : await camera.disable();
    } catch (err) {
      console.error('[ActiveCall] Cam toggle failed:', err);
    }
  };

  const toggleScreen = async () => {
    try {
      isScreenSharing
        ? await screenShare.disable()
        : await screenShare.enable();
    } catch (err) {
      console.error('[ActiveCall] Screen share failed:', err);
    }
  };

  const endCall = async () => {
    call?.camera?.disable().catch(() => {});
    call?.microphone?.disable().catch(() => {});
    try {
      await call?.endCall();
    } catch {
      try {
        await call?.leave();
      } catch (err) {
        console.error('[ActiveCall] Leave failed:', err);
      }
    }
    onEnd();
  };

  return (
    <div className="flex items-center justify-center gap-3 p-6 bg-background/80 backdrop-blur-xl border-t border-border/30 shrink-0">
      <button
        onClick={toggleMic}
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-sm ${
          micMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/50'
        }`}
        title={micMuted ? 'Unmute' : 'Mute'}
      >
        <span className="text-xl mb-1">{micMuted ? '🔇' : '🎤'}</span>
        <span className="text-[8px] font-black tracking-widest uppercase opacity-70">{micMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        onClick={toggleCam}
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-sm ${
          camMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/50'
        }`}
        title={camMuted ? 'Start Video' : 'Stop Video'}
      >
        <span className="text-xl mb-1">{camMuted ? '📷' : '📹'}</span>
        <span className="text-[8px] font-black tracking-widest uppercase opacity-70">
          {camMuted ? 'Start' : 'Stop'}
        </span>
      </button>

      <button
        onClick={toggleScreen}
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-sm ${
          isScreenSharing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/50'
        }`}
        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        <span className="text-xl mb-1">🖥️</span>
        <span className="text-[8px] font-black tracking-widest uppercase opacity-70">
          {isScreenSharing ? 'Stop' : 'Share'}
        </span>
      </button>

      <button 
        onClick={endCall} 
        className="flex flex-col items-center justify-center w-16 h-14 ml-2 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/20" 
        title="End Call"
      >
        <span className="text-xl mb-1">📵</span>
        <span className="text-[8px] font-black tracking-widest uppercase">End Call</span>
      </button>
    </div>
  );
}

// ── ActiveCall (root export) ─────────────────────────────────────────────────
export function ActiveCall({
  call,
  onEnd,
  subject,
}: {
  call: Call;
  onEnd: () => void;
  subject?: string;
}) {
  useEffect(() => {
    // Auto-enable devices when joining
    call.camera?.enable().catch((err) => console.error('[ActiveCall] Camera enable failed:', err));
    call.microphone?.enable().catch((err) => console.error('[ActiveCall] Mic enable failed:', err));

    return () => {
      call.camera?.disable().catch(() => {});
      call.microphone?.disable().catch(() => {});
      call.leave().catch(() => {});
    };
  }, [call]);

  return (
    <StreamCall call={call}>
      <StreamTheme>
        <RingtonePlayer />
        <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden font-sans">
          <div className="flex items-center justify-between px-6 py-4 bg-background/50 border-b border-border/30 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-black tracking-widest uppercase text-foreground">
                {subject || 'Study Session'}
              </span>
              <CallTimer />
            </div>
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              🔒 Encrypted
            </span>
          </div>

          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-secondary/5 relative">
            <VideoGrid />
          </div>

          <CallControls onEnd={onEnd} />
        </div>
      </StreamTheme>
    </StreamCall>
  );
}
