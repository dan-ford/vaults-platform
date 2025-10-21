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
import { Plus, Pencil, Trash2, Target, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables, Database } from "@/lib/supabase/database.types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useOrganization } from "@/lib/context/organization-context";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";

type Milestone = Tables<"milestones">;

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "active", label: "Active", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "completed", label: "Completed", color: "bg-slate-200 text-slate-900 border-slate-300" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-100 text-gray-800 border-gray-200" },
];

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    target_date: "",
    status: "planning" as const
  });
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<Milestone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { logAgentAction } = useAuditLog();
  const { hasPermission, role, canEdit, canDelete, isViewer } = usePermissions();

  // Load milestones function
  const loadMilestones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading milestones:", error);
      } else if (data) {
        setMilestones(data);
      }
    } catch (error) {
      console.error("Error in loadMilestones:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load milestones on mount, when org changes, and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;

    loadMilestones();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadMilestones();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('milestones-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['milestones']['Row']>) => {
          if (payload.eventType === 'INSERT') {
            setMilestones(current => [payload.new as Milestone, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setMilestones(current => current.map(m => m.id === payload.new.id ? payload.new as Milestone : m));
          } else if (payload.eventType === 'DELETE') {
            setMilestones(current => current.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Make milestones readable to the AI
  useCopilotReadable({
    description: "The current list of project milestones",
    value: milestones,
  });

  // AI action to create a milestone
  useCopilotAction({
    name: "createMilestone",
    description: "Create a new project milestone with name, description, target date, and status",
    parameters: [
      {
        name: "name",
        type: "string",
        description: "The name of the milestone",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "Detailed description of the milestone",
        required: false,
      },
      {
        name: "target_date",
        type: "string",
        description: "Target completion date (ISO 8601 format, e.g., 2025-12-31)",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "Status: planning, active, completed, or cancelled",
        required: false,
      },
    ],
    handler: async ({ name, description, target_date, status }) => {
      // Check permission first
      if (!canEdit) {
        return getCreatePermissionError("milestones", role);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!currentOrg) throw new Error("No tenant context");

      const { data, error } = await supabase
        .from("milestones")
        .insert({
          name,
          description: description || null,
          target_date: target_date || null,
          status: status || "planning",
          org_id: currentOrg.id,
          tenant_id: null, // Using organizations, not tenants
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const milestone = data as Milestone;

        // Audit log the agent action
        await logAgentAction(
          'create',
          'milestone',
          milestone.id,
          null,
          { name: milestone.name, description: milestone.description, status: milestone.status, target_date: milestone.target_date },
          { source: 'ai_assistant' }
        );
      }

      return `Milestone "${name}" created successfully`;
    },
  });

  // AI action to update milestone status
  useCopilotAction({
    name: "updateMilestoneStatus",
    description: "Update the status of a milestone",
    parameters: [
      {
        name: "milestoneId",
        type: "string",
        description: "The ID of the milestone to update",
        required: true,
      },
      {
        name: "status",
        type: "string",
        description: "The new status (planning, active, completed, cancelled)",
        required: true,
      },
    ],
    handler: async ({ milestoneId, status }) => {
      if (!canEdit) {
        return getEditPermissionError("milestones", role);
      }

      // Get current milestone state for audit log
      const currentMilestone = milestones.find(m => m.id === milestoneId);

      const { data, error } = await supabase
        .from("milestones")
        .update({ status })
        .eq("id", milestoneId)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const milestone = data as Milestone;
        setMilestones(milestones.map(m => m.id === milestoneId ? milestone : m));

        // Audit log the status update
        await logAgentAction(
          'update',
          'milestone',
          milestone.id,
          currentMilestone ? { status: currentMilestone.status } : null,
          { status: milestone.status },
          { source: 'ai_assistant', action: 'status_change' }
        );
      }

      return `Milestone status updated to ${status}`;
    },
  });

  // AI action to delete milestone
  useCopilotAction({
    name: "deleteMilestone",
    description: "Delete a milestone permanently",
    parameters: [
      {
        name: "milestoneId",
        type: "string",
        description: "The ID of the milestone to delete",
        required: true,
      },
    ],
    handler: async ({ milestoneId }) => {
      if (!canDelete) {
        return getDeletePermissionError("milestones", role);
      }

      // Get current milestone state for audit log
      const currentMilestone = milestones.find(m => m.id === milestoneId);

      const { error } = await supabase
        .from("milestones")
        .delete()
        .eq("id", milestoneId);

      if (error) throw error;
      setMilestones(milestones.filter(m => m.id !== milestoneId));

      // Audit log the deletion
      if (currentMilestone) {
        await logAgentAction(
          'delete',
          'milestone',
          milestoneId,
          { name: currentMilestone.name, description: currentMilestone.description, status: currentMilestone.status, target_date: currentMilestone.target_date },
          null,
          { source: 'ai_assistant' }
        );
      }

      return "Milestone deleted successfully";
    },
  });

  // AI action to list milestones by status
  useCopilotAction({
    name: "listMilestonesByStatus",
    description: "Get all milestones filtered by a specific status",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "The status to filter by (planning, active, completed, cancelled)",
        required: true,
      },
    ],
    handler: async ({ status }) => {
      const filtered = milestones.filter(m => m.status === status);
      return `Found ${filtered.length} milestone(s) with status "${status}": ${filtered.map(m => m.name).join(", ")}`;
    },
  });

  const handleCreateMilestone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    const { data, error } = await supabase
      .from("milestones")
      .insert({
        name: newMilestone.name,
        description: newMilestone.description || null,
        target_date: newMilestone.target_date || null,
        status: newMilestone.status,
        org_id: currentOrg.id,
        tenant_id: null, // Using organizations, not tenants
        created_by: user.id,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating milestone:", error);
      return;
    }

    if (data) {
      setMilestones([data, ...milestones]);
      setNewMilestone({ name: "", description: "", target_date: "", status: "planning" });
      setIsCreating(false);
    }
  };

  const handleUpdateMilestone = async () => {
    if (!editingMilestone) return;

    const { data, error } = await supabase
      .from("milestones")
      .update({
        name: editingMilestone.name,
        description: editingMilestone.description,
        target_date: editingMilestone.target_date,
        status: editingMilestone.status,
      } as never)
      .eq("id", editingMilestone.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating milestone:", error);
      return;
    }

    if (data) {
      setMilestones(milestones.map(m => m.id === editingMilestone.id ? data : m));
      setEditingMilestone(null);
    }
  };

  const handleDeleteMilestone = async () => {
    if (!deletingMilestone) return;

    const { error } = await supabase
      .from("milestones")
      .delete()
      .eq("id", deletingMilestone.id);

    if (error) {
      console.error("Error deleting milestone:", error);
      return;
    }

    setMilestones(milestones.filter(m => m.id !== deletingMilestone.id));
    setDeletingMilestone(null);
  };

  const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No target date";
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

  return (
    <div className="container-xl space-y-5 pb-20 animate-fade-in">
      {/* Page Header */}
      <header className="flex flex-row items-center justify-between pb-3 border-b border-gray-200 gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Milestones</h1>
          <p className="text-sm text-muted-foreground">Track key project deliverables and deadlines</p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button
            onClick={() => setIsCreating(true)}
            size="icon"
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-[18px] w-[18px] sm:h-9 sm:w-9 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
            aria-label="Add new milestone"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </PermissionGuard>
      </header>

      {/* Create Milestone Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
            <DialogDescription>Add a new milestone to track project deliverables</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter milestone name"
                value={newMilestone.name}
                onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Describe what this milestone represents"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-date">Target Date</Label>
              <Input
                id="target-date"
                type="date"
                value={newMilestone.target_date}
                onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
                className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={newMilestone.status}
                onChange={(e) => setNewMilestone({ ...newMilestone, status: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateMilestone} disabled={!newMilestone.name.trim()}>
              Create Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card className="p-16 flex flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-muted-foreground">Loading milestones...</p>
          </Card>
        ) : milestones.length === 0 ? (
          <Card className="p-16 flex flex-col items-center justify-center text-center">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No milestones yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Create a milestone using the button above or ask the AI assistant to help you get started
            </p>
          </Card>
        ) : (
          milestones.map((milestone) => (
            <Card key={milestone.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground tracking-tight mb-1">
                    {milestone.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Target: {formatDate(milestone.target_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(milestone.status)}>
                    {STATUS_OPTIONS.find(s => s.value === milestone.status)?.label || milestone.status}
                  </Badge>
                  <PermissionGuard require="edit">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingMilestone(milestone)}
                      aria-label="Edit milestone"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard require="delete">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive/80"
                      onClick={() => setDeletingMilestone(milestone)}
                      aria-label="Delete milestone"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
              {milestone.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {milestone.description}
                </p>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Edit Milestone Dialog */}
      <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && setEditingMilestone(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>Make changes to your milestone</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editingMilestone?.name || ""}
                onChange={(e) => setEditingMilestone(editingMilestone ? { ...editingMilestone, name: e.target.value } : null)}
                className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                value={editingMilestone?.description || ""}
                onChange={(e) => setEditingMilestone(editingMilestone ? { ...editingMilestone, description: e.target.value } : null)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target-date">Target Date</Label>
              <Input
                id="edit-target-date"
                type="date"
                value={editingMilestone?.target_date?.split('T')[0] || ""}
                onChange={(e) => setEditingMilestone(editingMilestone ? { ...editingMilestone, target_date: e.target.value } : null)}
                className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                value={editingMilestone?.status || "planning"}
                onChange={(e) => setEditingMilestone(editingMilestone ? { ...editingMilestone, status: e.target.value } : null)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingMilestone(null)}>Cancel</Button>
            <Button onClick={handleUpdateMilestone}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingMilestone} onOpenChange={(open) => !open && setDeletingMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Milestone</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingMilestone?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMilestone(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMilestone}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
