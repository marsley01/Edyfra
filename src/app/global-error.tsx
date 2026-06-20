"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
            <span className="text-3xl font-black">500</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tightest">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              We have been notified and are working on it. Please try again.
            </p>
          </div>
          <button
            onClick={reset}
            className="h-11 inline-flex items-center px-5 rounded-full bg-foreground text-background text-xs font-black tracking-widest uppercase"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
