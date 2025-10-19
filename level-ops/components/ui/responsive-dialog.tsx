"use client";

import * as React from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

/**
 * Responsive dialog that renders as:
 * - Bottom sheet on mobile (< 768px)
 * - Center dialog on tablet and desktop (>= 768px)
 */
export function ResponsiveDialog({
  children,
  open,
  onOpenChange,
  className,
}: ResponsiveDialogProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn("h-[90vh] flex flex-col", className)}
        >
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>{children}</DialogContent>
    </Dialog>
  );
}

// Export wrapper components for consistency
export {
  DialogHeader as ResponsiveDialogHeader,
  DialogTitle as ResponsiveDialogTitle,
  DialogDescription as ResponsiveDialogDescription,
  DialogFooter as ResponsiveDialogFooter,
};

// Also export Sheet versions for type compatibility
export {
  SheetHeader as ResponsiveSheetHeader,
  SheetTitle as ResponsiveSheetTitle,
  SheetDescription as ResponsiveSheetDescription,
  SheetFooter as ResponsiveSheetFooter,
};
