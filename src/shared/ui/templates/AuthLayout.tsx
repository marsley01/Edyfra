import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function AuthLayout({ children, title, description, className }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div
        className={cn(
          "w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-lg",
          className,
        )}
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
