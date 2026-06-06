"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PermissionBanner({
  onAllow,
}: {
  onAllow: () => void;
}) {
  return (
    <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
      <p className="text-xs text-amber-800 dark:text-amber-200 font-medium flex-1">
        Oops! Your camera and mic are blocked. Just click the lock icon in your browser address bar to allow them!
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onAllow}
        className="h-7 rounded-full text-[10px] font-black uppercase tracking-widest border-amber-500/40 text-amber-700 dark:text-amber-200 hover:bg-amber-500/15 px-3"
      >
        Allow
      </Button>
    </div>
  );
}
