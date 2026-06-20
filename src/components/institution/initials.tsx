import { cn } from "@/lib/utils";

const COLOR_BG: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  cyan: "bg-cyan-100 text-cyan-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

export function Initials({ name, color = "indigo", className }: { name: string; color?: keyof typeof COLOR_BG; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black",
        COLOR_BG[color] ?? COLOR_BG.indigo,
        className,
      )}
    >
      {initials || "?"}
    </div>
  );
}
