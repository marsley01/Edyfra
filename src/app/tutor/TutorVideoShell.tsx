"use client";

import { type ReactNode } from "react";
import { VideoProvider } from "@/components/video/VideoProvider";

export function TutorVideoShell({ children }: { children: ReactNode }) {
  return <VideoProvider>{children}</VideoProvider>;
}
