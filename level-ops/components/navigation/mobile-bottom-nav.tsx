"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  DollarSign,
  Menu,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href?: string;
  icon: LucideIcon;
  label: string;
  key?: string;
  onClick?: () => void;
}

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/metrics", icon: TrendingUp, label: "Metrics" },
  { href: "/finance", icon: DollarSign, label: "Finance" },
  { key: "more", icon: Menu, label: "More" },
];

/**
 * Mobile bottom navigation bar
 * Only visible on mobile (< 768px)
 */
export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href && pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.href) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center h-14 gap-0.5 text-[11px] transition-colors",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          }

          // More button
          return (
            <button
              key={item.key}
              onClick={onMoreClick}
              className="flex flex-col items-center justify-center h-14 gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
