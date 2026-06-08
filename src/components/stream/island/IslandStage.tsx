"use client";

import { ParticipantView, SpeakerLayout, StreamTheme } from "@stream-io/video-react-sdk";

interface IslandStageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  local: any;
  remotesCount: number;
}

/**
 * The video stage inside the expanded panel.
 * Uses SpeakerLayout when there are remote participants,
 * otherwise shows a "waiting for others" placeholder.
 */
export function IslandStage({ local, remotesCount }: IslandStageProps) {
  return (
    <StreamTheme>
      {remotesCount === 0 ? (
        <WaitingForOthers local={local} />
      ) : (
        <SpeakerLayout participantsBarPosition="bottom" />
      )}
    </StreamTheme>
  );
}

function WaitingForOthers({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  local,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  local: any;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center text-foreground/80 max-w-md mx-auto">
      <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-4 bg-card">
        {local && <ParticipantView participant={local} />}
      </div>
      <p className="text-sm font-bold text-foreground">You&apos;re live</p>
      <p className="text-[11px] text-foreground/50 mt-1 flex items-center justify-center gap-1">
        Waiting for your partner to join the conversation…
      </p>
    </div>
  );
}
