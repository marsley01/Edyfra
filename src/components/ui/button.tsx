import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-violet text-white rounded-btn font-bold text-[0.9rem] border-none transition-all duration-120 hover:bg-[#6D28D9] hover:scale-[1.02]",
        outline:
          "bg-transparent text-text-200 border-[1.5px] border-border rounded-btn font-bold text-[0.9rem] hover:bg-page-bg transition-all duration-120",
        secondary:
          "bg-violet-light text-violet border-[1.5px] border-border rounded-btn font-bold text-[0.9rem] hover:bg-[#E9DFFF] transition-all duration-120",
        ghost:
          "bg-transparent text-text-200 border-[1.5px] border-border rounded-btn font-bold text-[0.9rem] hover:bg-page-bg transition-all duration-120",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 rounded-btn font-bold text-[0.9rem] hover:bg-destructive/20 transition-all duration-120",
        link: "text-violet underline-offset-4 hover:underline transition-all duration-120",
      },
      size: {
        default: "h-11 px-6 py-3",
        xs: "h-8 px-3 text-xs rounded-btn",
        sm: "h-9 px-4 text-sm rounded-btn",
        lg: "h-12 px-8 text-base rounded-btn",
        icon: "size-10",
        "icon-xs": "size-8",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export function IosSpinner({ className, ...props }: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      className={cn("size-4 animate-spin text-current shrink-0", className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animationDuration: "0.8s", animationTimingFunction: "steps(12)" }}
      data-icon="inline-start"
      {...props}
    >
      <g transform="translate(50,50)">
        {[...Array(12)].map((_, i) => (
          <rect
            key={i}
            x="-2"
            y="-35"
            width="4"
            height="18"
            rx="2"
            ry="2"
            fill="currentColor"
            transform={`rotate(${i * 30})`}
            opacity={0.15 + (i / 12) * 0.85}
          />
        ))}
      </g>
    </svg>
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  "aria-busy": ariaBusy,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-size={size}
      aria-busy={loading || ariaBusy || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }), loading && "cursor-wait")}
      {...props}
    >
      {loading && <IosSpinner />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
