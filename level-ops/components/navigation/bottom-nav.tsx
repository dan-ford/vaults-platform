"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Target, AlertTriangle, FileText, LayoutDashboard, FileStack, Users, TrendingUp, Shield, BarChart3, DollarSign, User, Package, MessageSquare, Scale, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/lib/context/organization-context";
import { isModuleEnabled, type ModuleKey, type ModuleSettings } from "@/lib/types/modules";
import { useFeatureFlag } from "@/lib/hooks/use-feature-flag";

const navItems = [
  {
    label: "Profile",
    href: "/vault-profile",
    icon: Building2,
    moduleKey: null,
    requiresFeatureFlag: "executive_layer_v2",
  },
  {
    label: "Metrics",
    href: "/metrics",
    icon: BarChart3,
    moduleKey: null,
    requiresFeatureFlag: "executive_layer_v2",
  },
  {
    label: "Finance",
    href: "/finance",
    icon: DollarSign,
    moduleKey: null,
    requiresFeatureFlag: "executive_layer_v2",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: TrendingUp,
    moduleKey: null,
    requiresFeatureFlag: "executive_layer_v2",
  },
  {
    label: "Packs",
    href: "/packs",
    icon: Package,
    moduleKey: null,
    requiresFeatureFlag: "executive_layer_v2",
  },
  {
    label: "Requests",
    href: "/requests",
    icon: MessageSquare,
    moduleKey: null,
    requiresFeatureFlag: "executive_layer_v2",
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileStack,
    moduleKey: "documents" as ModuleKey,
  },
  {
    label: "Governance",
    href: "/governance",
    icon: Scale,
    moduleKey: null, // Both decisions and risks modules required
  },
  {
    label: "Members",
    href: "/contacts",
    icon: Users,
    moduleKey: "contacts" as ModuleKey,
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
  const executiveLayerEnabled = useFeatureFlag('executive_layer_v2');

  // Filter nav items based on enabled modules and feature flags
  const visibleItems = navItems.filter((item) => {
    // Check feature flag requirement first
    if ('requiresFeatureFlag' in item && item.requiresFeatureFlag) {
      if (!executiveLayerEnabled) return false;
    }

    if (!item.moduleKey) return true; // Always show items without moduleKey (Dashboard, feature-flagged items)
    if (isLoading || !currentOrg) return false; // Hide module-based items during loading or when no org
    return isModuleEnabled(currentOrg.settings as ModuleSettings, item.moduleKey);
  });

  return (
    <>
      {/* Mobile: Bottom horizontal nav (< md) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-center h-20 px-4 pb-4">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl pointer-events-auto w-full">
            <div className="flex items-center justify-center gap-1 h-14 px-3">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all flex-1 min-w-[40px]",
                      isActive
                        ? "text-primary bg-primary/10 scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:scale-105"
                    )}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop: Left vertical nav (≥ md) - Icon only */}
      <nav
        className="hidden md:block fixed left-0 top-0 bottom-0 z-40 pointer-events-none"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-start justify-start h-full pl-4 pt-16 pb-4">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl pointer-events-auto max-h-full overflow-y-auto">
            <div className="flex flex-col gap-[30px] py-3 px-2">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-[30px] h-[30px] rounded-lg transition-all flex-shrink-0",
                      isActive
                        ? "text-primary bg-primary/10 scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:scale-105"
                    )}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
