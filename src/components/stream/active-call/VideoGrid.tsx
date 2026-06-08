"use client";

import { useCallStateHooks, type StreamVideoParticipant } from "@stream-io/video-react-sdk";
import { VideoTile } from "./VideoTile";

/**
 * Default video grid for 1-6 participants. The 2-person case is the most
 * common (student + tutor) — equal-sized side-by-side tiles.
 *
 * Layout rules:
 *   • 1 participant — full area (auto-centered)
 *   • 2 participants — side by side
 *   • 3-5 participants — 2-column grid, tutor tile is pinned (slightly wider)
 *   • 6+ participants — 2-column grid, no pinning (caller should paginate)
 */
export function VideoGrid() {
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  const all = useParticipants();
  const local = useLocalParticipant();

  const participants = (all ?? []) as StreamVideoParticipant[];

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-white/70 max-w-sm mx-auto space-y-3">
        <div className="w-16 h-16 rounded-lg border-2 border-cyan-500/40 bg-cyan-500/10 animate-pulse" />
        <p className="text-sm font-bold">Connecting you to the room…</p>
        <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
          Hang tight
        </p>
      </div>
    );
  }

  const count = participants.length;
  const gridClass = `video-grid participants-${Math.min(count, 6)}`;

  // For 3-5 people, pin the local user (typically the tutor when they join
  // first) to the larger span-2 slot. The remaining tiles fall in below.
  const showPinning = count >= 3 && count <= 5;

  return (
    <div className={gridClass}>
      {participants.map((p) => (
        <VideoTile
          key={p.sessionId}
          participant={p}
          pinned={showPinning && p.sessionId === local?.sessionId}
        />
      ))}
    </div>
  );
}
