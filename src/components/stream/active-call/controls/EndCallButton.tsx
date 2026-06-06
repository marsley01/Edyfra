"use client";

import { useCallback, useState } from "react";
import { PhoneOff } from "lucide-react";
import { useCall } from "@stream-io/video-react-sdk";
import { toast } from "sonner";

interface EndCallButtonProps {
  onLeave: () => void;
}

/**
 * Hang up. Tries `call.endCall()` first (which ends for everyone); falls back
 * to `call.leave()` (which just exits locally) if the server rejects.
 * Always invokes `onLeave` so the parent can tear down its UI.
 */
export function EndCallButton({ onLeave }: EndCallButtonProps) {
  const call = useCall();
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      try {
        await call?.endCall();
      } catch {
        await call?.leave();
      }
    } catch (err) {
      console.warn("[EndCallButton] endCall failed:", err);
      toast.error("Could not end the call cleanly. You have left the room.");
    } finally {
      setBusy(false);
      onLeave();
    }
  }, [busy, call, onLeave]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="ctrl-btn end-btn"
      title="End call"
      aria-label="End call"
    >
      <span className="ctrl-icon">
        <PhoneOff className="h-5 w-5" />
      </span>
      <span className="ctrl-label">End</span>
    </button>
  );
}
