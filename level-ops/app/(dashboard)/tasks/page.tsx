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
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables, Database } from "@/lib/supabase/database.types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useOrganization } from "@/lib/context/organization-context";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";

type Task = Tables<"tasks">;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { logAgentAction } = useAuditLog();
  const { hasPermission, role, canEdit, canDelete, isViewer } = usePermissions();

  // Load tasks function
  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading tasks:", error);
      } else if (data) {
        setTasks(data);
      }
    } catch (error) {
      console.error("Error in loadTasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load tasks on mount, when org changes, and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;

    loadTasks();

    // Reload when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadTasks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['tasks']['Row']>) => {
          if (payload.eventType === 'INSERT') {
            setTasks(current => [payload.new as Task, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(current => current.map(t => t.id === payload.new.id ? payload.new as Task : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(current => current.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Make tasks readable to the AI
  useCopilotReadable({
    description: "The current list of tasks",
    value: tasks,
  });

  // AI action to create a task
  useCopilotAction({
    name: "createTask",
    description: "Create a new task with a title and optional description",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "The title of the task",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "The description of the task",
        required: false,
      },
    ],
    handler: async ({ title, description }) => {
      // Check permission first
      if (!canEdit) {
        return getCreatePermissionError("tasks", role);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!currentOrg) throw new Error("No organization context");

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title,
          description: description || null,
          org_id: currentOrg.id,
          tenant_id: null, // Using organizations, not tenants
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const task = data as Task;
        setTasks([...tasks, task]);

        // Audit log the agent action
        await logAgentAction(
          'create',
          'task',
          task.id,
          null,
          { title: task.title, description: task.description, status: task.status },
          { source: 'ai_assistant' }
        );
      }

      return "Task created successfully";
    },
  });

  // AI action to update task status
  useCopilotAction({
    name: "updateTaskStatus",
    description: "Update the status of a task",
    parameters: [
      {
        name: "taskId",
        type: "string",
        description: "The ID of the task to update",
        required: true,
      },
      {
        name: "status",
        type: "string",
        description: "The new status (todo, in_progress, blocked, done, archived)",
        required: true,
      },
    ],
    handler: async ({ taskId, status }) => {
      // Check permission first
      if (!canEdit) {
        return getEditPermissionError("tasks", role);
      }

      // Get current task state for audit log
      const currentTask = tasks.find(t => t.id === taskId);

      const { data, error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const task = data as Task;
        setTasks(tasks.map(t => t.id === taskId ? task : t));

        // Audit log the status update
        await logAgentAction(
          'update',
          'task',
          task.id,
          currentTask ? { status: currentTask.status } : null,
          { status: task.status },
          { source: 'ai_assistant', action: 'status_change' }
        );
      }

      return `Task status updated to ${status}`;
    },
  });

  // AI action to delete task
  useCopilotAction({
    name: "deleteTask",
    description: "Delete a task permanently",
    parameters: [
      {
        name: "taskId",
        type: "string",
        description: "The ID of the task to delete",
        required: true,
      },
    ],
    handler: async ({ taskId }) => {
      // Check permission first
      if (!canDelete) {
        return getDeletePermissionError("tasks", role);
      }

      // Get current task state for audit log
      const currentTask = tasks.find(t => t.id === taskId);

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== taskId));

      // Audit log the deletion
      if (currentTask) {
        await logAgentAction(
          'delete',
          'task',
          taskId,
          { title: currentTask.title, description: currentTask.description, status: currentTask.status },
          null,
          { source: 'ai_assistant' }
        );
      }

      return "Task deleted successfully";
    },
  });

  // AI action to list tasks by status
  useCopilotAction({
    name: "listTasksByStatus",
    description: "Get all tasks filtered by a specific status",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "The status to filter by (todo, in_progress, blocked, done, archived)",
        required: true,
      },
    ],
    handler: async ({ status }) => {
      const filtered = tasks.filter(t => t.status === status);
      return `Found ${filtered.length} task(s) with status "${status}": ${filtered.map(t => t.title).join(", ")}`;
    },
  });

  const handleCreateTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: newTask.title,
        description: newTask.description || null,
        org_id: currentOrg.id,
        tenant_id: null, // Using organizations, not tenants
        created_by: user.id,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return;
    }

    if (data) {
      setTasks([...tasks, data]);
      setNewTask({ title: "", description: "" });
      setIsCreating(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    const { data, error } = await supabase
      .from("tasks")
      .update({
        title: editingTask.title,
        description: editingTask.description,
      } as never)
      .eq("id", editingTask.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating task:", error);
      return;
    }

    if (data) {
      setTasks(tasks.map(t => t.id === editingTask.id ? data : t));
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", deletingTask.id);

    if (error) {
      console.error("Error deleting task:", error);
      return;
    }

    setTasks(tasks.filter(t => t.id !== deletingTask.id));
    setDeletingTask(null);
  };

  return (
      <div className="container-xl space-y-5 pb-20 animate-fade-in">
        {/* Page Header */}
        <header className="flex items-start justify-between pb-3 border-b border-gray-200">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage and organize your project tasks</p>
            <RoleBadge />
          </div>
          <PermissionGuard require="create">
            <Button
              onClick={() => setIsCreating(true)}
              size="icon"
              className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 w-9 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Add new task"
              data-testid="add-task-button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        </header>

        {/* Create Task Form */}
        {isCreating && (
          <Card className="p-6 space-y-6 animate-slide-up hover:shadow-md">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Create New Task</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add a new task to your project</p>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-foreground">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
                  data-testid="task-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Input
                  id="description"
                  placeholder="Enter task description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
                  data-testid="task-description-input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleCreateTask}
                  disabled={!newTask.title}
                  className="bg-primary hover:bg-primary/90 text-white shadow-sm"
                  data-testid="create-task-submit"
                >
                  Create Task
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="bg-white hover:bg-secondary/50"
                  data-testid="create-task-cancel"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Task List */}
        <div className="grid gap-4" data-testid="task-list">
          {isLoading ? (
            <Card className="p-16 flex flex-col items-center justify-center text-center">
              <p className="text-lg font-medium text-muted-foreground">Loading tasks...</p>
            </Card>
          ) : tasks.length === 0 ? (
            <Card className="p-16 flex flex-col items-center justify-center text-center">
              <p className="text-lg font-medium text-muted-foreground mb-2">No tasks yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Create a task using the button above or ask the AI assistant to help you get started
              </p>
            </Card>
          ) : (
            tasks.map((task) => {
              const getStatusVariant = (status: string) => {
                switch (status) {
                  case 'done': return 'success';
                  case 'in_progress': return 'default';
                  case 'blocked': return 'warning';
                  case 'archived': return 'secondary';
                  default: return 'neutral';
                }
              };

              return (
                <Card
                  key={task.id}
                  className="p-5"
                  data-testid={`task-${task.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">{task.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(task.status)} data-testid={`task-status-${task.id}`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <PermissionGuard require="edit">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingTask(task)}
                          aria-label="Edit task"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard require="delete">
                        <Button
                          size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        onClick={() => setDeletingTask(task)}
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </PermissionGuard>
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Edit Task Dialog */}
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Make changes to your task here.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingTask?.title || ""}
                  onChange={(e) => setEditingTask(editingTask ? { ...editingTask, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingTask?.description || ""}
                  onChange={(e) => setEditingTask(editingTask ? { ...editingTask, description: e.target.value } : null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
              <Button onClick={handleUpdateTask}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Task</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{deletingTask?.title}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingTask(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteTask}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
