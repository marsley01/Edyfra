"use client";

import {
  ParticipantView,
  useCallStateHooks,
  type StreamVideoParticipant,
} from "@stream-io/video-react-sdk";
import { Maximize2, Minimize2 } from "lucide-react";
import { useState, useCallback } from "react";
import { hasTrack } from "./trackState";

/**
 * When someone shares their screen, the share takes the main area and the
 * other participants' videos collapse into a small strip on the right.
 *
 * The screen share itself is rendered by Stream via a special
 * `screenShareTrack` on the publishing participant. We render it with
 * <ParticipantView trackType="screenShareTrack" />.
 */
export function ScreenShareLayout() {
  const { useScreenShareState, useParticipants } = useCallStateHooks();
  const { screenShare: _screenShare, status } = useScreenShareState();
  const all = useParticipants();
  const [expanded, setExpanded] = useState(false);

  const participants = (all ?? []) as StreamVideoParticipant[];
  const publisher = participants.find((p) => hasTrack(p, "screen"));

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  return (
    <div className="screen-share-stage">
      <div className="screen-share-main">
        {publisher ? (
          <ParticipantView
            participant={publisher}
            trackType="screenShareTrack"
            muteAudio
            className="!h-full !w-full"
          />
        ) : status === "enabled" ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm font-bold">
            Waiting for screen share…
          </div>
        ) : null}

        <button
          type="button"
          onClick={toggleExpanded}
          className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white flex items-center justify-center transition-colors z-10"
          aria-label={expanded ? "Restore screen share layout" : "Expand screen share"}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {!expanded && (
        <div className="screen-share-strip">
          {participants
            .filter((p) => p.sessionId !== publisher?.sessionId)
            .slice(0, 4)
            .map((p) => (
              <div
                key={p.sessionId}
                className="video-tile"
                style={{ width: 140, aspectRatio: "16 / 10" }}
              >
                {hasTrack(p, "video") ? (
                  <ParticipantView participant={p} muteAudio className="!h-full !w-full" />
                ) : (
                  <div className="avatar-fallback">
                    <div className="initial" style={{ width: 40, height: 40, fontSize: 14 }}>
                      {(p.name?.[0] ?? "?").toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="tile-name" style={{ fontSize: 10 }}>
                  {p.name}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
