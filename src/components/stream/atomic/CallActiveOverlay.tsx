"use client";

import { ReactNode } from "react";
import { Call, StreamCall } from "@stream-io/video-react-sdk";

interface CallActiveOverlayProps {
  call: Call;
  children: ReactNode;
}

/**
 * Renders the call backdrop (the dimmed gradient that sits behind the
 * Dynamic Island) plus a StreamCall context. Anything inside `children`
 * (typically <DynamicIsland />) gets the Stream call hooks.
 */
export function CallActiveOverlay({ call, children }: CallActiveOverlayProps) {
  return (
    <>
      <div className="edyfra-island-backdrop" />
      <StreamCall call={call}>{children}</StreamCall>
    </>
  );
}
