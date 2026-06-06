"use client";

import { useCallback, useState } from "react";
import { MonitorUp, MonitorX } from "lucide-react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { toast } from "sonner";

export function ScreenShareButton() {
  const { useScreenShareState } = useCallStateHooks();
  const { screenShare, status } = useScreenShareState();
  const isSharing = status === "enabled";
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isSharing) {
        await screenShare.disable();
      } else {
        await screenShare.enable();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start screen share";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [busy, isSharing, screenShare]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`ctrl-btn ${isSharing ? "ctrl-active" : ""}`}
      title={isSharing ? "Stop sharing" : "Share screen"}
      aria-label={isSharing ? "Stop sharing screen" : "Share screen"}
      aria-pressed={isSharing}
    >
      <span className="ctrl-icon">
        {isSharing ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
      </span>
      <span className="ctrl-label">{isSharing ? "Stop" : "Share"}</span>
    </button>
  );
}
