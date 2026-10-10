'use client';

import {
  StreamCall,
  ParticipantView,
  useCallStateHooks,
  useCall,
  SfuModels,
  CallingState,
  OwnCapability,
  type StreamVideoParticipant,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  LogOut,
  Settings2,
  SwitchCamera,
  Loader2,
  Volume2,
  X,
} from 'lucide-react';
import type { Call } from '@stream-io/video-react-sdk';
import { showInfo } from '@/lib/toast';
import { mediaErrorMessage } from '@/lib/video/call-utils';

/** Grace period before a 1:1 call ends after the other person drops. */
const PEER_LEFT_GRACE_MS = 10_000;

/**
 * Pending leave() per call. React StrictMode (dev) runs effect cleanups once
 * on mount; deferring the leave and cancelling it on remount stops that from
 * hanging up a call that just connected.
 */
const pendingLeave = new WeakMap<Call, ReturnType<typeof setTimeout>>();

function CallTimer() {
  const { useCallSession } = useCallStateHooks();
  const session = useCallSession();
  const startedAt = session?.started_at ? new Date(session.started_at).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const seconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span className="text-xs tabular-nums text-white/60">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function Placeholder({ participant }: { participant: StreamVideoParticipant }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-800">
      {participant.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={participant.image} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mb-2" />
      ) : (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl sm:text-3xl font-medium mb-2">
          {participant.name?.charAt(0).toUpperCase() || '?'}
        </div>
      )}
      <span className="text-sm font-medium text-white/70">{participant.name || 'Guest'}</span>
    </div>
  );
}

