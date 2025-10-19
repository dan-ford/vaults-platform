"use client";

import { useState, useEffect } from "react";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, AlertTriangle, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables, Database } from "@/lib/supabase/database.types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useOrganization } from "@/lib/context/organization-context";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";
import { LoadingState } from "@/components/error-states";

type Risk = Tables<"risks">;

const IMPACT_OPTIONS = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "medium", label: "Medium", color: "bg-slate-200 text-slate-800 border-slate-300" },
  { value: "high", label: "High", color: "bg-slate-300 text-slate-900 border-slate-400" },
  { value: "critical", label: "Critical", color: "bg-slate-400 text-slate-950 border-slate-500" },
];

const PROBABILITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "medium", label: "Medium", color: "bg-slate-200 text-slate-800 border-slate-300" },
  { value: "high", label: "High", color: "bg-slate-300 text-slate-900 border-slate-400" },
];

const STATUS_OPTIONS = [
  { value: "identified", label: "Identified", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "mitigating", label: "Mitigating", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "mitigated", label: "Mitigated", color: "bg-slate-200 text-slate-900 border-slate-300" },
  { value: "accepted", label: "Accepted", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "occurred", label: "Occurred", color: "bg-destructive/10 text-destructive border-destructive/20" },
];

export default function RisksPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: "",
    description: "",
    impact: "medium",
    probability: "medium",
    status: "identified",
    mitigation_plan: "",
  });
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { logAgentAction } = useAuditLog();
  const { hasPermission, role, canEdit, canDelete, isViewer } = usePermissions();

  // Load risks function
  const loadRisks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("risks")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading risks:", error);
      } else if (data) {
        setRisks(data);
      }
    } catch (error) {
      console.error("Error in loadRisks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load risks on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;
    loadRisks();

    // Reload when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadRisks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('risks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risks',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['risks']['Row']>) => {
          if (payload.eventType === 'INSERT') {
            setRisks(current => [payload.new as Risk, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setRisks(current => current.map(r => r.id === payload.new.id ? payload.new as Risk : r));
          } else if (payload.eventType === 'DELETE') {
            setRisks(current => current.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Make risks readable to the AI
  useCopilotReadable({
    description: "The current list of project risks",
    value: risks,
  });

  // AI action to create a risk
  useCopilotAction({
    name: "createRisk",
    description: "Create a new project risk with title, description, impact level, probability, and mitigation plan",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "The title of the risk",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "Detailed description of the risk",
        required: false,
      },
      {
        name: "impact",
        type: "string",
        description: "Impact level: low, medium, high, or critical",
        required: false,
      },
      {
        name: "probability",
        type: "string",
        description: "Probability of occurrence: low, medium, or high",
        required: false,
      },
      {
        name: "mitigation_plan",
        type: "string",
        description: "Plan to mitigate or manage the risk",
        required: false,
      },
    ],
    handler: async ({ title, description, impact, probability, mitigation_plan }) => {
      // Check permission first
      if (!canEdit) {
        return getCreatePermissionError("risks", role);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) throw new Error("Not authenticated");

      const { data, error } = await supabase.from("risks").insert({
        title,
        description: description || null,
        impact: impact || "medium",
        probability: probability || "medium",
        status: "identified",
        mitigation_plan: mitigation_plan || null,
        org_id: currentOrg.id,
        tenant_id: null, // Using organizations, not tenants
        created_by: user.id,
      } as any)
      .select()
      .single();

      if (error) throw error;

      if (data) {
        const risk = data as Risk;

        // Audit log the agent action
        await logAgentAction(
          'create',
          'risk',
          risk.id,
          null,
          { title: risk.title, description: risk.description, impact: risk.impact, probability: risk.probability, status: risk.status },
          { source: 'ai_assistant' }
        );
      }

      return `Risk "${title}" created successfully`;
    },
  });

  // AI action to update a risk
  useCopilotAction({
    name: "updateRisk",
    description: "Update an existing risk's details, status, or mitigation plan",
    parameters: [
      {
        name: "riskId",
        type: "string",
        description: "The ID of the risk to update",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "New title for the risk",
        required: false,
      },
      {
        name: "description",
        type: "string",
        description: "New description for the risk",
        required: false,
      },
      {
        name: "impact",
        type: "string",
        description: "New impact level: low, medium, high, or critical",
        required: false,
      },
      {
        name: "probability",
        type: "string",
        description: "New probability: low, medium, or high",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "New status: identified, mitigating, mitigated, accepted, or occurred",
        required: false,
      },
      {
        name: "mitigation_plan",
        type: "string",
        description: "New or updated mitigation plan",
        required: false,
      },
    ],
    handler: async ({ riskId, title, description, impact, probability, status, mitigation_plan }) => {
      if (!canEdit) {
        return getEditPermissionError("risks", role);
      }

      // Get current risk state for audit log
      const currentRisk = risks.find(r => r.id === riskId);

      const updates: Partial<Risk> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (impact !== undefined) updates.impact = impact;
      if (probability !== undefined) updates.probability = probability;
      if (status !== undefined) updates.status = status;
      if (mitigation_plan !== undefined) updates.mitigation_plan = mitigation_plan;

      const { data, error } = await supabase
        .from("risks")
        .update(updates)
        .eq("id", riskId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const risk = data as Risk;

        // Audit log the update
        const beforeState = currentRisk ? {
          title: currentRisk.title,
          description: currentRisk.description,
          impact: currentRisk.impact,
          probability: currentRisk.probability,
          status: currentRisk.status,
          mitigation_plan: currentRisk.mitigation_plan
        } : null;

        await logAgentAction(
          'update',
          'risk',
          risk.id,
          beforeState,
          { ...updates },
          { source: 'ai_assistant' }
        );
      }

      return `Risk updated successfully`;
    },
  });

  // AI action to delete a risk
  useCopilotAction({
    name: "deleteRisk",
    description: "Delete a risk from the project",
    parameters: [
      {
        name: "riskId",
        type: "string",
        description: "The ID of the risk to delete",
        required: true,
      },
    ],
    handler: async ({ riskId }) => {
      if (!canDelete) {
        return getDeletePermissionError("risks", role);
      }

      // Get current risk state for audit log
      const currentRisk = risks.find(r => r.id === riskId);

      const { error } = await supabase
        .from("risks")
        .delete()
        .eq("id", riskId);

      if (error) throw error;

      // Audit log the deletion
      if (currentRisk) {
        await logAgentAction(
          'delete',
          'risk',
          riskId,
          { title: currentRisk.title, description: currentRisk.description, impact: currentRisk.impact, probability: currentRisk.probability, status: currentRisk.status },
          null,
          { source: 'ai_assistant' }
        );
      }

      return `Risk deleted successfully`;
    },
  });

  // Create risk handler
  const handleCreateRisk = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    const { error } = await supabase.from("risks").insert({
      ...newRisk,
      org_id: currentOrg.id,
      tenant_id: null, // Using organizations, not tenants
      created_by: user.id,
    } as never);

    if (error) {
      console.error("Error creating risk:", error);
      return;
    }

    setIsCreating(false);
    setNewRisk({
      title: "",
      description: "",
      impact: "medium",
      probability: "medium",
      status: "identified",
      mitigation_plan: "",
    });
  };

  // Update risk handler
  const handleUpdateRisk = async () => {
    if (!editingRisk) return;

    const { error } = await supabase
      .from("risks")
      .update({
        title: editingRisk.title,
        description: editingRisk.description,
        impact: editingRisk.impact,
        probability: editingRisk.probability,
        status: editingRisk.status,
        mitigation_plan: editingRisk.mitigation_plan,
      } as never)
      .eq("id", editingRisk.id);

    if (error) {
      console.error("Error updating risk:", error);
      return;
    }

    setEditingRisk(null);
  };

  // Delete risk handler
  const handleDeleteRisk = async () => {
    if (!deletingRisk) return;

    const { error } = await supabase
      .from("risks")
      .delete()
      .eq("id", deletingRisk.id);

    if (error) {
      console.error("Error deleting risk:", error);
      return;
    }

    setDeletingRisk(null);
  };

  const getImpactColor = (impact: string) => {
    return IMPACT_OPTIONS.find(opt => opt.value === impact)?.color || IMPACT_OPTIONS[1].color;
  };

  const getProbabilityColor = (probability: string) => {
    return PROBABILITY_OPTIONS.find(opt => opt.value === probability)?.color || PROBABILITY_OPTIONS[1].color;
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || STATUS_OPTIONS[0].color;
  };

  if (isLoading) {
    return <LoadingState message="Loading risks..." />;
  }

  return (
    <div className="container-xl space-y-5 pb-20 md:pb-5 animate-fade-in">
      <header className="flex items-start justify-between pb-3 border-b border-gray-200">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Risks</h1>
          <p className="text-sm text-muted-foreground">Identify and manage project risks</p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button
            size="icon"
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 w-9 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Add new risk"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </header>

      {risks.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
          <p className="text-lg font-medium text-muted-foreground mb-2">No risks identified</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Document potential risks, their impact, and mitigation strategies
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {risks.map((risk) => (
            <Card key={risk.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-lg truncate">{risk.title}</h3>
                    <Badge variant="outline" className={getStatusColor(risk.status)}>
                      {risk.status}
                    </Badge>
                  </div>
                  {risk.description && (
                    <p className="text-sm text-muted-foreground mb-3">{risk.description}</p>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Impact:</span>
                      <Badge variant="outline" className={getImpactColor(risk.impact)}>
                        {risk.impact}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Probability:</span>
                      <Badge variant="outline" className={getProbabilityColor(risk.probability)}>
                        {risk.probability}
                      </Badge>
                    </div>
                  </div>
                  {risk.mitigation_plan && (
                    <div className="mt-3 p-3 bg-secondary/50 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Mitigation Plan:</p>
                      <p className="text-sm text-foreground">{risk.mitigation_plan}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <PermissionGuard require="edit">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingRisk(risk)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard require="delete">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingRisk(risk)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Risk Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Risk</DialogTitle>
            <DialogDescription>Add a new risk to your project risk register</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Resource availability risk"
                value={newRisk.title}
                onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Describe the risk in detail"
                value={newRisk.description}
                onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="impact">Impact</Label>
                <select
                  id="impact"
                  value={newRisk.impact}
                  onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {IMPACT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability</Label>
                <select
                  id="probability"
                  value={newRisk.probability}
                  onChange={(e) => setNewRisk({ ...newRisk, probability: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PROBABILITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mitigation">Mitigation Plan</Label>
              <textarea
                id="mitigation"
                placeholder="How will you mitigate this risk?"
                value={newRisk.mitigation_plan}
                onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateRisk} disabled={!newRisk.title.trim()}>Create Risk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Risk Dialog */}
      <Dialog open={!!editingRisk} onOpenChange={() => setEditingRisk(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Risk</DialogTitle>
            <DialogDescription>Update risk details and status</DialogDescription>
          </DialogHeader>
          {editingRisk && (
            <div className="space-y-4 overflow-y-auto flex-1 px-1">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingRisk.title}
                  onChange={(e) => setEditingRisk({ ...editingRisk, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={editingRisk.description || ""}
                  onChange={(e) => setEditingRisk({ ...editingRisk, description: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-impact">Impact</Label>
                  <select
                    id="edit-impact"
                    value={editingRisk.impact}
                    onChange={(e) => setEditingRisk({ ...editingRisk, impact: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {IMPACT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-probability">Probability</Label>
                  <select
                    id="edit-probability"
                    value={editingRisk.probability}
                    onChange={(e) => setEditingRisk({ ...editingRisk, probability: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {PROBABILITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editingRisk.status}
                  onChange={(e) => setEditingRisk({ ...editingRisk, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mitigation">Mitigation Plan</Label>
                <textarea
                  id="edit-mitigation"
                  value={editingRisk.mitigation_plan || ""}
                  onChange={(e) => setEditingRisk({ ...editingRisk, mitigation_plan: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingRisk(null)}>Cancel</Button>
            <Button onClick={handleUpdateRisk}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingRisk} onOpenChange={() => setDeletingRisk(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Risk</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingRisk?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRisk(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRisk}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
