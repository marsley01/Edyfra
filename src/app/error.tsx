"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">
            Something tripped on our end
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tightest text-foreground">
            We hit a snag loading this page.
          </h1>
        </div>

        <div className="space-y-4 text-left rounded-2xl border border-border bg-secondary/40 p-5 text-sm">
          <Row label="What happened" value="The page crashed before it could finish loading for you." />
          <Row
            label="Why"
            value={
              error?.message
                ? `${humanizeMessage(error.message)} (this is the technical reason).`
                : "We don't have a precise reason yet — the server didn't tell us much."
            }
          />
          <Row
            label="What to try"
            value="Hit Try again. If it keeps crashing, refresh the tab or message us — we'll look at the logs."
          />
        </div>

        {error?.digest ? (
          <p className="font-mono text-[10px] text-muted-foreground/70">
            ref: {error.digest} <span className="opacity-50">(share this if you contact support)</span>
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={reset}
            className="h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-black text-xs tracking-widest uppercase px-6"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-12 rounded-full border-2 border-border hover:border-foreground/30 px-6 font-black text-xs tracking-widest uppercase text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Tell us about it
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-[110px] text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-0.5">
        {label}
      </span>
      <span className="text-foreground/90 leading-relaxed">{value}</span>
    </div>
  );
}

function humanizeMessage(msg: string) {
  if (!msg) return msg;
  // Trim very long stack lines so the panel stays readable.
  const oneLine = msg.split("\n")[0];
  return oneLine.length > 180 ? `${oneLine.slice(0, 180)}…` : oneLine;
}
