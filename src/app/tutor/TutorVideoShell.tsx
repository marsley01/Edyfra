"use client";

import { type ReactNode } from "react";
import { StreamVideoProvider } from "@/components/stream/StreamVideoProvider";

export function TutorVideoShell({ children }: { children: ReactNode }) {
  return <StreamVideoProvider>{children}</StreamVideoProvider>;
}
