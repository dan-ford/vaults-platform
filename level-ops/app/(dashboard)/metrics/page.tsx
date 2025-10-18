"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard } from "@/components/permissions";
import { KPIForm } from "@/components/metrics/kpi-form";
import { KPICard } from "@/components/metrics/kpi-card";
import { useFeatureFlag } from "@/lib/hooks/use-feature-flag";
import { useRouter } from "next/navigation";

type KPI = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  unit: string | null;
  target: number | null;
  owner_id: string | null;
  cadence: string;
  display_order: number | null;
  is_active: boolean | null;
  metadata: any;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type KPIMeasurement = {
  id: string;
  kpi_id: string;
  org_id: string;
  period: string;
  value: number;
  variance_note: string | null;
  source_ref: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export default function MetricsPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [measurements, setMeasurements] = useState<Record<string, KPIMeasurement[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { canEdit } = usePermissions();
  const executiveLayerEnabled = useFeatureFlag('executive_layer_v2');
  const router = useRouter();

  // Redirect if feature not enabled
  useEffect(() => {
    if (!executiveLayerEnabled) {
      router.push('/dashboard');
    }
  }, [executiveLayerEnabled, router]);

  // Load KPIs and their measurements
  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      // Load KPIs
      const { data: kpisData, error: kpisError } = await supabase
        .from("kpis")
        .select("*")
        .eq("org_id", currentOrg.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (kpisError) {
        console.error("Error loading KPIs:", kpisError);
      } else if (kpisData) {
        setKpis(kpisData);

        // Load measurements for each KPI (last 12 periods)
        const measurementsMap: Record<string, KPIMeasurement[]> = {};
        for (const kpi of kpisData) {
          const { data: measData } = await supabase
            .from("kpi_measurements")
            .select("*")
            .eq("kpi_id", kpi.id)
            .order("period", { ascending: false })
            .limit(12);

          if (measData) {
            measurementsMap[kpi.id] = measData;
          }
        }
        setMeasurements(measurementsMap);
      }
    } catch (error) {
      console.error("Error in loadData:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg || !executiveLayerEnabled) return;

    loadData();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id, executiveLayerEnabled]);

  // Realtime subscription for KPIs
  useEffect(() => {
    if (!currentOrg || !executiveLayerEnabled) return;

    const channel = supabase
      .channel('kpis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpis',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setKpis(current => [...current, payload.new as KPI]);
          } else if (payload.eventType === 'UPDATE') {
            setKpis(current => current.map(k => k.id === payload.new.id ? payload.new as KPI : k));
          } else if (payload.eventType === 'DELETE') {
            setKpis(current => current.filter(k => k.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id, executiveLayerEnabled]);

  // Realtime subscription for measurements
  useEffect(() => {
    if (!currentOrg || !executiveLayerEnabled) return;

    const channel = supabase
      .channel('kpi-measurements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpi_measurements',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const measurement = payload.new as KPIMeasurement;
            setMeasurements(current => ({
              ...current,
              [measurement.kpi_id]: [
                measurement,
                ...(current[measurement.kpi_id] || []).filter(m => m.id !== measurement.id)
              ].sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime()).slice(0, 12)
            }));
          } else if (payload.eventType === 'DELETE') {
            const measurement = payload.old as KPIMeasurement;
            setMeasurements(current => ({
              ...current,
              [measurement.kpi_id]: (current[measurement.kpi_id] || []).filter(m => m.id !== measurement.id)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id, executiveLayerEnabled]);

  if (!executiveLayerEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Track core KPIs with trends and variance notes
          </p>
        </div>
        <PermissionGuard action="edit">
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add KPI
          </Button>
        </PermissionGuard>
      </div>

      {kpis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No KPIs yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Start tracking your key performance indicators to monitor business health and growth.
            </p>
            <PermissionGuard action="edit">
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first KPI
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((kpi) => (
            <KPICard
              key={kpi.id}
              kpi={kpi}
              measurements={measurements[kpi.id] || []}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      <KPIForm
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
