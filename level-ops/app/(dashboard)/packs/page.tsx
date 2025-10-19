"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { generateContentHash } from "@/lib/utils/content-hash";
import { Package, Plus, Download, Trash2, Calendar, Shield, Lock, CheckCircle, Users, FileText, Edit } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface BoardPack {
  id: string;
  title: string;
  meeting_date: string;
  agenda: AgendaItem[];
  attendees: Attendee[];
  approved_by: string | null;
  published_at: string | null;
  hash: string | null;
  pdf_url: string | null;
  created_at: string;
  created_by: string;
  metadata: any;
}

interface AgendaItem {
  id: string;
  title: string;
  duration: number; // minutes
  presenter: string;
  description?: string;
}

interface Attendee {
  id: string;
  name: string;
  role: string;
  email?: string;
}

type PackFilter = "all" | "draft" | "approved" | "published";

export default function PacksPage() {
  const [packs, setPacks] = useState<BoardPack[]>([]);
  const [filter, setFilter] = useState<PackFilter>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<BoardPack | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaDuration, setNewAgendaDuration] = useState("30");
  const [newAgendaPresenter, setNewAgendaPresenter] = useState("");
  const [newAttendeeName, setNewAttendeeName] = useState("");
  const [newAttendeeRole, setNewAttendeeRole] = useState("");

  const { currentOrg } = useOrganization();
  const { role, canEdit, canDelete, isOwner, isAdmin } = usePermissions();
  const supabase = createClient();

  const canApprove = isOwner || isAdmin;

  // Load packs
  const loadPacks = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("board_packs")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("meeting_date", { ascending: false });

    if (error) {
      console.error("Error loading board packs:", error);
    } else if (data) {
      setPacks(data);
    }
  };

  // Load on mount and visibility change
  useEffect(() => {
    loadPacks();

    const handleVisibilityChange = () => {
      if (!document.hidden) loadPacks();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentOrg?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel("board-packs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_packs",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => {
          loadPacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id]);

  // Open dialog for new pack
  const handleCreateNew = () => {
    setEditingPack(null);
    setTitle("");
    setMeetingDate("");
    setAgendaItems([]);
    setAttendees([]);
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (pack: BoardPack) => {
    setEditingPack(pack);
    setTitle(pack.title);
    setMeetingDate(pack.meeting_date.split("T")[0]);
    setAgendaItems(pack.agenda || []);
    setAttendees(pack.attendees || []);
    setIsDialogOpen(true);
  };

  // Add agenda item
  const handleAddAgendaItem = () => {
    if (!newAgendaTitle.trim() || !newAgendaPresenter.trim()) return;

    const newItem: AgendaItem = {
      id: crypto.randomUUID(),
      title: newAgendaTitle,
      duration: parseInt(newAgendaDuration) || 30,
      presenter: newAgendaPresenter,
    };

    setAgendaItems([...agendaItems, newItem]);
    setNewAgendaTitle("");
    setNewAgendaDuration("30");
    setNewAgendaPresenter("");
  };

  // Remove agenda item
  const handleRemoveAgendaItem = (id: string) => {
    setAgendaItems(agendaItems.filter((item) => item.id !== id));
  };

  // Add attendee
  const handleAddAttendee = () => {
    if (!newAttendeeName.trim() || !newAttendeeRole.trim()) return;

    const newAttendee: Attendee = {
      id: crypto.randomUUID(),
      name: newAttendeeName,
      role: newAttendeeRole,
    };

    setAttendees([...attendees, newAttendee]);
    setNewAttendeeName("");
    setNewAttendeeRole("");
  };

  // Remove attendee
  const handleRemoveAttendee = (id: string) => {
    setAttendees(attendees.filter((att) => att.id !== id));
  };

  // Save pack
  const handleSave = async () => {
    if (!currentOrg || !title.trim() || !meetingDate) return;

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const packData = {
        title,
        meeting_date: new Date(meetingDate).toISOString(),
        agenda: agendaItems,
        attendees: attendees,
        org_id: currentOrg.id,
        created_by: user.id,
      };

      if (editingPack) {
        // Update existing
        const { error } = await supabase
          .from("board_packs")
          .update(packData)
          .eq("id", editingPack.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("board_packs").insert([packData]);

        if (error) throw error;
      }

      setIsDialogOpen(false);
      setEditingPack(null);
    } catch (error) {
      console.error("Error saving board pack:", error);
      alert("Failed to save board pack. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Approve pack
  const handleApprove = async (pack: BoardPack) => {
    if (!canApprove) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("board_packs")
        .update({ approved_by: user.id })
        .eq("id", pack.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error approving pack:", error);
      alert("Failed to approve pack");
    }
  };

  // Publish pack (immutable)
  const handlePublish = async (pack: BoardPack) => {
    if (!canApprove || !pack.approved_by) return;

    try {
      // Generate content for hashing
      const content = JSON.stringify({
        title: pack.title,
        meeting_date: pack.meeting_date,
        agenda: pack.agenda,
        attendees: pack.attendees,
      });

      const hash = await generateContentHash(content);

      const { error } = await supabase
        .from("board_packs")
        .update({
          published_at: new Date().toISOString(),
          hash: hash,
        })
        .eq("id", pack.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error publishing pack:", error);
      alert("Failed to publish pack");
    }
  };

  // Download as markdown
  const handleDownloadMarkdown = (pack: BoardPack) => {
    let markdown = `# ${pack.title}\n\n`;
    markdown += `**Meeting Date:** ${new Date(pack.meeting_date).toLocaleDateString()}\n\n`;

    if (pack.attendees && pack.attendees.length > 0) {
      markdown += `## Attendees\n\n`;
      pack.attendees.forEach((att) => {
        markdown += `- ${att.name} (${att.role})\n`;
      });
      markdown += `\n`;
    }

    if (pack.agenda && pack.agenda.length > 0) {
      markdown += `## Agenda\n\n`;
      pack.agenda.forEach((item, index) => {
        markdown += `### ${index + 1}. ${item.title}\n`;
        markdown += `**Duration:** ${item.duration} minutes | **Presenter:** ${item.presenter}\n\n`;
        if (item.description) {
          markdown += `${item.description}\n\n`;
        }
      });
    }

    if (pack.published_at && pack.hash) {
      markdown += `---\n\n`;
      markdown += `**Published:** ${new Date(pack.published_at).toLocaleString()}\n`;
      markdown += `**Content Hash (SHA-256):** ${pack.hash}\n`;
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pack.title.replace(/\s+/g, "_")}_${new Date(pack.meeting_date).toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete pack
  const handleDelete = async (packId: string) => {
    if (!confirm("Are you sure you want to delete this board pack?")) return;

    const { error } = await supabase.from("board_packs").delete().eq("id", packId);

    if (error) {
      console.error("Error deleting pack:", error);
      alert("Failed to delete pack");
    }
  };

  // Filter packs
  const filteredPacks = packs.filter((pack) => {
    if (filter === "all") return true;
    if (filter === "published") return pack.published_at !== null;
    if (filter === "approved") return pack.approved_by !== null && !pack.published_at;
    if (filter === "draft") return !pack.approved_by;
    return true;
  });

  const getStatusBadge = (pack: BoardPack) => {
    if (pack.published_at) {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          Published
        </Badge>
      );
    }
    if (pack.approved_by) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200">
        Draft
      </Badge>
    );
  };

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Please select an organization to view board packs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Board Packs</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage immutable board meeting packages
          </p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button onClick={handleCreateNew} size="icon" className="h-9 w-9" aria-label="Create board pack">
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
          variant={filter === "draft" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("draft")}
        >
          Drafts
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={filter === "published" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("published")}
        >
          <Lock className="h-3 w-3 mr-1" />
          Published
        </Button>
      </div>

      {/* Board Pack Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPacks.map((pack) => (
          <div
            key={pack.id}
            className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
              pack.published_at ? "border-primary/50 bg-primary/5" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                <Package className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{pack.title}</h3>
                    {pack.published_at && (
                      <Shield className="h-4 w-4 text-primary flex-shrink-0" aria-label="Published (Immutable)" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(pack.meeting_date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-3">{getStatusBadge(pack)}</div>

            {/* Pack Info */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-muted-foreground">Agenda Items</p>
                <p className="font-semibold">{pack.agenda?.length || 0}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-muted-foreground">Attendees</p>
                <p className="font-semibold">{pack.attendees?.length || 0}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadMarkdown(pack)}
                className="flex-1"
              >
                <Download className="mr-1 h-3 w-3" />
                Download
              </Button>

              {!pack.published_at && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Edit (if not approved) */}
                    {!pack.approved_by && canEdit && (
                      <DropdownMenuItem onClick={() => handleEdit(pack)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}

                    {/* Approve (admin/owner only, not approved yet) */}
                    {!pack.approved_by && canApprove && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleApprove(pack)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Approve
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Publish (admin/owner only, approved) */}
                    {pack.approved_by && !pack.published_at && canApprove && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handlePublish(pack)}>
                          <Lock className="mr-2 h-4 w-4 text-primary" />
                          Publish (Immutable)
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Delete (if not published) */}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(pack.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Published indicator with hash */}
            {pack.published_at && pack.hash && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span className="font-mono truncate" title={pack.hash}>
                    {pack.hash.substring(0, 16)}...
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredPacks.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No board packs{filter !== "all" ? ` in ${filter}` : ""}
          </h3>
          <p className="text-muted-foreground mb-4">
            {filter === "all"
              ? "Create your first board pack to get started"
              : `No board packs with ${filter} status`}
          </p>
          {filter === "all" && (
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Board Pack
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPack ? "Edit" : "Create"} Board Pack</DialogTitle>
            <DialogDescription>
              Prepare an immutable package for your board meeting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto flex-1 px-1">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Q4 2025 Board Meeting"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting-date">Meeting Date *</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
            </div>

            {/* Agenda Items */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Agenda Items
              </h3>

              {agendaItems.length > 0 && (
                <div className="space-y-2">
                  {agendaItems.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{index + 1}. {item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.duration} min • {item.presenter}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAgendaItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="agenda-title">Item Title</Label>
                    <Input
                      id="agenda-title"
                      value={newAgendaTitle}
                      onChange={(e) => setNewAgendaTitle(e.target.value)}
                      placeholder="e.g., Financial Review"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agenda-duration">Duration (min)</Label>
                    <Input
                      id="agenda-duration"
                      type="number"
                      value={newAgendaDuration}
                      onChange={(e) => setNewAgendaDuration(e.target.value)}
                      min="5"
                      step="5"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-presenter">Presenter</Label>
                  <Input
                    id="agenda-presenter"
                    value={newAgendaPresenter}
                    onChange={(e) => setNewAgendaPresenter(e.target.value)}
                    placeholder="e.g., CFO"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAgendaItem}
                  disabled={!newAgendaTitle.trim() || !newAgendaPresenter.trim()}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Attendees */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Attendees
              </h3>

              {attendees.length > 0 && (
                <div className="space-y-2">
                  {attendees.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{att.name}</div>
                        <div className="text-sm text-muted-foreground">{att.role}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAttendee(att.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="attendee-name">Name</Label>
                    <Input
                      id="attendee-name"
                      value={newAttendeeName}
                      onChange={(e) => setNewAttendeeName(e.target.value)}
                      placeholder="e.g., Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendee-role">Role</Label>
                    <Input
                      id="attendee-role"
                      value={newAttendeeRole}
                      onChange={(e) => setNewAttendeeRole(e.target.value)}
                      placeholder="e.g., Board Member"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAttendee}
                  disabled={!newAttendeeName.trim() || !newAttendeeRole.trim()}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Attendee
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || !meetingDate}
            >
              {isSaving ? "Saving..." : editingPack ? "Update Pack" : "Create Pack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
