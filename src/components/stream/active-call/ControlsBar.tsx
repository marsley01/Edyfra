"use client";

import { MicButton } from "./controls/MicButton";
import { CameraButton } from "./controls/CameraButton";
import { ScreenShareButton } from "./controls/ScreenShareButton";
import { RaiseHandButton } from "./controls/RaiseHandButton";
import { ReactionsButton } from "./controls/ReactionsButton";
import { ParticipantsButton } from "./controls/ParticipantsButton";
import { FullscreenButton } from "./controls/FullscreenButton";
import { EndCallButton } from "./controls/EndCallButton";

interface ControlsBarProps {
  onLeave: () => void;
}

/**
 * Identical controls bar shown to BOTH student and tutor. Left-to-right:
 *
 *   Mic · Camera · Share · Raise · React · Participants · Fullscreen · End
 *
 * Order is fixed (matches Zoom) so the muscle memory transfers.
 */
export function ControlsBar({ onLeave }: ControlsBarProps) {
  return (
    <div className="controls-bar" role="toolbar" aria-label="Call controls">
      <MicButton />
      <CameraButton />
      <ScreenShareButton />
      <RaiseHandButton />
      <ReactionsButton />
      <ParticipantsButton />
      <FullscreenButton />
      <EndCallButton onLeave={onLeave} />
    </div>
  );
}
