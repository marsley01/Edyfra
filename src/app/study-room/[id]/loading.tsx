import { Loader2 } from "lucide-react";

export default function StudyRoomLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      <p className="text-sm">Setting up the study room…</p>
      <p className="text-xs text-muted-foreground/70">
        Checking your camera and mic permissions
      </p>
    </div>
  );
}
