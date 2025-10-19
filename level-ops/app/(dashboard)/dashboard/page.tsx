"use client";

import { useState } from "react";
import { useCopilotReadable } from "@copilotkit/react-core";
import { Building2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { usePortfolioData } from "@/lib/hooks/use-portfolio-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { VaultTile } from "@/components/portfolio/vault-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterType = 'all' | 'needs-attention' | 'at-risk' | 'stale';

export default function DashboardPage() {
  const { portfolio, isLoading } = usePortfolioData();
  const [filter, setFilter] = useState<FilterType>('all');

  // Make portfolio data readable to AI
  useCopilotReadable({
    description: "Portfolio overview showing all vaults and their health metrics",
    value: portfolio,
  });

  if (isLoading || !portfolio) {
    return (
      <div className="container-xl space-y-5 pb-20">
        <header className="flex items-start justify-between pb-3 border-b border-gray-200">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Portfolio Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of all your vaults</p>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading portfolio...</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter vaults based on selected filter
  const filteredVaults = portfolio.vaults.filter((vault) => {
    if (filter === 'all') return true;
    if (filter === 'needs-attention') return vault.healthStatus === 'needs-attention';
    if (filter === 'at-risk') return vault.healthStatus === 'at-risk';
    if (filter === 'stale') return vault.daysSinceActivity >= 7;
    return true;
  });

  return (
    <div className="container-xl space-y-6 pb-20">
      {/* Header */}
      <header className="flex items-start justify-between pb-3 border-b border-gray-200 animate-fade-in">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Portfolio Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor all your vaults from one place
          </p>
        </div>
      </header>

      {/* Portfolio Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Vaults"
          value={portfolio.summary.totalVaults}
          subtitle="Organizations"
          icon={Building2}
        />

        <StatCard
          title="Healthy"
          value={portfolio.summary.healthyCount}
          subtitle="No issues detected"
          icon={CheckCircle2}
        />

        <StatCard
          title="Needs Attention"
          value={portfolio.summary.needsAttentionCount}
          subtitle="Review recommended"
          icon={AlertTriangle}
        />

        <StatCard
          title="At Risk"
          value={portfolio.summary.atRiskCount}
          subtitle="Immediate action required"
          icon={AlertTriangle}
        />
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground mr-2">Filter:</span>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="h-8"
        >
          All ({portfolio.summary.totalVaults})
        </Button>
        <Button
          variant={filter === 'needs-attention' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('needs-attention')}
          className="h-8"
        >
          Needs Attention ({portfolio.summary.needsAttentionCount})
        </Button>
        <Button
          variant={filter === 'at-risk' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('at-risk')}
          className="h-8"
        >
          At Risk ({portfolio.summary.atRiskCount})
        </Button>
        <Button
          variant={filter === 'stale' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('stale')}
          className="h-8"
        >
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          Stale Updates ({portfolio.summary.staleCount})
        </Button>
      </div>

      {/* Vaults Grid */}
      {filteredVaults.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No vaults match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filteredVaults.map((vault) => (
            <VaultTile key={vault.id} vault={vault} />
          ))}
        </div>
      )}
    </div>
  );
}
