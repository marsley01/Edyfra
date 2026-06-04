import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      <p className="text-sm">Loading…</p>
    </div>
  );
}
