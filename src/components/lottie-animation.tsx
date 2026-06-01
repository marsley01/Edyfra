"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

interface LottieAnimationProps {
  animationData?: unknown;
  url?: string;
  className?: string;
  loop?: boolean;
}

export function LottieAnimation({ animationData, url, className, loop = true }: LottieAnimationProps) {
  const [data, setData] = useState<unknown>(animationData);
  const [loading, setLoading] = useState(!!url);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setHasError(false);

    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(json => {
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Lottie fetch error:", err);
        if (mounted) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  // If we have static animationData, render it immediately (SSR-friendly)
  if (animationData && !url) {
    return (
      <Lottie 
        animationData={animationData} 
        className={className} 
        loop={loop} 
      />
    );
  }

  // Show empty div while loading or if there's an error
  if (loading || hasError || !data) {
    return <div className={className} />;
  }

  return (
    <Lottie 
      animationData={data} 
      className={className} 
      loop={loop} 
    />
  );
}
