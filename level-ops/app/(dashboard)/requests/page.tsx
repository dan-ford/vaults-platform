"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { createNotification } from "@/lib/utils/notifications";
import { MessageSquare, Plus, User, Clock, CheckCircle, XCircle, AlertCircle, Send, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Request {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  requested_by: string;
  assigned_to: string | null;
  due_date: string | null;
  response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  org_id: string;
  created_at: string;
  updated_at: string;
}

interface OrgMember {
  user_id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

type RequestFilter = "all" | "open" | "in_progress" | "answered" | "closed";
type Priority = "low" | "medium" | "high" | "urgent";

const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  answered: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-slate-100 text-slate-800 border-slate-200",
};

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [respondingRequest, setRespondingRequest] = useState<Request | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [response, setResponse] = useState("");

  const { currentOrg } = useOrganization();
  const { role, canEdit, canDelete } = usePermissions();
  const supabase = createClient();

  // Load org members for assignment
  const loadMembers = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("org_memberships")
      .select("user_id, profiles(first_name, last_name, email)")
      .eq("org_id", currentOrg.id);

    if (error) {
      console.error("Error loading members:", error);
    } else if (data) {
      setMembers(data as any);
    }
  };

  // Load requests
  const loadRequests = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
    } else if (data) {
      setRequests(data);
    }
  };

  // Load on mount and visibility change
  useEffect(() => {
    loadRequests();
    loadMembers();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadRequests();
        loadMembers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentOrg?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id]);

  // Open create dialog
  const handleCreateNew = () => {
    setEditingRequest(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("");
    setDueDate("");
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (request: Request) => {
    setEditingRequest(request);
    setTitle(request.title);
    setDescription(request.description);
    setPriority(request.priority as Priority);
    setAssignedTo(request.assigned_to || "");
    setDueDate(request.due_date ? request.due_date.split("T")[0] : "");
    setIsCreateDialogOpen(true);
  };

  // Open response dialog
  const handleRespond = (request: Request) => {
    setRespondingRequest(request);
    setResponse(request.response || "");
    setIsResponseDialogOpen(true);
  };

  // Save request (create or update)
  const handleSave = async () => {
    if (!currentOrg || !title.trim() || !description.trim()) return;

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const requestData: any = {
        title,
        description,
        priority,
        assigned_to: assignedTo || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        org_id: currentOrg.id,
      };

      if (editingRequest) {
        // Update existing request
        const oldAssignedTo = editingRequest.assigned_to;
        const { error } = await supabase
          .from("requests")
          .update(requestData)
          .eq("id", editingRequest.id);

        if (error) throw error;

        // Notify if assignment changed
        if (assignedTo && assignedTo !== oldAssignedTo) {
          await createNotification({
            userId: assignedTo,
            type: "request_assigned",
            title: "Request Assigned to You",
            message: `You have been assigned to: "${title}"`,
            actionUrl: `/requests`,
            metadata: { request_id: editingRequest.id },
          });
        }
      } else {
        // Create new request
        requestData.requested_by = user.id;
        requestData.status = "open";

        const { data: newRequest, error } = await supabase
          .from("requests")
          .insert([requestData])
          .select()
          .single();

        if (error) throw error;

        // Notify assigned person
        if (assignedTo) {
          await createNotification({
            userId: assignedTo,
            type: "request_created",
            title: "New Request Assigned",
            message: `New request assigned to you: "${title}"`,
            actionUrl: `/requests`,
            metadata: { request_id: newRequest.id },
          });
        }
      }

      setIsCreateDialogOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error("Error saving request:", error);
      alert("Failed to save request. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit response
  const handleSubmitResponse = async () => {
    if (!respondingRequest || !response.trim()) return;

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("requests")
        .update({
          response: response,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
          status: "answered",
        })
        .eq("id", respondingRequest.id);

      if (error) throw error;

      // Notify requester
      await createNotification({
        userId: respondingRequest.requested_by,
        type: "request_answered",
        title: "Request Answered",
        message: `Your request "${respondingRequest.title}" has been answered`,
        actionUrl: `/requests`,
        metadata: { request_id: respondingRequest.id },
      });

      setIsResponseDialogOpen(false);
      setRespondingRequest(null);
      setResponse("");
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Failed to submit response. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Change status
  const handleStatusChange = async (request: Request, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: newStatus })
        .eq("id", request.id);

      if (error) throw error;

      // Notify requester on close
      if (newStatus === "closed") {
        await createNotification({
          userId: request.requested_by,
          type: "request_closed",
          title: "Request Closed",
          message: `Your request "${request.title}" has been closed`,
          actionUrl: `/requests`,
          metadata: { request_id: request.id },
        });
      }
    } catch (error) {
      console.error("Error changing status:", error);
      alert("Failed to change status");
    }
  };

  // Delete request
  const handleDelete = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;

    const { error } = await supabase.from("requests").delete().eq("id", requestId);

    if (error) {
      console.error("Error deleting request:", error);
      alert("Failed to delete request");
    }
  };

  // Get member name
  const getMemberName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const member = members.find((m) => m.user_id === userId);
    if (!member) return "Unknown";
    const { first_name, last_name, email } = member.profiles;
    if (first_name || last_name) {
      return `${first_name || ""} ${last_name || ""}`.trim();
    }
    return email;
  };

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    if (filter === "all") return true;
    return request.status === filter.replace("_", "-");
  });

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Please select an organization to view requests
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage investor and stakeholder information requests
          </p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button onClick={handleCreateNew} size="icon" className="h-9 w-9" aria-label="Create request">
            <Plus className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("open")}
        >
          Open
        </Button>
        <Button
          variant={filter === "in_progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("in_progress")}
        >
          In Progress
        </Button>
        <Button
          variant={filter === "answered" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("answered")}
        >
          Answered
        </Button>
        <Button
          variant={filter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("closed")}
        >
          Closed
        </Button>
      </div>

      {/* Request Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRequests.map((request) => {
          const {
            data: { user: currentUser },
          } = supabase.auth.getUser();
          const canRespond = request.assigned_to === currentUser?.then((u) => u?.id);
          const isOwner = request.requested_by === currentUser?.then((u) => u?.id);

          return (
            <div
              key={request.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{request.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {request.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status and Priority */}
              <div className="flex gap-2 mb-3">
                <Badge
                  variant="outline"
                  className={STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}
                >
                  {request.status.replace("_", " ")}
                </Badge>
                <Badge
                  variant="outline"
                  className={PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]}
                >
                  {request.priority}
                </Badge>
              </div>

              {/* Request Info */}
              <div className="space-y-2 mb-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Assigned: {getMemberName(request.assigned_to)}</span>
                </div>
                {request.due_date && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Due: {new Date(request.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                {request.responded_at && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Answered {new Date(request.responded_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Response preview */}
              {request.response && (
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">Response:</p>
                  <p className="text-muted-foreground line-clamp-3">{request.response}</p>
                </div>
              )}

              <div className="flex gap-2">
                {!request.response && request.assigned_to && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleRespond(request)}
                    className="flex-1"
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Respond
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Edit (if not answered) */}
                    {!request.response && canEdit && (
                      <DropdownMenuItem onClick={() => handleEdit(request)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}

                    {/* Change status */}
                    {request.status !== "in_progress" && !request.response && (
                      <DropdownMenuItem onClick={() => handleStatusChange(request, "in_progress")}>
                        <AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
                        Mark In Progress
                      </DropdownMenuItem>
                    )}

                    {request.status !== "closed" && request.response && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(request, "closed")}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Close Request
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Delete */}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(request.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No requests{filter !== "all" ? ` in ${filter}` : ""}
          </h3>
          <p className="text-muted-foreground mb-4">
            {filter === "all"
              ? "Create your first request to get started"
              : `No requests with ${filter} status`}
          </p>
          {filter === "all" && (
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Request
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingRequest ? "Edit" : "Create"} Request</DialogTitle>
            <DialogDescription>
              {editingRequest ? "Update" : "Create a new"} information request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What information do you need?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about what you're requesting..."
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v: Priority) => setPriority(v)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned-to">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="assigned-to">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {getMemberName(member.user_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || !description.trim()}
            >
              {isSaving ? "Saving..." : editingRequest ? "Update Request" : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Respond to Request</DialogTitle>
            <DialogDescription>
              {respondingRequest?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {respondingRequest && (
              <div className="p-3 bg-muted rounded-lg text-sm mb-4">
                <p className="font-medium mb-2">Request:</p>
                <p className="text-muted-foreground">{respondingRequest.description}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="response">Your Response *</Label>
              <Textarea
                id="response"
                rows={6}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Provide your response to this request..."
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsResponseDialogOpen(false);
                setRespondingRequest(null);
                setResponse("");
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={isSaving || !response.trim()}
            >
              {isSaving ? "Submitting..." : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
