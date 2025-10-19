"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Settings,
  Building2,
  Shield,
  LogOut,
  Search,
  LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { cn } from "@/lib/utils";

interface SystemMenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const SYSTEM_MENU_ITEMS: SystemMenuItem[] = [
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/admin", icon: Building2, label: "Vaults" },
  { href: "/admin", icon: Shield, label: "Admin" },
];

interface MobileSystemMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSystemMenu({ open, onOpenChange }: MobileSystemMenuProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-xl">
        <SheetHeader className="px-4 pt-6 pb-3 border-b text-left">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>System settings and navigation</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Organization Switcher */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-3">Organization</h3>
            <div className="px-3">
              <OrganizationSwitcher />
            </div>
          </div>

          {/* System menu items */}
          <div className="space-y-1">
            {SYSTEM_MENU_ITEMS.map((item) => {
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

            {/* Logout */}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-muted text-left"
              >
                <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
                <span className="font-medium">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
