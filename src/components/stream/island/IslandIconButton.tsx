"use client";

import { cn } from "@/lib/utils";

interface IslandIconButtonProps {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
  label: string;
  size?: "sm" | "md";
}

export function IslandIconButton({
  onClick,
  active,
  children,
  label,
  size = "sm",
}: IslandIconButtonProps) {
  const dim = size === "md" ? "h-9 w-9" : "h-7 w-7";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        dim,
        "inline-flex items-center justify-center rounded-full transition-all",
        active
          ? "bg-white/10 hover:bg-white/20 text-white"
          : "bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30",
      )}
    >
      {children}
    </button>
  );
}
