import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, type LucideIcon, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  accent?: "indigo" | "cyan" | "emerald" | "amber" | "rose" | "violet";
  hint?: string;
}

const ACCENT_BG: Record<NonNullable<StatCardProps["accent"]>, string> = {
  indigo: "from-indigo-500/10 to-indigo-500/0",
  cyan: "from-cyan-500/10 to-cyan-500/0",
  emerald: "from-emerald-500/10 to-emerald-500/0",
  amber: "from-amber-500/10 to-amber-500/0",
  rose: "from-rose-500/10 to-rose-500/0",
  violet: "from-violet-500/10 to-violet-500/0",
};

const ACCENT_TEXT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  indigo: "text-indigo-500",
  cyan: "text-cyan-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  rose: "text-rose-500",
  violet: "text-violet-500",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  accent = "indigo",
  hint,
}: StatCardProps) {
  const showDelta = typeof delta === "number";
  const positive = showDelta && delta! > 0;
  const negative = showDelta && delta! < 0;
  return (
    <Card className={cn("relative overflow-hidden border-gray-200/80 bg-white")}>
      <div className={cn("absolute inset-0 bg-gradient-to-br", ACCENT_BG[accent])} />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black tabular-nums text-gray-900">{value}</p>
            {hint && (
              <p className="mt-1 text-[11px] text-gray-500 font-medium">{hint}</p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm",
                ACCENT_TEXT[accent],
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {showDelta && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5",
                positive && "bg-emerald-50 text-emerald-700",
                negative && "bg-rose-50 text-rose-700",
                !positive && !negative && "bg-gray-100 text-gray-600",
              )}
            >
              {positive && <ArrowUp className="h-3 w-3" />}
              {negative && <ArrowDown className="h-3 w-3" />}
              {!positive && !negative && <Minus className="h-3 w-3" />}
              {Math.abs(delta!)}%
            </span>
            {deltaLabel && <span className="text-gray-500 font-medium">{deltaLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
