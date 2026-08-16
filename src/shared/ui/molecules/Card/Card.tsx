import { cn } from "@/lib/utils";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  onClick?: () => void;
  accent?: "violet" | "solar" | "mint" | "coral" | "bubblegum";
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6 md:p-8",
};

const accentClasses = {
  violet: "border-t-[3px] border-t-violet",
  solar: "border-t-[3px] border-t-solar",
  mint: "border-t-[3px] border-t-mint",
  coral: "border-t-[3px] border-t-coral",
  bubblegum: "border-t-[3px] border-t-bubblegum",
};

export function Card({ children, className, padding = "md", hover, onClick, accent }: CardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      className={cn(
        "rounded-card border-[1.5px] border-border bg-card-bg text-text-100 shadow-card transition-all",
        paddingClasses[padding],
        accent && accentClasses[accent],
        hover && "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] duration-150",
        onClick && "w-full text-left cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-lg font-semibold", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-4 pt-4 border-t border-border flex items-center gap-2", className)}>{children}</div>;
}
