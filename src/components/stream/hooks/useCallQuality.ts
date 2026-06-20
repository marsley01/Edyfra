"use client";

import { useEffect, useState } from "react";

export type QualityTier = "good" | "ok" | "bad";

type StatsReport = {
  qualityScore?: number;
  score?: number;
  [key: string]: unknown;
} | null | undefined;

/**
 * Maps GetStream's quality score (0–100) into three UI tiers.
 * Falls back to "good" if the SDK hasn't reported stats yet.
 */
export function useCallQuality(stats: StatsReport): QualityTier {
  const [quality, setQuality] = useState<QualityTier>("good");

  useEffect(() => {
    const raw = (stats as any)?.qualityScore ?? (stats as any)?.score;
    if (typeof raw === "number") {
      if (raw >= 80) setQuality("good");
      else if (raw >= 50) setQuality("ok");
      else setQuality("bad");
    } else {
      setQuality("good");
    }
  }, [stats]);

  return quality;
}
