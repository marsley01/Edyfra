"use client";

import { useCallback, useEffect, useState } from "react";
import { Smile } from "lucide-react";
import { useCall } from "@stream-io/video-react-sdk";

const REACTIONS = ["👍", "👏", "😂", "🎉", "❓", "❤️", "🔥"] as const;
type ReactionEmoji = (typeof REACTIONS)[number];

interface FloatReaction {
  id: number;
  emoji: ReactionEmoji;
}

let nextId = 0;

/**
 * Sends a reaction to the call and also floats an animated emoji locally so
 * the user gets immediate feedback (the other side will see it through
 * Stream's own reaction UI as well).
 */
export function ReactionsButton() {
  const call = useCall();
  const [open, setOpen] = useState(false);
  const [floats, setFloats] = useState<FloatReaction[]>([]);

  const send = useCallback(
    async (emoji: ReactionEmoji) => {
      setOpen(false);
      const id = ++nextId;
      setFloats((cur) => [...cur, { id, emoji }]);
      setTimeout(() => {
        setFloats((cur) => cur.filter((f) => f.id !== id));
      }, 1600);
      if (!call) return;
      try {
        await call.sendReaction({ type: "reaction", emoji_code: emoji });
      } catch (err) {
        console.warn("[ReactionsButton] sendReaction failed:", err);
      }
    },
    [call],
  );

  // Close popup on outside click / Escape
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
        title="Reactions"
        aria-label="Send a reaction"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="ctrl-icon">
          <Smile className="h-5 w-5" />
        </span>
        <span className="ctrl-label">React</span>
      </button>

      {open && (
        <div className="reactions-popup" role="menu">
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => send(r)}
              className="reaction-btn"
              role="menuitem"
              aria-label={`Send ${r}`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {floats.map((f) => (
        <span key={f.id} className="reaction-float" aria-hidden>
          {f.emoji}
        </span>
      ))}
    </div>
  );
}
