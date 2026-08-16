'use client';

import {
  StreamCall,
  ParticipantView,
  useCallStateHooks,
  useCall,
  SfuModels,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useEffect, useRef, useState } from 'react';
import type { Call } from '@stream-io/video-react-sdk';

function CallTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span className="text-xs tabular-nums text-foreground/40">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function VideoGrid() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  const cols = participants.length === 1 ? 'grid-cols-1'
    : participants.length === 2 ? 'grid-cols-1 sm:grid-cols-2'
    : participants.length <= 4 ? 'grid-cols-2'
    : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={`absolute inset-0 p-2 sm:p-4 grid gap-2 sm:gap-3 ${cols} place-items-stretch auto-rows-fr`}>
      {participants.map((p) => (
        <div
          key={p.sessionId}
          className={`relative min-h-0 rounded-3xl overflow-hidden bg-card ring-1 transition-all ${
            p.isSpeaking
              ? 'ring-primary/40 ring-2 shadow-primary/10'
              : 'ring-border/30'
          }`}
        >
          {p.publishedTracks.includes(SfuModels.TrackType.VIDEO) ? (
            <ParticipantView
              participant={p}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-card to-secondary/30">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl sm:text-3xl font-medium mb-2">
                {p.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium text-muted-foreground">{p.name}</span>
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/90 truncate max-w-[70%]">
              {p.name}
              {p.isLocalParticipant && ' (You)'}
            </span>
            {!p.publishedTracks.includes(SfuModels.TrackType.AUDIO) && (
              <span className="w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center text-[10px] font-medium">
                M
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CallControls({ onEnd }: { onEnd: () => void }) {
  const call = useCall();
  const { useMicrophoneState, useCameraState } = useCallStateHooks();

  const { microphone, isMute: micMuted } = useMicrophoneState();
  const { camera, isMute: camMuted } = useCameraState();

  const toggleMic = async () => {
    try {
      micMuted ? await microphone.enable() : await microphone.disable();
    } catch {}
  };

  const toggleCam = async () => {
    try {
      camMuted ? await camera.enable() : await camera.disable();
    } catch {}
  };

  const endCall = async () => {
    try { call?.camera?.disable(); } catch {}
    try { call?.microphone?.disable(); } catch {}
    (call as any)?.stream?.getTracks()?.forEach((t: MediaStreamTrack) => t.stop());
    try { await call?.endCall(); } catch { try { await call?.leave(); } catch {} }
    onEnd();
  };

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6 py-6 sm:py-8 px-6 shrink-0">
      <ControlButton
        active={!micMuted}
        label={micMuted ? 'Muted' : 'Mute'}
        muted={micMuted}
        onClick={toggleMic}
      >
        {micMuted ? 'Mic Off' : 'Mic'}
      </ControlButton>

      <EndCallButton onClick={endCall} />

      <ControlButton
        active={!camMuted}
        label={camMuted ? 'Camera Off' : 'Camera'}
        muted={camMuted}
        onClick={toggleCam}
      >
        {camMuted ? 'Cam Off' : 'Cam'}
      </ControlButton>
    </div>
  );
}

function ControlButton({
  active,
  label,
  muted,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  muted: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
        muted
          ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/20'
          : 'bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 active:scale-95'
      }`}>
        <span className="text-[11px] font-semibold tracking-tight">{children}</span>
      </div>
      <span className="text-[10px] font-medium text-white/60 group-hover:text-white/80 transition-colors">
        {label}
      </span>
    </button>
  );
}

function EndCallButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all duration-200">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </div>
      <span className="text-[10px] font-medium text-white/60">End</span>
    </button>
  );
}

export function ActiveCall({
  call,
  onEnd,
  subject,
}: {
  call: Call;
  onEnd: () => void;
  subject?: string;
}) {
  const onEndRef = useRef(onEnd);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  useEffect(() => {
    call.camera?.enable().catch(() => {});
    call.microphone?.enable().catch(() => {});

    const handleEnded = () => onEndRef.current();
    const unsubEnded = call.on('call.ended', handleEnded);
    const unsubRejected = call.on('call.rejected', handleEnded);

    return () => {
      call.camera?.disable().catch(() => {});
      call.microphone?.disable().catch(() => {});
      call.leave().catch(() => {});
      navigator.mediaDevices?.enumerateDevices().then(() => {
        setTimeout(() => {
          (call.camera as any)?.state?.mediaStream?.getTracks()?.forEach((t: MediaStreamTrack) => t.stop());
          (call.microphone as any)?.state?.mediaStream?.getTracks()?.forEach((t: MediaStreamTrack) => t.stop());
        }, 100);
      }).catch(() => {});
      unsubEnded();
      unsubRejected();
    };
  }, [call.id]);

  return (
    <StreamCall call={call}>
      <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 overflow-hidden">
        <div className="relative flex-1 min-h-0">
          <VideoGrid />

          <div className="absolute top-6 left-0 right-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md">
              <span className="text-sm font-medium text-white/80">{subject || 'Call'}</span>
              <CallTimer />
            </div>
          </div>
        </div>

        <CallControls onEnd={onEnd} />
      </div>
    </StreamCall>
  );
}
