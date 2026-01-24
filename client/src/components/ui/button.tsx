import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] select-none touch-none relative [border:0] [transition:0.3s_linear,_color_0s,_background-color_0s]",
  {
    variants: {
      variant: {
        default:
          "text-primary [--b:3px] [--s:0.45em] [--color:hsl(var(--primary))] [padding:calc(0.5em+var(--s))_calc(0.9em+var(--s))] [--_p:var(--s)] [background:conic-gradient(from_90deg_at_var(--b)_var(--b),transparent_90deg,var(--color)_0)_var(--_p)_var(--_p)/calc(100%-var(--b)-2*var(--_p))_calc(100%-var(--b)-2*var(--_p))] [outline:var(--b)_solid_transparent] [outline-offset:0.6em] hover:[--_p:0px] hover:[outline-color:var(--color)] hover:[outline-offset:0.05em] active:[background:var(--color)] active:text-primary-foreground [text-shadow:0_0_8px_hsl(var(--primary)/0.4)] dark:[text-shadow:0_0_8px_rgba(0,240,255,0.6)]",
        destructive:
          "text-destructive [--b:3px] [--s:0.45em] [--color:hsl(var(--destructive))] [padding:calc(0.5em+var(--s))_calc(0.9em+var(--s))] [--_p:var(--s)] [background:conic-gradient(from_90deg_at_var(--b)_var(--b),transparent_90deg,var(--color)_0)_var(--_p)_var(--_p)/calc(100%-var(--b)-2*var(--_p))_calc(100%-var(--b)-2*var(--_p))] [outline:var(--b)_solid_transparent] [outline-offset:0.6em] hover:[--_p:0px] hover:[outline-color:var(--color)] hover:[outline-offset:0.05em] active:[background:var(--color)] active:text-destructive-foreground [text-shadow:0_0_8px_rgba(var(--destructive),0.6)]",
        outline:
          "text-foreground [--b:2px] [--s:0.4em] [--color:hsl(var(--border))] [padding:calc(0.4em+var(--s))_calc(0.8em+var(--s))] [--_p:var(--s)] [background:conic-gradient(from_90deg_at_var(--b)_var(--b),transparent_90deg,hsl(var(--border))_0)_var(--_p)_var(--_p)/calc(100%-var(--b)-2*var(--_p))_calc(100%-var(--b)-2*var(--_p))] [outline:var(--b)_solid_transparent] [outline-offset:0.5em] hover:[--_p:0px] hover:text-foreground hover:[outline-color:hsl(var(--border))] hover:[outline-offset:0.05em] active:[background:hsl(var(--secondary))] active:text-foreground",
        secondary:
          "text-foreground/80 [--b:3px] [--s:0.45em] [--color:hsl(var(--secondary))] [padding:calc(0.5em+var(--s))_calc(0.9em+var(--s))] [--_p:var(--s)] [background:conic-gradient(from_90deg_at_var(--b)_var(--b),transparent_90deg,var(--color)_0)_var(--_p)_var(--_p)/calc(100%-var(--b)-2*var(--_p))_calc(100%-var(--b)-2*var(--_p))] [outline:var(--b)_solid_transparent] [outline-offset:0.6em] hover:[--_p:0px] hover:[outline-color:var(--color)] hover:[outline-offset:0.05em] active:[background:var(--color)] active:text-secondary-foreground [text-shadow:0_0_8px_hsl(var(--secondary)/0.3)]",
        ghost:
          "text-foreground/70 hover:text-foreground hover:bg-accent/10 px-4 py-2",
        link:
          "text-primary underline-offset-4 hover:underline px-2 py-1 [text-shadow:0_0_6px_rgba(0,240,255,0.4)]",
        neon:
          "text-primary [--b:4px] [--s:0.5em] [--color:hsl(var(--primary))] [padding:calc(0.5em+var(--s))_calc(0.9em+var(--s))] [--_p:var(--s)] [background:conic-gradient(from_90deg_at_var(--b)_var(--b),transparent_90deg,var(--color)_0)_var(--_p)_var(--_p)/calc(100%-var(--b)-2*var(--_p))_calc(100%-var(--b)-2*var(--_p))] [outline:var(--b)_solid_transparent] [outline-offset:0.7em] hover:[--_p:0px] hover:[outline-color:var(--color)] hover:[outline-offset:0.05em] active:[background:var(--color)] active:text-primary-foreground [text-shadow:0_0_12px_hsl(var(--primary)/0.6)] [box-shadow:0_0_20px_hsl(var(--primary)/0.2)] hover:[box-shadow:0_0_35px_hsl(var(--primary)/0.4)]",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
        icon: "h-9 w-9 p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
