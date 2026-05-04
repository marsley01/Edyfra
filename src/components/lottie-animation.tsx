"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

interface LottieAnimationProps {
  animationData: any;
  className?: string;
  loop?: boolean;
}

export function LottieAnimation({ animationData, className, loop = true }: LottieAnimationProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className={className} />;

  return (
    <Lottie 
      animationData={animationData} 
      className={className} 
      loop={loop} 
    />
  );
}
