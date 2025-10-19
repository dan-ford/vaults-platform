"use client";

import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Touch-optimized button that meets 44x44px minimum on mobile
 * while maintaining smaller size on desktop
 */
export const TouchTarget = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "icon", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={cn(
          // 44px on mobile (< 768px), original size on tablet+
          size === "icon" && "h-11 w-11 md:h-9 md:w-9",
          className
        )}
        {...props}
      />
    );
  }
);

TouchTarget.displayName = "TouchTarget";
