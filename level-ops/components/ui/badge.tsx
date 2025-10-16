import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary backdrop-blur-sm border-primary/20",
        secondary: "bg-secondary text-secondary-foreground border-secondary/20",
        destructive: "bg-destructive/10 text-destructive backdrop-blur-sm border-destructive/20",
        outline: "border-input bg-background/60 backdrop-blur-sm",
        neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60",
        success: "bg-slate-200 text-slate-900 dark:bg-slate-700/30 dark:text-slate-100 border-slate-300/60 dark:border-slate-600/60",
        warning: "bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground border-border dark:border-border",
        danger: "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive border-destructive/20 dark:border-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
