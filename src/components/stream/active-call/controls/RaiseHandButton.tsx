"use client";

import { useCallback, useState } from "react";
import { Hand } from "lucide-react";
import { useCall } from "@stream-io/video-react-sdk";

/**
 * Raise / lower hand. We send a Stream reaction (the "raised-hand" type) so
 * the other side can render it. The local button stays "raised" until the
 * user lowers it or 10s elapse (matches the spec's auto-lower behaviour).
 */
export function RaiseHandButton() {
  const call = useCall();
  const [raised, setRaised] = useState(false);

  const onClick = useCallback(async () => {
    if (!call) return;
    if (raised) {
      setRaised(false);
      return;
    }
    setRaised(true);
    try {
      await call.sendReaction({ type: "raised-hand", emoji_code: "✋" });
    } catch (err) {
      console.warn("[RaiseHandButton] sendReaction failed:", err);
    }
    // Auto-lower after 10s to match Zoom's behaviour.
    setTimeout(() => setRaised(false), 10_000);
  }, [call, raised]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`ctrl-btn ${raised ? "ctrl-active" : ""}`}
      title={raised ? "Lower hand" : "Raise hand"}
      aria-label={raised ? "Lower hand" : "Raise hand"}
      aria-pressed={raised}
    >
      <span className="ctrl-icon">
        <Hand className="h-5 w-5" />
      </span>
      <span className="ctrl-label">{raised ? "Lower" : "Raise"}</span>
    </button>
  );
}
