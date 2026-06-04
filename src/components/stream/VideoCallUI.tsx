"use client";

import {
  SpeakerLayout,
  CallControls,
  useCallStateHooks,
  CallingState,
  ParticipantView,
  StreamTheme,
  useCall,
} from "@stream-io/video-react-sdk";
import { Loader2, WifiLow, Signal, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export function VideoCallUI({ onLeave }: { onLeave: () => void }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState === CallingState.JOINED) {
    return <InCallUI onLeave={onLeave} />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-zinc-900 to-black text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
        <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
      </div>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-white/80">
        {callingState === CallingState.JOINING
          ? "Joining the room…"
          : callingState === CallingState.RINGING
            ? "Ringing…"
            : callingState === CallingState.RECONNECTING
              ? "Reconnecting…"
              : "Connecting…"}
      </p>
      <p className="mt-2 text-[10px] text-white/40 font-medium">
        Hang on — we&apos;re connecting your audio and video
      </p>
    </div>
  );
}

function InCallUI({ onLeave }: { onLeave: () => void }) {
  const { useRemoteParticipants, useIsCallRecordingInProgress } =
    useCallStateHooks();
  const remoteParticipants = useRemoteParticipants();
  const isRecording = useIsCallRecordingInProgress();

  return (
    <div className="relative h-full w-full bg-black overflow-hidden rounded-2xl md:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            Live
          </span>
          <span className="text-[10px] text-white/50 font-bold">
            {remoteParticipants.length + 1} in call
          </span>
          {isRecording && (
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 ml-2">
              · REC
            </span>
          )}
        </div>
        <ConnectionQualityBadge />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-24">
        {remoteParticipants.length === 0 ? (
          <WaitingForOthers />
        ) : (
          <SpeakerLayout participantsBarPosition="bottom" />
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <StreamTheme>
          <CallControls onLeave={onLeave} />
        </StreamTheme>
      </div>
    </div>
  );
}

function ConnectionQualityBadge() {
  const { useCallStatsReport } = useCallStateHooks();
  const stats = useCallStatsReport();
  const [quality, setQuality] = useState<"good" | "ok" | "bad" | "unknown">(
    "good",
  );

  useEffect(() => {
    const raw = (stats as any)?.qualityScore ?? (stats as any)?.score;
    if (typeof raw === "number") {
      if (raw >= 80) setQuality("good");
      else if (raw >= 50) setQuality("ok");
      else setQuality("bad");
    } else {
      setQuality("good");
    }
  }, [stats]);

  if (quality === "good") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-black uppercase tracking-widest">
        <Signal className="h-3 w-3" /> HD
      </span>
    );
  }
  if (quality === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[9px] font-black uppercase tracking-widest">
        <WifiLow className="h-3 w-3" /> SD
      </span>
    );
  }
  if (quality === "bad") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[9px] font-black uppercase tracking-widest">
        <Wifi className="h-3 w-3" /> Low
      </span>
    );
  }
  return null;
}

function WaitingForOthers() {
  const { useLocalParticipant } = useCallStateHooks();
  const local = useLocalParticipant();
  return (
    <div className="flex flex-col items-center justify-center text-center text-white/80 max-w-md mx-auto">
      <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-4 bg-zinc-900">
        {local && <ParticipantView participant={local} />}
      </div>
      <p className="text-sm font-bold">You&apos;re live</p>
      <p className="text-[11px] text-white/50 mt-1">
        Waiting for others to join. We&apos;ll ring them now.
      </p>
    </div>
  );
}
