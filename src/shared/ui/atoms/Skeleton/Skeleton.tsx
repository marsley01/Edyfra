import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  count?: number;
}

const variantClasses = {
  text: "h-4 rounded",
  circular: "rounded-full",
  rectangular: "rounded-lg",
};

export function Skeleton({ className, variant = "text", width, height, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-muted",
            variantClasses[variant],
            className,
          )}
          style={{
            width: width || (variant === "text" ? "100%" : undefined),
            height: height || (variant === "text" ? undefined : undefined),
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Skeleton variant="circular" width={48} height={48} />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" count={2} />
    </div>
  );
}

export function SkeletonTable(rows = 5) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="25%" />
        <Skeleton variant="text" width="15%" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="text" width="15%" />
        </div>
      ))}
    </div>
  );
}
