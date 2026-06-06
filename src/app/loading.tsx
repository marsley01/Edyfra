import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15 animate-ping" />
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium">Hang tight — getting this ready for you.</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}
