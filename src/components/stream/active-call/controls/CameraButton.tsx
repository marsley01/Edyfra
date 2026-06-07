"use client";

import { useCallback } from "react";
import { Video, VideoOff } from "lucide-react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";

export function CameraButton() {
  const { useCameraState } = useCallStateHooks();
  const { camera, isMute } = useCameraState();

  const onClick = useCallback(async () => {
    try {
      if (isMute) await camera.enable();
      else await camera.disable();
    } catch (err) {
      console.warn("[CameraButton] toggle failed:", err);
    }
  }, [isMute, camera]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`ctrl-btn ${isMute ? "ctrl-off" : ""}`}
      title={isMute ? "Start video" : "Stop video"}
      aria-label={isMute ? "Start video" : "Stop video"}
      aria-pressed={!isMute}
    >
      <span className="ctrl-icon">
        {isMute ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </span>
      <span className="ctrl-label">{isMute ? "Start" : "Stop"}</span>
    </button>
  );
}
