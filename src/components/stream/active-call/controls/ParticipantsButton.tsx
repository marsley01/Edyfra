"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useCallStateHooks, type StreamVideoParticipant } from "@stream-io/video-react-sdk";
import { hasTrack } from "../trackState";

export function ParticipantsButton() {
  const { useParticipants } = useCallStateHooks();
  const participants = (useParticipants() ?? []) as StreamVideoParticipant[];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="controls-wrap">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`ctrl-btn ${open ? "ctrl-active" : ""}`}
        title="Participants"
        aria-label="Show participants"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="ctrl-icon">
          <Users className="h-5 w-5" />
        </span>
        <span className="ctrl-label">{participants.length}</span>
      </button>

      {open && (
        <div className="participants-popup" role="menu">
          <p className="panel-title">Participants ({participants.length})</p>
          {participants.map((p) => {
            const audio = hasTrack(p, "audio");
            const video = hasTrack(p, "video");
            return (
              <div key={p.sessionId} className="participant-row">
                <span className="p-avatar">
                  {(p.name?.[0] ?? "?").toUpperCase()}
                </span>
                <span className="p-name">
                  {p.name}
                  {p.isLocalParticipant && (
                    <span className="text-cyan-300 ml-1 text-[10px] font-black uppercase tracking-widest">
                      (you)
                    </span>
                  )}
                </span>
                <span className="p-status">
                  <span aria-label={audio ? "Mic on" : "Mic off"}>
                    {audio ? "🎤" : "🔇"}
                  </span>
                  <span aria-label={video ? "Camera on" : "Camera off"}>
                    {video ? "📹" : "📷"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
