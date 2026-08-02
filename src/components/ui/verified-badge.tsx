import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  showText?: boolean;
}

export default function VerifiedBadge({ className = "", showText = true }: VerifiedBadgeProps) {
  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1 rounded-full",
        "bg-primary/10 text-primary border-primary/20",
        "text-[9px] sm:text-[10px] font-black uppercase tracking-widest",
        "px-2 py-0.5 sm:px-2.5 sm:py-1",
        "border",
        className
      )}
    >
      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      {showText && <span>Verified</span>}
    </Badge>
  );
}
