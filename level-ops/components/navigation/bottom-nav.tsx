"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Target, AlertTriangle, FileText, LayoutDashboard, FileStack, Users, TrendingUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/lib/context/organization-context";
import { isModuleEnabled, type ModuleKey, type ModuleSettings } from "@/lib/types/modules";

const navItems = [
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    moduleKey: "tasks" as ModuleKey,
  },
  {
    label: "Milestones",
    href: "/milestones",
    icon: Target,
    moduleKey: "milestones" as ModuleKey,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileStack,
    moduleKey: "documents" as ModuleKey,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    moduleKey: null, // Dashboard is always visible
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: Users,
    moduleKey: "contacts" as ModuleKey,
  },
  {
    label: "Risks",
    href: "/risks",
    icon: AlertTriangle,
    moduleKey: "risks" as ModuleKey,
  },
  {
    label: "Decisions",
    href: "/decisions",
    icon: FileText,
    moduleKey: "decisions" as ModuleKey,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: TrendingUp,
    moduleKey: "reports" as ModuleKey,
  },
  {
    label: "Secrets",
    href: "/secrets",
    icon: Shield,
    moduleKey: "secrets" as ModuleKey,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { currentOrg, isLoading } = useOrganization();

  // Filter nav items based on enabled modules
  const visibleItems = navItems.filter((item) => {
    if (!item.moduleKey) return true; // Always show items without moduleKey (Dashboard)
    if (isLoading || !currentOrg) return false; // Hide module-based items during loading or when no org
    return isModuleEnabled(currentOrg.settings as ModuleSettings, item.moduleKey);
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-center h-20 px-4 pb-4">
        {/* macOS Dock-style centered navigation */}
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl pointer-events-auto w-full sm:w-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <div className="flex items-center justify-center gap-1 h-14 px-3">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all flex-1 min-w-[40px] sm:min-w-[56px] max-w-[80px]",
                    isActive
                      ? "text-primary bg-primary/10 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:scale-105"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                >
                  <Icon className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                  {/* Hide labels on mobile, show on sm and up */}
                  <span className="hidden sm:block text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
