"use client";

import { MicOff, VideoOff } from "lucide-react";
import {
  ParticipantView,
  type StreamVideoParticipant,
} from "@stream-io/video-react-sdk";
import { hasTrack } from "./trackState";

interface VideoTileProps {
  participant: StreamVideoParticipant;
  /** Pin this tile slightly larger when in a 3-5 person grid (tutor pinning). */
  pinned?: boolean;
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[1][0] : "";
  return (first + second).toUpperCase() || "?";
}

/**
 * A single participant tile. Wraps Stream's <ParticipantView> with:
 *   - speaking indicator (cyan border + glow)
 *   - mic-off badge (top right red dot)
 *   - camera-off avatar fallback (when no VIDEO track)
 *   - name label (bottom left)
 */
export function VideoTile({ participant, pinned = false }: VideoTileProps) {
  const speaking = !!participant.isSpeaking;
  const camOn = hasTrack(participant, "video");
  const micOn = hasTrack(participant, "audio");
  const isLocal = !!participant.isLocalParticipant;
  const name = participant.name || (isLocal ? "You" : "Guest");

  return (
    <div
      className={`video-tile ${speaking ? "speaking" : ""}`}
      style={pinned ? { gridColumn: "span 2" } : undefined}
      data-participant={participant.sessionId}
    >
      {/* Live video when the camera is on */}
      {camOn ? (
        <ParticipantView
          participant={participant}
          muteAudio
          className="!h-full !w-full"
        />
      ) : (
        <div className="avatar-fallback">
          <div className="initial">{getInitials(name)}</div>
          <div className="name">{name}</div>
        </div>
      )}

      {/* Mute / camera-off badge */}
      {!micOn && (
        <div className="mute-badge" aria-label="Microphone muted">
          <MicOff className="h-3.5 w-3.5" />
        </div>
      )}
      {!camOn && micOn && (
        <div className="mute-badge video" aria-label="Camera off">
          <VideoOff className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Name label */}
      <div className="tile-name">
        <span>{name}</span>
        {isLocal && (
          <span className="text-[9px] font-black uppercase tracking-widest text-cyan-300/80">
            (you)
          </span>
        )}
      </div>
    </div>
  );
}
