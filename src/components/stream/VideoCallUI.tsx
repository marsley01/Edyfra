"use client";

import { 
  StreamCall, 
  SpeakerLayout, 
  CallControls, 
  useCallStateHooks,
  CallingState
} from "@stream-io/video-react-sdk";
import { Loader2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VideoCallUI({ onLeave }: { onLeave: () => void }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background/80 backdrop-blur-md z-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">
          Joining Video Classroom...
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden rounded-2xl md:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col">
      <StreamCall>
        <SpeakerLayout participantsBarPosition="bottom" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
           <CallControls onLeave={onLeave} />
        </div>
      </StreamCall>
      
      {/* Custom Header for the Video Call */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Session</span>
        </div>
      </div>
    </div>
  );
}
