"use client";

import {
  SpeakerLayout,
  GridLayout,
  CallControls,
  useCallStateHooks,
  CallingState,
  ParticipantView,
  StreamTheme,
  useCall,
  CallParticipantsList,
} from "@stream-io/video-react-sdk";
import {
  Loader2,
  Users,
  LayoutGrid,
  Monitor,
  Settings,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VideoCallUI({ onLeave }: { onLeave: () => void }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState === CallingState.JOINED) {
    return <ConferenceRoom onLeave={onLeave} />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white p-8">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center relative z-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-black uppercase tracking-widest mb-2">
        {callingState === CallingState.JOINING
          ? "Joining Room"
          : callingState === CallingState.RECONNECTING
          ? "Reconnecting"
          : "Connecting"}
      </h2>
      <p className="text-[11px] text-white/40 font-bold uppercase tracking-[0.3em]">
        Setting up your secure study environment
      </p>
    </div>
  );
}

function ConferenceRoom({ onLeave }: { onLeave: () => void }) {
  const [layout, setLayout] = useState<"speaker" | "grid">("speaker");
  const [showParticipants, setShowParticipants] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { useParticipants, useRemoteParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const remoteParticipants = useRemoteParticipants();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="relative h-full w-full bg-[#0a0a0a] overflow-hidden flex flex-col group/room">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-50 transition-opacity duration-300 group-hover/room:opacity-100 opacity-0 md:opacity-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              End-to-End Encrypted
            </span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2 text-white/60">
            <Users className="h-4 w-4" />
            <span className="text-xs font-bold">{participants.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayout(layout === "speaker" ? "grid" : "speaker")}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        <div className={cn(
          "flex-1 relative",
          showParticipants && "hidden lg:block"
        )}>
          <StreamTheme>
            {layout === "speaker" ? (
              <SpeakerLayout participantsBarPosition="bottom" />
            ) : (
              <GridLayout />
            )}
          </StreamTheme>
        </div>

        {/* Sidebar for Participants */}
        {showParticipants && (
          <div className="w-full lg:w-80 bg-zinc-900 border-l border-white/5 flex flex-col z-40">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Participants</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowParticipants(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CallParticipantsList onClose={() => setShowParticipants(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-50 pointer-events-none transition-transform duration-500 group-hover/room:translate-y-0 translate-y-2">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="bg-zinc-900/80 backdrop-blur-3xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowParticipants(!showParticipants)}
                className={cn(
                  "h-12 w-12 rounded-2xl transition-all",
                  showParticipants ? "bg-primary text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Users className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <StreamTheme>
                <CallControls onLeave={onLeave} />
              </StreamTheme>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-2xl text-white/60 hover:bg-white/5 hover:text-white transition-all"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State / Background */}
      {remoteParticipants.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto animate-pulse">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-widest">Waiting for partner</p>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                Your secure session is active
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
