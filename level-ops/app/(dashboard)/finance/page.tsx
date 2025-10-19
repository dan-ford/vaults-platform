"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard } from "@/components/permissions";
import { FinancialSnapshotForm } from "@/components/finance/snapshot-form";
import { FinancialCard } from "@/components/finance/financial-card";

type FinancialSnapshot = {
  id: string;
  org_id: string;
  period: string;
  arr: number | null;
  revenue: number | null;
  gross_margin: number | null;
  cash: number | null;
  burn: number | null;
  runway_days: number | null;
  notes: string | null;
  source_ref: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export default function FinancePage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { canEdit } = usePermissions();

  // Load financial snapshots
  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("financial_snapshots")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("period", { ascending: false })
        .limit(12);

      if (error) {
        console.error("Error loading financial snapshots:", error);
      } else if (data) {
        setSnapshots(data);
      }
    } catch (error) {
      console.error("Error in loadData:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;

    loadData();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for financial snapshots
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('financial-snapshots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_snapshots',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSnapshots(current => [payload.new as FinancialSnapshot, ...current].slice(0, 12));
          } else if (payload.eventType === 'UPDATE') {
            setSnapshots(current => current.map(s => s.id === payload.new.id ? payload.new as FinancialSnapshot : s));
          } else if (payload.eventType === 'DELETE') {
            setSnapshots(current => current.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </div>
    );
  }

  const latestSnapshot = snapshots[0];
  const previousSnapshot = snapshots[1];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="text-muted-foreground mt-1">
            Track ARR, revenue, cash, burn, and runway metrics
          </p>
        </div>
        <PermissionGuard action="edit">
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Snapshot
          </Button>
        </PermissionGuard>
      </div>

      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No financial snapshots yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Start tracking your financial metrics to monitor business health and communicate progress to stakeholders.
            </p>
            <PermissionGuard action="edit">
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first snapshot
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <FinancialCard
            snapshot={latestSnapshot}
            previousSnapshot={previousSnapshot}
            onRefresh={loadData}
          />

          {snapshots.length > 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Historical Snapshots</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshots.slice(1).map((snapshot) => {
                  const index = snapshots.indexOf(snapshot);
                  const prev = snapshots[index + 1];
                  return (
                    <FinancialCard
                      key={snapshot.id}
                      snapshot={snapshot}
                      previousSnapshot={prev}
                      onRefresh={loadData}
                      compact
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <FinancialSnapshotForm
        open={isCreating}
        onOpenChange={setIsCreating}
        onSuccess={() => {
          setIsCreating(false);
          loadData();
        }}
      />
    </div>
  );
}
