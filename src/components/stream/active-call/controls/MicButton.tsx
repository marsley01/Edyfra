"use client";

import { useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";

/**
 * Microphone toggle — same on both sides of the call.
 *
 * The Stream SDK's `microphone.enable()` is async and may reject if the
 * browser hasn't granted the mic permission. We swallow the rejection and
 * surface a brief console error so we don't crash the controls bar.
 */
export function MicButton() {
  const { useMicrophoneState } = useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState();

  const onClick = useCallback(async () => {
    try {
      if (isMute) await microphone.enable();
      else await microphone.disable();
    } catch (err) {
      console.warn("[MicButton] toggle failed:", err);
    }
  }, [isMute, microphone]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`ctrl-btn ${isMute ? "ctrl-off" : ""}`}
      title={isMute ? "Unmute" : "Mute"}
      aria-label={isMute ? "Unmute microphone" : "Mute microphone"}
      aria-pressed={!isMute}
    >
      <span className="ctrl-icon">
        {isMute ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </span>
      <span className="ctrl-label">{isMute ? "Unmute" : "Mute"}</span>
    </button>
  );
}
