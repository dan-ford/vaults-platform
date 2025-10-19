"use client";

import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/context/organization-context';
import { AlertTriangle, CheckSquare, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VaultMetrics, VaultHealthStatus } from '@/lib/hooks/use-portfolio-data';

interface VaultTileProps {
  vault: VaultMetrics;
}

const healthConfig: Record<VaultHealthStatus, { color: string; bgColor: string; borderColor: string; label: string }> = {
  'healthy': {
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Healthy',
  },
  'needs-attention': {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Needs Attention',
  },
  'at-risk': {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'At Risk',
  },
};

export function VaultTile({ vault }: VaultTileProps) {
  const router = useRouter();
  const { setCurrentOrg } = useOrganization();

  const health = healthConfig[vault.healthStatus];

  const handleClick = () => {
    // Switch to this vault and navigate to its profile
    setCurrentOrg(vault.id);
    router.push('/vault-profile');
  };

  const formatLastActivity = (daysAgo: number) => {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative bg-white rounded-lg border-2 p-5 transition-all cursor-pointer",
        "hover:shadow-lg hover:scale-[1.02]",
        health.borderColor
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View ${vault.name} vault`}
    >
      {/* Header: Logo + Health Badge (vertically centered) */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-2">
          {vault.logo_url ? (
            <img
              src={vault.logo_url}
              alt={`${vault.name} logo`}
              className="w-12 h-12 rounded object-contain"
            />
          ) : (
            <div
              className="w-12 h-12 rounded flex items-center justify-center text-white font-semibold text-xl"
              style={{ backgroundColor: vault.brand_color || '#3b82f6' }}
            >
              {vault.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-tight">
            {vault.name}
          </h3>
        </div>

        {/* Health indicator badge - vertically centered with logo */}
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium border self-start",
            health.color,
            health.bgColor,
            health.borderColor
          )}
        >
          {health.label}
        </span>
      </div>

      {/* Health reasons */}
      {vault.healthReasons.length > 0 && (
        <div className="mb-4">
          <p className={cn("text-sm", health.color)}>
            {vault.healthReasons[0]}
          </p>
        </div>
      )}

      {/* Key metrics - minimal, icon + number only */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="flex flex-col items-center gap-1" title="Critical Risks">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          <span className="text-xl font-bold text-foreground">{vault.criticalRisksCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1" title="Active Tasks">
          <CheckSquare className="w-5 h-5 text-muted-foreground" />
          <span className="text-xl font-bold text-foreground">{vault.activeTasksCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1" title="Active OKRs">
          <Target className="w-5 h-5 text-muted-foreground" />
          <span className="text-xl font-bold text-foreground">{vault.activeOkrsCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1" title="Days Since Activity">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="text-xl font-bold text-foreground">{vault.daysSinceActivity}</span>
        </div>
      </div>

      {/* Footer: Additional indicators */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-xs text-muted-foreground">
        {vault.hasFinancialData && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-foreground/40" />
            Financial data
          </span>
        )}
        {vault.activeKpisCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-foreground/40" />
            {vault.activeKpisCount} KPI{vault.activeKpisCount > 1 ? 's' : ''}
          </span>
        )}
        {vault.pendingRequestsCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-foreground/40" />
            {vault.pendingRequestsCount} request{vault.pendingRequestsCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
