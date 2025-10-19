"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Package,
  MessageSquare,
  FileStack,
  Scale,
  Users,
  Lock,
  Building,
  LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const MENU_ITEMS: MenuItem[] = [
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/packs", icon: Package, label: "Board Packs" },
  { href: "/requests", icon: MessageSquare, label: "Requests" },
  { href: "/documents", icon: FileStack, label: "Documents" },
  { href: "/decisions", icon: Scale, label: "Decisions" },
  { href: "/contacts", icon: Users, label: "Members" },
  { href: "/secrets", icon: Lock, label: "Secrets" },
  { href: "/vault-profile", icon: Building, label: "Vault Profile" },
];

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-xl">
        <SheetHeader className="px-4 pt-6 pb-3 border-b text-left">
          <SheetTitle>Vault Modules</SheetTitle>
          <SheetDescription>Access vault management features</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
