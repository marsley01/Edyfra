import { cn } from "@/lib/utils";

export type TextVariant = "h1" | "h2" | "h3" | "h4" | "body" | "body-sm" | "caption" | "overline";
export type TextColor = "default" | "muted" | "primary" | "danger" | "success";

type IntrinsicElement = keyof React.JSX.IntrinsicElements;

export interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  className?: string;
  as?: IntrinsicElement;
  truncate?: boolean;
}

const variantClasses: Record<TextVariant, string> = {
  h1: "text-4xl font-black tracking-tight md:text-5xl",
  h2: "text-3xl font-bold tracking-tight md:text-4xl",
  h3: "text-2xl font-bold tracking-tight",
  h4: "text-xl font-semibold",
  body: "text-base leading-relaxed",
  "body-sm": "text-sm leading-relaxed",
  caption: "text-xs text-muted-foreground",
  overline: "text-xs font-semibold uppercase tracking-widest",
};

const colorClasses: Record<TextColor, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  danger: "text-destructive",
  success: "text-emerald-600 dark:text-emerald-400",
};

const elementMap: Record<TextVariant, IntrinsicElement> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  body: "p",
  "body-sm": "p",
  caption: "span",
  overline: "span",
};

export function Text({
  children,
  variant = "body",
  color = "default",
  className,
  as,
  truncate,
}: TextProps) {
  const Component = as || elementMap[variant];

  return (
    <Component
      className={cn(
        variantClasses[variant],
        colorClasses[color],
        truncate && "truncate",
        className,
      )}
    >
      {children}
    </Component>
  );
}
