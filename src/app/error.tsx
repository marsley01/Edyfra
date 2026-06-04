"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        We hit an unexpected error. Please try again — if it keeps happening,
        ping us on the community and we&apos;ll dig in.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground/70">
          ref: {error.digest}
        </p>
      ) : null}
      <Button onClick={reset} className="bg-amber-500 hover:bg-amber-600 text-black">
        Try again
      </Button>
    </div>
  );
}
