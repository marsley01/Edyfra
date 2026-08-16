"use client";

import { LottieAnimation } from "@/components/lottie-animation";
import studySpinner from "@/../public/animations/study-spinner.json";

export default function GlobalLoading() {
  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {/* Lottie spinner */}
      <div className="relative">
        <LottieAnimation
          animationData={studySpinner}
          className="w-24 h-24"
          ariaLabel="Loading animation"
        />
        {/* Soft glow ring */}
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-2xl -z-10 scale-150" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground">One moment</p>
        <p className="text-xs text-muted-foreground font-medium">Getting this ready for you…</p>
      </div>

      {/* Progress shimmer bar */}
      <div className="w-40 h-0.5 bg-border rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-primary/50 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
