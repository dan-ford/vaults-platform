"use client";

import { useState, useEffect } from "react";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, TrendingUp, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { PermissionGuard } from "@/components/permissions";
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";
import { FinancialSnapshotForm } from "@/components/finance/snapshot-form";
import { FinancialCard } from "@/components/finance/financial-card";
import { FinancialDocumentUploadDialog } from "@/components/finance/financial-document-upload-dialog";
import { AnalysisReviewCard } from "@/components/finance/analysis-review-card";
import { AnalysisList } from "@/components/finance/analysis-list";

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

type FinancialAnalysis = {
  id: string;
  org_id: string;
  document_id: string;
  file_type: string;
  analysis_status: string;
  raw_analysis: unknown;
  confidence_score: number | null;
  extracted_data: unknown;
  ai_insights: string[] | null;
  ai_recommendations: string[] | null;
  detected_issues: string[] | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved: boolean | null;
  snapshot_id: string | null;
  error_message: string | null;
  processing_time_ms: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export default function FinancePage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [analyses, setAnalyses] = useState<FinancialAnalysis[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<FinancialAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { canEdit, role, canDelete } = usePermissions();
  const { logAgentAction } = useAuditLog();

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

  // Load financial analyses
  const loadAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) return;

      const { data, error } = await supabase
        .from("financial_analyses")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading financial analyses:", error);
      } else if (data) {
        setAnalyses(data);
      }
    } catch (error) {
      console.error("Error in loadAnalyses:", error);
    }
  };

  // Load on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;

    loadData();
    loadAnalyses();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
        loadAnalyses();
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
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['financial_snapshots']['Row']>) => {
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

  // Realtime subscription for financial analyses
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('financial-analyses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_analyses',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['financial_analyses']['Row']>) => {
          if (payload.eventType === 'INSERT') {
            setAnalyses(current => [payload.new as FinancialAnalysis, ...current].slice(0, 10));
          } else if (payload.eventType === 'UPDATE') {
            setAnalyses(current => current.map(a => a.id === payload.new.id ? payload.new as FinancialAnalysis : a));
          } else if (payload.eventType === 'DELETE') {
            setAnalyses(current => current.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Expose financial snapshots to agent
  useCopilotReadable({
    description: "The current list of financial snapshots with ARR, revenue, gross margin, cash, burn rate, and runway metrics for the organization. Sorted by period (most recent first).",
    value: snapshots,
  });

  // Agent action: Create financial snapshot
  useCopilotAction({
    name: "createFinancialSnapshot",
    description: "Create a new financial snapshot with metrics like ARR, revenue, gross margin, cash, burn rate, and runway. Period should be in YYYY-MM format (e.g., '2024-01').",
    parameters: [
      {
        name: "period",
        type: "string",
        description: "The period for this snapshot in YYYY-MM format (e.g., '2024-01' for January 2024)",
        required: true,
      },
      {
        name: "arr",
        type: "number",
        description: "Annual Recurring Revenue in dollars",
        required: false,
      },
      {
        name: "revenue",
        type: "number",
        description: "Total revenue for the period in dollars",
        required: false,
      },
      {
        name: "gross_margin",
        type: "number",
        description: "Gross margin as a percentage (0-100)",
        required: false,
      },
      {
        name: "cash",
        type: "number",
        description: "Cash balance in dollars",
        required: false,
      },
      {
        name: "burn",
        type: "number",
        description: "Monthly burn rate in dollars",
        required: false,
      },
      {
        name: "runway_days",
        type: "number",
        description: "Runway in days (calculated: cash / (burn/30))",
        required: false,
      },
      {
        name: "notes",
        type: "string",
        description: "Additional notes or context about this snapshot",
        required: false,
      },
    ],
    handler: async ({ period, arr, revenue, gross_margin, cash, burn, runway_days, notes }) => {
      if (!canEdit) {
        return getCreatePermissionError("financial snapshots", role);
      }

      if (!currentOrg) {
        return "Error: No organization context available";
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return "Error: User not authenticated";
      }

      const { data, error } = await supabase
        .from("financial_snapshots")
        .insert({
          org_id: currentOrg.id,
          period,
          arr: arr ?? null,
          revenue: revenue ?? null,
          gross_margin: gross_margin ?? null,
          cash: cash ?? null,
          burn: burn ?? null,
          runway_days: runway_days ?? null,
          notes: notes ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating financial snapshot:", error);
        return `Error creating financial snapshot: ${error.message}`;
      }

      await logAgentAction(
        "created",
        "financial_snapshot",
        data.id,
        null,
        data
      );

      return `Financial snapshot for ${period} created successfully with ${[
        arr !== undefined && "ARR",
        revenue !== undefined && "revenue",
        gross_margin !== undefined && "gross margin",
        cash !== undefined && "cash",
        burn !== undefined && "burn rate",
        runway_days !== undefined && "runway",
      ].filter(Boolean).join(", ")}`;
    },
  });

  // Agent action: Update financial snapshot
  useCopilotAction({
    name: "updateFinancialSnapshot",
    description: "Update an existing financial snapshot. You can update any combination of metrics. Only provide the fields you want to change.",
    parameters: [
      {
        name: "snapshotId",
        type: "string",
        description: "The ID of the snapshot to update",
        required: true,
      },
      {
        name: "period",
        type: "string",
        description: "The period for this snapshot in YYYY-MM format",
        required: false,
      },
      {
        name: "arr",
        type: "number",
        description: "Annual Recurring Revenue in dollars",
        required: false,
      },
      {
        name: "revenue",
        type: "number",
        description: "Total revenue for the period in dollars",
        required: false,
      },
      {
        name: "gross_margin",
        type: "number",
        description: "Gross margin as a percentage (0-100)",
        required: false,
      },
      {
        name: "cash",
        type: "number",
        description: "Cash balance in dollars",
        required: false,
      },
      {
        name: "burn",
        type: "number",
        description: "Monthly burn rate in dollars",
        required: false,
      },
      {
        name: "runway_days",
        type: "number",
        description: "Runway in days",
        required: false,
      },
      {
        name: "notes",
        type: "string",
        description: "Additional notes or context",
        required: false,
      },
    ],
    handler: async ({ snapshotId, period, arr, revenue, gross_margin, cash, burn, runway_days, notes }) => {
      if (!canEdit) {
        return getEditPermissionError("financial snapshots", role);
      }

      if (!currentOrg) {
        return "Error: No organization context available";
      }

      // Get current state for audit log
      const { data: currentSnapshot, error: fetchError } = await supabase
        .from("financial_snapshots")
        .select("*")
        .eq("id", snapshotId)
        .eq("org_id", currentOrg.id)
        .single();

      if (fetchError || !currentSnapshot) {
        return `Error: Financial snapshot not found or access denied`;
      }

      // Build update object with only provided fields
      const updates: Partial<FinancialSnapshot> = {};
      if (period !== undefined) updates.period = period;
      if (arr !== undefined) updates.arr = arr;
      if (revenue !== undefined) updates.revenue = revenue;
      if (gross_margin !== undefined) updates.gross_margin = gross_margin;
      if (cash !== undefined) updates.cash = cash;
      if (burn !== undefined) updates.burn = burn;
      if (runway_days !== undefined) updates.runway_days = runway_days;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabase
        .from("financial_snapshots")
        .update(updates)
        .eq("id", snapshotId)
        .eq("org_id", currentOrg.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating financial snapshot:", error);
        return `Error updating financial snapshot: ${error.message}`;
      }

      await logAgentAction(
        "updated",
        "financial_snapshot",
        data.id,
        currentSnapshot,
        data
      );

      const updatedFields = Object.keys(updates).join(", ");
      return `Financial snapshot for ${data.period} updated successfully. Changed: ${updatedFields}`;
    },
  });

  // Agent action: Get latest financial snapshot
  useCopilotAction({
    name: "getLatestFinancialSnapshot",
    description: "Get the most recent financial snapshot for the organization with all metrics",
    parameters: [],
    handler: async () => {
      if (!currentOrg) {
        return "Error: No organization context available";
      }

      const { data, error } = await supabase
        .from("financial_snapshots")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("period", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return "No financial snapshots found for this organization";
      }

      return `Latest financial snapshot (${data.period}): ARR: $${data.arr?.toLocaleString() ?? "N/A"}, Revenue: $${data.revenue?.toLocaleString() ?? "N/A"}, Gross Margin: ${data.gross_margin ?? "N/A"}%, Cash: $${data.cash?.toLocaleString() ?? "N/A"}, Burn: $${data.burn?.toLocaleString() ?? "N/A"}/mo, Runway: ${data.runway_days ?? "N/A"} days${data.notes ? `, Notes: ${data.notes}` : ""}`;
    },
  });

  // Agent action: Delete financial snapshot
  useCopilotAction({
    name: "deleteFinancialSnapshot",
    description: "Delete a financial snapshot. This action requires admin or owner permissions and cannot be undone.",
    parameters: [
      {
        name: "snapshotId",
        type: "string",
        description: "The ID of the snapshot to delete",
        required: true,
      },
    ],
    handler: async ({ snapshotId }) => {
      if (!canDelete) {
        return getDeletePermissionError("financial snapshots", role);
      }

      if (!currentOrg) {
        return "Error: No organization context available";
      }

      // Get current state for audit log
      const { data: currentSnapshot, error: fetchError } = await supabase
        .from("financial_snapshots")
        .select("*")
        .eq("id", snapshotId)
        .eq("org_id", currentOrg.id)
        .single();

      if (fetchError || !currentSnapshot) {
        return `Error: Financial snapshot not found or access denied`;
      }

      const { error } = await supabase
        .from("financial_snapshots")
        .delete()
        .eq("id", snapshotId)
        .eq("org_id", currentOrg.id);

      if (error) {
        console.error("Error deleting financial snapshot:", error);
        return `Error deleting financial snapshot: ${error.message}`;
      }

      await logAgentAction(
        "deleted",
        "financial_snapshot",
        snapshotId,
        currentSnapshot,
        null
      );

      return `Financial snapshot for ${currentSnapshot.period} deleted successfully`;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }

  const latestSnapshot = snapshots[0];
  const previousSnapshot = snapshots[1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground mt-1">
            Track ARR, revenue, cash, burn, and runway metrics
          </p>
        </div>
        <PermissionGuard require="edit">
          <div className="flex gap-2">
            <Button
              onClick={() => setIsUploading(true)}
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              aria-label="Upload financial document"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setIsCreating(true)}
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Add financial snapshot"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </PermissionGuard>
      </div>

      {/* Pending Analyses Section */}
      {analyses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Document Analysis</h2>

          {/* Show review card for selected analysis */}
          {selectedAnalysis && selectedAnalysis.analysis_status === 'review' && (
            <AnalysisReviewCard
              analysis={selectedAnalysis}
              onApprove={() => {
                setSelectedAnalysis(null);
                loadAnalyses();
                loadData();
              }}
              onReject={() => {
                setSelectedAnalysis(null);
                loadAnalyses();
              }}
            />
          )}

          {/* List all analyses */}
          <AnalysisList
            analyses={analyses}
            onViewDetails={(analysis) => setSelectedAnalysis(analysis)}
            onDelete={(analysisId) => {
              setAnalyses(current => current.filter(a => a.id !== analysisId));
              if (selectedAnalysis?.id === analysisId) {
                setSelectedAnalysis(null);
              }
            }}
            onRefresh={loadAnalyses}
          />
        </div>
      )}

      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No financial snapshots yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Start tracking your financial metrics to monitor business health and communicate progress to stakeholders.
            </p>
            <PermissionGuard require="edit">
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

      {currentOrg && (
        <FinancialDocumentUploadDialog
          orgId={currentOrg.id}
          open={isUploading}
          onOpenChange={setIsUploading}
          onUploadComplete={() => {
            setIsUploading(false);
            loadAnalyses();
          }}
        />
      )}
    </div>
  );
}
