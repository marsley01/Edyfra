import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

export type OverallStatus = "RED" | "YELLOW" | "GREEN";
export type FlagStatus = "CRITICAL" | "AT_RISK" | "MONITORING" | "ON_TRACK" | "EXCELLENT";
export type Trend = "IMPROVING" | "DECLINING" | "STABLE";

const OVERALL_STYLES: Record<OverallStatus, { bg: string; text: string; ring: string; label: string; dot: string }> = {
  RED: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-200",
    label: "At risk",
    dot: "bg-rose-500",
  },
  YELLOW: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    label: "Monitor",
    dot: "bg-amber-500",
  },
  GREEN: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    label: "On track",
    dot: "bg-emerald-500",
  },
};

const FLAG_STYLES: Record<FlagStatus, { bg: string; text: string; ring: string; label: string }> = {
  CRITICAL: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", label: "Critical" },
  AT_RISK: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", label: "At risk" },
  MONITORING: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", label: "Monitoring" },
  ON_TRACK: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", label: "On track" },
  EXCELLENT: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200", label: "Excellent" },
};

export function PerformanceBadge({
  status,
  size = "md",
  showLabel = true,
}: {
  status: OverallStatus | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        {showLabel && "No data"}
      </span>
    );
  }
  const s = OVERALL_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full ring-1",
        s.bg,
        s.text,
        s.ring,
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        "font-black uppercase tracking-widest",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {showLabel && s.label}
    </span>
  );
}

export function FlagBadge({ flag }: { flag: FlagStatus }) {
  const s = FLAG_STYLES[flag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ring-1",
        s.bg,
        s.text,
        s.ring,
      )}
    >
      {s.label}
    </span>
  );
}

const TREND_ICONS: Record<Trend, LucideIcon> = {
  IMPROVING: ArrowUp,
  DECLINING: ArrowDown,
  STABLE: Minus,
};

const TREND_STYLES: Record<Trend, string> = {
  IMPROVING: "text-emerald-600",
  DECLINING: "text-rose-600",
  STABLE: "text-gray-500",
};

export function TrendIndicator({ trend }: { trend: Trend }) {
  const Icon = TREND_ICONS[trend];
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", TREND_STYLES[trend])}>
      <Icon className="h-3 w-3" />
    </span>
  );
}
