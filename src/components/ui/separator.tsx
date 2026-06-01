"use client";

import { cn } from "@/lib/utils";

function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px bg-border", className)} {...props} />;
}

export { Separator };