function VideoGrid() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  const cols =
    participants.length <= 1
      ? 'grid-cols-1'
      : participants.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : participants.length <= 4
          ? 'grid-cols-2'
          : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={`absolute inset-0 p-2 sm:p-4 grid gap-2 sm:gap-3 ${cols} place-items-stretch auto-rows-fr`}>
      {participants.map((p) => (
        <div
          key={p.sessionId}
          className={`relative min-h-0 rounded-3xl overflow-hidden bg-neutral-900 ring-1 transition-all ${
            p.isSpeaking ? 'ring-primary/60 ring-2' : 'ring-white/10'
          }`}
        >
          {/* Always render ParticipantView: it also plays the participant's
              audio, so people with their camera off are still heard. */}
          <ParticipantView
            participant={p}
            ParticipantViewUI={null}
            VideoPlaceholder={Placeholder}
            className="absolute inset-0 w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
          />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/90 truncate max-w-[70%]">
              {p.name || 'Guest'}
              {p.isLocalParticipant && ' (you)'}
            </span>
            {!p.publishedTracks.includes(SfuModels.TrackType.AUDIO) && (
              <span className="w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center" aria-label="Muted">
                <MicOff className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeviceMenu({ onClose }: { onClose: () => void }) {
  const { useCameraState, useMicrophoneState, useSpeakerState } = useCallStateHooks();
  const cam = useCameraState();
  const mic = useMicrophoneState();
  const spk = useSpeakerState();
  const cameras = cam.devices ?? [];
  const mics = mic.devices ?? [];
  const speakers = spk.devices ?? [];

  const select = (label: string, devices: MediaDeviceInfo[], value: string | undefined, onChange: (id: string) => void) =>
    devices.length > 0 && (
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-white/60">{label}</span>
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded-xl bg-white/10 text-white text-sm px-3 outline-none focus:ring-2 focus:ring-primary/50 [&>option]:text-black"
        >
          {!value && <option value="">Default</option>}
          {devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || `${label} ${i + 1}`}
            </option>
          ))}
        </select>
      </label>
    );

  return (
    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 p-4 space-y-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Devices</p>
        <button onClick={onClose} aria-label="Close device settings" className="text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      {select('Camera', cameras, cam.selectedDevice, (id) => void cam.camera.select(id).catch(() => {}))}
      {select('Microphone', mics, mic.selectedDevice, (id) => void mic.microphone.select(id).catch(() => {}))}
      {spk.isDeviceSelectionSupported &&
        select('Speaker', speakers, spk.selectedDevice, (id) => spk.speaker.select(id))}
      {cameras.length === 0 && mics.length === 0 && (
        <p className="text-xs text-white/60">No devices found. Allow camera and microphone access to choose devices.</p>
      )}
    </div>
  );
}

function CallControls({ onLeave }: { onLeave: (endForAll: boolean) => void }) {
  const call = useCall();
  const { useMicrophoneState, useCameraState, useHasPermissions, useCallMembers } = useCallStateHooks();
  const { microphone, optimisticIsMute: micMuted, hasBrowserPermission: micAllowed } = useMicrophoneState();
  const { camera, optimisticIsMute: camMuted, hasBrowserPermission: camAllowed, devices: cams } = useCameraState();
  const canEndForAll = useHasPermissions(OwnCapability.END_CALL);
  const members = useCallMembers();
  const [showDevices, setShowDevices] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const isGroup = members.length > 2;

  const toggleMic = async () => {
    if (!micAllowed) {
      showInfo('Microphone blocked', { description: mediaErrorMessage('denied') });
      return;
    }
    await microphone.toggle().catch(() => {});
  };

  const toggleCam = async () => {
    if (!camAllowed) {
      showInfo('Camera blocked', { description: mediaErrorMessage('denied') });
      return;
    }
    await camera.toggle().catch(() => {});
  };

  return (
    <div className="relative flex items-center justify-center gap-3 sm:gap-5 py-5 sm:py-7 px-4 shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {showDevices && <DeviceMenu onClose={() => setShowDevices(false)} />}

      <ControlButton label={micMuted ? 'Unmute' : 'Mute'} muted={micMuted} onClick={toggleMic}>
        {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </ControlButton>

      <ControlButton label={camMuted ? 'Start video' : 'Stop video'} muted={camMuted} onClick={toggleCam}>
        {camMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </ControlButton>

      {(cams?.length ?? 0) > 1 && !camMuted && (
        <ControlButton label="Flip" muted={false} onClick={() => void camera.flip().catch(() => {})} className="sm:hidden">
          <SwitchCamera className="h-5 w-5" />
        </ControlButton>
      )}

      <ControlButton label="Devices" muted={false} onClick={() => setShowDevices((s) => !s)}>
        <Settings2 className="h-5 w-5" />
      </ControlButton>

      {isGroup && canEndForAll && call?.isCreatedByMe ? (
        confirmEnd ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLeave(true)}
              className="h-12 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
            >
              End for everyone
            </button>
            <button
              onClick={() => onLeave(false)}
              className="h-12 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" /> Just leave
            </button>
          </div>
        ) : (
          <HangUpButton onClick={() => setConfirmEnd(true)} label="Leave" />
        )
      ) : (
        // In a 1:1 call, hanging up ends it for both sides
        <HangUpButton onClick={() => onLeave(!isGroup && canEndForAll)} label={isGroup ? 'Leave' : 'End'} />
      )}
    </div>
  );
}

function ControlButton({
  label,
  muted,
  onClick,
  children,
  className = '',
}: {
  label: string;
  muted: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button onClick={onClick} aria-label={label} className={`flex flex-col items-center gap-1.5 group ${className}`}>
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
          muted
            ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/20'
            : 'bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 active:scale-95'
        }`}
      >
        {children}
      </div>
      <span className="text-[10px] font-medium text-white/60 group-hover:text-white/80 transition-colors">{label}</span>
    </button>
  );
}

function HangUpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1.5 group">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all duration-200">
        <PhoneOff className="h-6 w-6 text-white" />
      </div>
      <span className="text-[10px] font-medium text-white/60">{label}</span>
    </button>
  );
}

/** Banners for reconnecting, blocked audio playback and blocked devices. */
function CallStatusBanner() {
  const call = useCall();
  const { useCallCallingState, useIsAutoplayBlocked, useMicrophoneState, useCameraState } = useCallStateHooks();
  const state = useCallCallingState();
  const autoplayBlocked = useIsAutoplayBlocked();
  const { hasBrowserPermission: micAllowed } = useMicrophoneState();
  const { hasBrowserPermission: camAllowed } = useCameraState();

  let content: React.ReactNode = null;
  if (state === CallingState.RECONNECTING || state === CallingState.MIGRATING) {
    content = (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reconnecting…
      </>
    );
  } else if (state === CallingState.OFFLINE) {
    content = <>You're offline. We'll reconnect when your connection is back.</>;
  } else if (autoplayBlocked) {
    content = (
      <button onClick={() => void call?.resumeAudio()} className="flex items-center gap-1.5 underline underline-offset-2">
        <Volume2 className="h-3.5 w-3.5" /> Tap to hear the call
      </button>
    );
  } else if (!micAllowed && !camAllowed) {
    content = <>Camera and microphone are blocked. Allow them in your browser's site settings.</>;
  } else if (!micAllowed) {
    content = <>Microphone is blocked. Allow it in your browser's site settings so others can hear you.</>;
  }

  if (!content) return null;
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100vw-2rem)] flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/90 text-black text-xs font-medium shadow-lg">
      {content}
    </div>
  );
}

/** Ends a 1:1 call when the other person has been gone for a while. */
function PeerLeftWatcher({ onPeerGone }: { onPeerGone: () => void }) {
  const { useRemoteParticipants, useCallMembers } = useCallStateHooks();
  const remote = useRemoteParticipants();
  const members = useCallMembers();
  const hadPeer = useRef(false);
  const cbRef = useRef(onPeerGone);
  cbRef.current = onPeerGone;

  useEffect(() => {
    if (remote.length > 0) {
      hadPeer.current = true;
      return;
    }
    if (!hadPeer.current || members.length > 2) return;
    const t = setTimeout(() => cbRef.current(), PEER_LEFT_GRACE_MS);
    return () => clearTimeout(t);
  }, [remote.length, members.length]);

  return null;
}

function CallBody({ call, subject, onLeave }: { call: Call; subject?: string; onLeave: (endForAll: boolean) => void }) {
  const { useCallCustomData } = useCallStateHooks();
  const custom = useCallCustomData() as { subject?: string } | undefined;
  const title = subject || custom?.subject || 'Video call';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 overflow-hidden">
      <div className="relative flex-1 min-h-0">
        <VideoGrid />
        <div className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-0 right-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md max-w-[calc(100vw-2rem)]">
            <span className="text-sm font-medium text-white/85 truncate">{title}</span>
            <CallTimer />
          </div>
        </div>
        <CallStatusBanner />
      </div>
      <CallControls onLeave={onLeave} />
      <PeerLeftWatcher
        onPeerGone={() => {
          showInfo('The other person left the call');
          void call.leave().catch(() => {});
        }}
      />
    </div>
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
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    // Cancel a leave scheduled by a StrictMode double-invoke
    const pending = pendingLeave.get(call);
    if (pending) {
      clearTimeout(pending);
      pendingLeave.delete(call);
    }

    const sub = call.state.callingState$.subscribe((state) => {
      if (state === CallingState.LEFT || state === CallingState.RECONNECTING_FAILED) {
        if (state === CallingState.RECONNECTING_FAILED) {
          showInfo('Call disconnected', { description: 'We lost the connection to the call.' });
          void call.leave().catch(() => {});
        }
        onEndRef.current();
      }
    });

    return () => {
      sub.unsubscribe();
      // Unmounted while still in the call (navigated away): leave it, but on
      // the next tick so a StrictMode remount can cancel this.
      pendingLeave.set(
        call,
        setTimeout(() => {
          pendingLeave.delete(call);
          if (call.state.callingState !== CallingState.LEFT) {
            void call.leave().catch(() => {});
          }
        }, 0),
      );
    };
  }, [call]);

  const leave = async (endForAll: boolean) => {
    try {
      if (endForAll) {
        await call.endCall();
      }
    } catch (err) {
      console.warn('[ActiveCall] endCall failed, leaving instead:', err);
    }
    if (call.state.callingState !== CallingState.LEFT) {
      await call.leave().catch(() => {});
    }
    onEndRef.current();
  };

  return (
    <StreamCall call={call}>
      <CallBody call={call} subject={subject} onLeave={(e) => void leave(e)} />
    </StreamCall>
  );
}
