"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/context/organization-context';

export type VaultHealthStatus = 'healthy' | 'needs-attention' | 'at-risk';

export interface VaultMetrics {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;

  // Health indicator
  healthStatus: VaultHealthStatus;
  healthReasons: string[]; // Human-readable reasons for the status

  // Key metrics
  criticalRisksCount: number;
  activeTasksCount: number;
  activeOkrsCount: number;
  lastActivityAt: string | null;
  daysSinceActivity: number;

  // Executive layer metrics
  hasFinancialData: boolean;
  activeKpisCount: number;
  pendingRequestsCount: number;
}

export interface PortfolioData {
  vaults: VaultMetrics[];
  summary: {
    totalVaults: number;
    healthyCount: number;
    needsAttentionCount: number;
    atRiskCount: number;
    staleCount: number; // No activity in 7+ days
  };
}

export function usePortfolioData() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { organizations } = useOrganization();
  const supabase = createClient();

  const loadPortfolioData = async () => {
    if (!organizations || organizations.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch metrics for all vaults in parallel
      const vaultMetricsPromises = organizations.map(async (org) => {
        const [
          risksResult,
          tasksResult,
          okrsResult,
          activityResult,
          financialResult,
          kpisResult,
          requestsResult,
        ] = await Promise.all([
          // Critical/high risks
          supabase
            .from('risks')
            .select('impact', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .in('impact', ['critical', 'high']),

          // Active tasks
          supabase
            .from('tasks')
            .select('status', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .in('status', ['todo', 'in_progress']),

          // Active OKRs
          supabase
            .from('okrs')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('is_active', true),

          // Last activity
          supabase
            .from('activity_log')
            .select('created_at')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),

          // Financial data exists
          supabase
            .from('financial_snapshots')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .limit(1),

          // Active KPIs
          supabase
            .from('kpis')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('is_active', true),

          // Pending requests
          supabase
            .from('requests')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('status', 'pending'),
        ]);

        const criticalRisksCount = risksResult.count || 0;
        const activeTasksCount = tasksResult.count || 0;
        const activeOkrsCount = okrsResult.count || 0;
        const hasFinancialData = (financialResult.count || 0) > 0;
        const activeKpisCount = kpisResult.count || 0;
        const pendingRequestsCount = requestsResult.count || 0;

        const lastActivityAt = activityResult.data?.created_at || null;
        const daysSinceActivity = lastActivityAt
          ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Calculate health status
        const healthReasons: string[] = [];
        let healthStatus: VaultHealthStatus = 'healthy';

        // At-risk criteria (RED)
        if (criticalRisksCount > 0) {
          healthStatus = 'at-risk';
          healthReasons.push(`${criticalRisksCount} critical/high risk${criticalRisksCount > 1 ? 's' : ''}`);
        }
        if (daysSinceActivity >= 7) {
          healthStatus = 'at-risk';
          healthReasons.push(`No activity in ${daysSinceActivity} days`);
        }

        // Needs attention criteria (YELLOW) - only if not already at-risk
        if (healthStatus !== 'at-risk') {
          if (daysSinceActivity >= 3 && daysSinceActivity < 7) {
            healthStatus = 'needs-attention';
            healthReasons.push(`${daysSinceActivity} days since last activity`);
          }
          if (pendingRequestsCount > 3) {
            healthStatus = 'needs-attention';
            healthReasons.push(`${pendingRequestsCount} pending requests`);
          }
        }

        // If no issues, note positive indicators
        if (healthStatus === 'healthy') {
          healthReasons.push('All metrics healthy');
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo_url: org.logo_url,
          brand_color: org.brand_color,
          healthStatus,
          healthReasons,
          criticalRisksCount,
          activeTasksCount,
          activeOkrsCount,
          lastActivityAt,
          daysSinceActivity,
          hasFinancialData,
          activeKpisCount,
          pendingRequestsCount,
        } satisfies VaultMetrics;
      });

      const vaults = await Promise.all(vaultMetricsPromises);

      // Calculate summary
      const summary = {
        totalVaults: vaults.length,
        healthyCount: vaults.filter(v => v.healthStatus === 'healthy').length,
        needsAttentionCount: vaults.filter(v => v.healthStatus === 'needs-attention').length,
        atRiskCount: vaults.filter(v => v.healthStatus === 'at-risk').length,
        staleCount: vaults.filter(v => v.daysSinceActivity >= 7).length,
      };

      setPortfolio({ vaults, summary });
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();

    // Reload when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPortfolioData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [organizations]);

  // Realtime subscriptions for live updates across all vaults
  useEffect(() => {
    if (!organizations || organizations.length === 0) return;

    const orgIds = organizations.map(org => org.id);
    const tables = ['risks', 'tasks', 'okrs', 'activity_log', 'financial_snapshots', 'kpis', 'requests'];

    // Create a single channel that listens to all relevant tables
    const channel = supabase.channel('portfolio-changes');

    // Subscribe to changes in each table for all vaults
    tables.forEach(table => {
      orgIds.forEach(orgId => {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `org_id=eq.${orgId}`,
          },
          () => {
            // Reload portfolio data when any change occurs
            loadPortfolioData();
          }
        );
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizations]);

  return { portfolio, isLoading, refresh: loadPortfolioData };
}
