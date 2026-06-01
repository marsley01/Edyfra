"use client";

import { cn } from "@/lib/utils";

function Progress({ value, className, ...props }: { value: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("h-2 w-full rounded-full bg-secondary", className)} {...props}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export { Progress };
