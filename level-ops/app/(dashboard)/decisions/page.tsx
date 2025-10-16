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
import { Plus, FileText, Pencil, Trash2, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { useOrganization } from "@/lib/context/organization-context";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";
import { LoadingState } from "@/components/error-states";

type Decision = Tables<"decisions">;

const STATUS_OPTIONS = [
  { value: "proposed", label: "Proposed", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "accepted", label: "Accepted", color: "bg-slate-200 text-slate-900 border-slate-300" },
  { value: "rejected", label: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { value: "deprecated", label: "Deprecated", color: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "superseded", label: "Superseded", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newDecision, setNewDecision] = useState({
    title: "",
    context: "",
    decision: "",
    rationale: "",
    alternatives_considered: "",
    status: "proposed",
  });
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [deletingDecision, setDeletingDecision] = useState<Decision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { logAgentAction } = useAuditLog();
  const { hasPermission, role, canEdit, canDelete, isViewer } = usePermissions();

  // Load decisions function
  const loadDecisions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("decisions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading decisions:", error);
      } else if (data) {
        setDecisions(data);
      }
    } catch (error) {
      console.error("Error in loadDecisions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load decisions on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;
    loadDecisions();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDecisions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('decisions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decisions',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDecisions(current => [payload.new as Decision, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setDecisions(current => current.map(d => d.id === payload.new.id ? payload.new as Decision : d));
          } else if (payload.eventType === 'DELETE') {
            setDecisions(current => current.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Make decisions readable to the AI
  useCopilotReadable({
    description: "The current list of project decisions (ADRs - Architecture Decision Records)",
    value: decisions,
  });

  // AI action to create a decision
  useCopilotAction({
    name: "createDecision",
    description: "Create a new project decision record with title, context, decision, rationale, and alternatives",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "The title of the decision",
        required: true,
      },
      {
        name: "context",
        type: "string",
        description: "The context or background for this decision",
        required: true,
      },
      {
        name: "decision",
        type: "string",
        description: "The actual decision made",
        required: true,
      },
      {
        name: "rationale",
        type: "string",
        description: "The reasoning behind this decision",
        required: false,
      },
      {
        name: "alternatives_considered",
        type: "string",
        description: "Alternative options that were considered",
        required: false,
      },
    ],
    handler: async ({ title, context, decision, rationale, alternatives_considered }) => {
      if (!canEdit) {
        return getCreatePermissionError("decisions", role);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) throw new Error("Not authenticated");

      const { data: insertedData, error } = await supabase.from("decisions").insert({
        title,
        context,
        decision,
        rationale: rationale || null,
        alternatives_considered: alternatives_considered || null,
        status: "proposed",
        org_id: currentOrg.id,
        tenant_id: null, // Using organizations, not tenants
        created_by: user.id,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

      if (error) throw error;

      if (insertedData) {
        const decisionRecord = insertedData as Decision;

        // Audit log the agent action
        await logAgentAction(
          'create',
          'decision',
          decisionRecord.id,
          null,
          { title: decisionRecord.title, context: decisionRecord.context, decision: decisionRecord.decision, status: decisionRecord.status },
          { source: 'ai_assistant' }
        );
      }

      return `Decision "${title}" created successfully`;
    },
  });

  // AI action to update a decision
  useCopilotAction({
    name: "updateDecision",
    description: "Update an existing decision's details or status",
    parameters: [
      {
        name: "decisionId",
        type: "string",
        description: "The ID of the decision to update",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "New title",
        required: false,
      },
      {
        name: "context",
        type: "string",
        description: "New context",
        required: false,
      },
      {
        name: "decision",
        type: "string",
        description: "New decision text",
        required: false,
      },
      {
        name: "rationale",
        type: "string",
        description: "New rationale",
        required: false,
      },
      {
        name: "alternatives_considered",
        type: "string",
        description: "New alternatives",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "New status: proposed, accepted, rejected, deprecated, or superseded",
        required: false,
      },
    ],
    handler: async ({ decisionId, title, context, decision, rationale, alternatives_considered, status }) => {
      if (!canEdit) {
        return getEditPermissionError("decisions", role);
      }

      // Get current decision state for audit log
      const currentDecision = decisions.find(d => d.id === decisionId);

      const updates: Partial<Decision> = {};
      if (title !== undefined) updates.title = title;
      if (context !== undefined) updates.context = context;
      if (decision !== undefined) updates.decision = decision;
      if (rationale !== undefined) updates.rationale = rationale;
      if (alternatives_considered !== undefined) updates.alternatives_considered = alternatives_considered;
      if (status !== undefined) updates.status = status;

      const { data: updatedData, error } = await supabase
        .from("decisions")
        // @ts-expect-error - Supabase type inference issue with update method
        .update(updates)
        .eq("id", decisionId)
        .select()
        .single();

      if (error) throw error;

      if (updatedData) {
        const decisionRecord = updatedData as Decision;

        // Audit log the update
        const beforeState = currentDecision ? {
          title: currentDecision.title,
          context: currentDecision.context,
          decision: currentDecision.decision,
          status: currentDecision.status
        } : null;

        await logAgentAction(
          'update',
          'decision',
          decisionRecord.id,
          beforeState,
          { ...updates },
          { source: 'ai_assistant' }
        );
      }

      return `Decision updated successfully`;
    },
  });

  // AI action to delete a decision
  useCopilotAction({
    name: "deleteDecision",
    description: "Delete a decision record from the project",
    parameters: [
      {
        name: "decisionId",
        type: "string",
        description: "The ID of the decision to delete",
        required: true,
      },
    ],
    handler: async ({ decisionId }) => {
      if (!canDelete) {
        return getDeletePermissionError("decisions", role);
      }

      // Get current decision state for audit log
      const currentDecision = decisions.find(d => d.id === decisionId);

      const { error } = await supabase
        .from("decisions")
        .delete()
        .eq("id", decisionId);

      if (error) throw error;

      // Audit log the deletion
      if (currentDecision) {
        await logAgentAction(
          'delete',
          'decision',
          decisionId,
          { title: currentDecision.title, context: currentDecision.context, decision: currentDecision.decision, status: currentDecision.status },
          null,
          { source: 'ai_assistant' }
        );
      }

      return `Decision deleted successfully`;
    },
  });

  // Create decision handler
  const handleCreateDecision = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    const { error } = await supabase.from("decisions").insert({
      ...newDecision,
      org_id: currentOrg.id,
      tenant_id: null, // Using organizations, not tenants
      created_by: user.id,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    } as never);

    if (error) {
      console.error("Error creating decision:", error);
      return;
    }

    setIsCreating(false);
    setNewDecision({
      title: "",
      context: "",
      decision: "",
      rationale: "",
      alternatives_considered: "",
      status: "proposed",
    });
  };

  // Update decision handler
  const handleUpdateDecision = async () => {
    if (!editingDecision) return;

    const { error } = await supabase
      .from("decisions")
      .update({
        title: editingDecision.title,
        context: editingDecision.context,
        decision: editingDecision.decision,
        rationale: editingDecision.rationale,
        alternatives_considered: editingDecision.alternatives_considered,
        status: editingDecision.status,
      } as never)
      .eq("id", editingDecision.id);

    if (error) {
      console.error("Error updating decision:", error);
      return;
    }

    setEditingDecision(null);
  };

  // Delete decision handler
  const handleDeleteDecision = async () => {
    if (!deletingDecision) return;

    const { error } = await supabase
      .from("decisions")
      .delete()
      .eq("id", deletingDecision.id);

    if (error) {
      console.error("Error deleting decision:", error);
      return;
    }

    setDeletingDecision(null);
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || STATUS_OPTIONS[0].color;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading decisions..." />;
  }

  return (
    <div className="container-xl space-y-5 pb-20 md:pb-5 animate-fade-in">
      <header className="flex items-start justify-between pb-3 border-b border-gray-200">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Decisions</h1>
          <p className="text-sm text-muted-foreground">Record important project decisions and their rationale</p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button
            size="icon"
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 w-9 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Add new decision"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </header>

      {decisions.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
          <p className="text-lg font-medium text-muted-foreground mb-2">No decisions recorded</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Document architectural decisions, trade-offs, and alternatives considered
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {decisions.map((dec) => (
            <Card key={dec.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-lg">{dec.title}</h3>
                    <Badge variant="outline" className={getStatusColor(dec.status)}>
                      {STATUS_OPTIONS.find(s => s.value === dec.status)?.label || dec.status}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Context:</p>
                      <p className="text-sm text-foreground">{dec.context}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Decision:</p>
                      <p className="text-sm text-foreground font-medium">{dec.decision}</p>
                    </div>
                    {dec.rationale && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Rationale:</p>
                        <p className="text-sm text-foreground">{dec.rationale}</p>
                      </div>
                    )}
                    {dec.alternatives_considered && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Alternatives Considered:</p>
                        <p className="text-sm text-foreground">{dec.alternatives_considered}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Decided: {formatDate(dec.decided_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <PermissionGuard require="edit">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingDecision(dec)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard require="delete">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingDecision(dec)}
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

      {/* Create Decision Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Decision</DialogTitle>
            <DialogDescription>Document an important project decision (ADR format)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Use PostgreSQL for primary database"
                value={newDecision.title}
                onChange={(e) => setNewDecision({ ...newDecision, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="context">Context</Label>
              <textarea
                id="context"
                placeholder="What is the context or background for this decision?"
                value={newDecision.context}
                onChange={(e) => setNewDecision({ ...newDecision, context: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision">Decision</Label>
              <textarea
                id="decision"
                placeholder="What decision was made?"
                value={newDecision.decision}
                onChange={(e) => setNewDecision({ ...newDecision, decision: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rationale">Rationale (Optional)</Label>
              <textarea
                id="rationale"
                placeholder="Why was this decision made?"
                value={newDecision.rationale}
                onChange={(e) => setNewDecision({ ...newDecision, rationale: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternatives">Alternatives Considered (Optional)</Label>
              <textarea
                id="alternatives"
                placeholder="What other options were considered?"
                value={newDecision.alternatives_considered}
                onChange={(e) => setNewDecision({ ...newDecision, alternatives_considered: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateDecision} disabled={!newDecision.title.trim() || !newDecision.context.trim() || !newDecision.decision.trim()}>
              Create Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Decision Dialog */}
      <Dialog open={!!editingDecision} onOpenChange={() => setEditingDecision(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Decision</DialogTitle>
            <DialogDescription>Update decision details and status</DialogDescription>
          </DialogHeader>
          {editingDecision && (
            <div className="space-y-4 overflow-y-auto flex-1 px-1">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingDecision.title}
                  onChange={(e) => setEditingDecision({ ...editingDecision, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-context">Context</Label>
                <textarea
                  id="edit-context"
                  value={editingDecision.context}
                  onChange={(e) => setEditingDecision({ ...editingDecision, context: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-decision">Decision</Label>
                <textarea
                  id="edit-decision"
                  value={editingDecision.decision}
                  onChange={(e) => setEditingDecision({ ...editingDecision, decision: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rationale">Rationale</Label>
                <textarea
                  id="edit-rationale"
                  value={editingDecision.rationale || ""}
                  onChange={(e) => setEditingDecision({ ...editingDecision, rationale: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-alternatives">Alternatives Considered</Label>
                <textarea
                  id="edit-alternatives"
                  value={editingDecision.alternatives_considered || ""}
                  onChange={(e) => setEditingDecision({ ...editingDecision, alternatives_considered: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editingDecision.status}
                  onChange={(e) => setEditingDecision({ ...editingDecision, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingDecision(null)}>Cancel</Button>
            <Button onClick={handleUpdateDecision}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingDecision} onOpenChange={() => setDeletingDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Decision</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingDecision?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDecision(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteDecision}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
