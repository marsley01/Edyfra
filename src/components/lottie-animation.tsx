"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

interface LottieAnimationProps {
  /** Inline JSON data (recommended for above-the-fold content). */
  animationData?: unknown;
  /** URL to a JSON file. Will be fetched on mount. */
  url?: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  /** Render style for accessibility. */
  ariaLabel?: string;
}

export function LottieAnimation({
  animationData,
  url,
  className,
  loop = true,
  autoplay = true,
  ariaLabel,
}: LottieAnimationProps) {
  const [data, setData] = useState<unknown>(animationData);
  const [loading, setLoading] = useState(!!url && !animationData);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!url || animationData) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setHasError(false);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[LottieAnimation] fetch failed:", url, err);
        if (mounted) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [url, animationData]);

  if (loading) {
    return <div className={className} aria-label={ariaLabel} aria-busy="true" />;
  }

  if (hasError || !data) {
    // Fail silently — caller can render their own fallback alongside.
    return <div className={className} aria-label={ariaLabel} aria-hidden="true" />;
  }

  return (
    <Lottie
      animationData={data}
      className={className}
      loop={loop}
      autoplay={autoplay}
      aria-label={ariaLabel}
    />
  );
}
