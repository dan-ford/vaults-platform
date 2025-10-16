"use client";

import { useState, useEffect } from "react";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users, Pencil, Trash2, Mail, Phone, Building2, LayoutGrid, LayoutList, SlidersHorizontal, X, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";
import { getSupabaseErrorMessage, logError } from "@/lib/utils/error-handling";
import { ErrorState, LoadingState } from "@/components/error-states";
import { MultiSelectTags, type TagOption } from "@/components/ui/multi-select-tags";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactAvatar } from "@/components/contact-avatar";
import { AvatarUpload } from "@/components/avatar-upload";
import { cn } from "@/lib/utils";

type Contact = {
  id: string;
  tenant_id: string | null;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  type: string | null;
  roles: string[];
  status: string;
  notes: string | null;
  avatar_url: string | null;
  metadata: any;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Role tags for contacts (supports multiple per contact)
const ROLE_OPTIONS: TagOption[] = [
  { value: "founder", label: "Founder", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "co-founder", label: "Co-Founder", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "ceo", label: "CEO", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "cto", label: "CTO", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "cfo", label: "CFO", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "director", label: "Director", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "investor", label: "Investor", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "advisor", label: "Advisor", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "consultant", label: "Consultant", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "team-member", label: "Team Member", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "client", label: "Client", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "vendor", label: "Vendor", color: "bg-slate-200 text-slate-900 border-slate-300" },
  { value: "partner", label: "Partner", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "stakeholder", label: "Stakeholder", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "inactive", label: "Inactive", color: "bg-gray-100 text-gray-800 border-gray-200" },
];

type ViewMode = "list" | "grid";
type SortField = "name" | "company" | "recent";
type SortDirection = "asc" | "desc";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    roles: [] as string[],
    status: "active",
    notes: "",
    avatar_url: null as string | null,
  });
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>(["active"]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { logAgentAction } = useAuditLog();
  const { canEdit, canDelete, role } = usePermissions();

  // Load contacts function
  const loadContacts = async () => {
    try {
      setLoadError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("last_name", { ascending: true });

      if (error) {
        const errorMessage = getSupabaseErrorMessage(error);
        setLoadError(errorMessage);
        logError(error, {
          action: "load_contacts",
          resource: "contacts",
          orgId: currentOrg.id,
        });
      } else if (data) {
        // Ensure roles is an array (handle legacy data)
        const normalizedData = data.map(contact => ({
          ...contact,
          roles: Array.isArray(contact.roles) ? contact.roles : []
        }));
        setContacts(normalizedData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load contacts";
      setLoadError(errorMessage);
      logError(err, {
        action: "load_contacts",
        resource: "contacts",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and page visibility
  useEffect(() => {
    loadContacts();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadContacts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          console.log('[Contacts Realtime]', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const newContact = { ...payload.new, roles: Array.isArray(payload.new.roles) ? payload.new.roles : [] } as Contact;
            setContacts(current => {
              const filtered = current.filter(c => c.id !== newContact.id);
              return [...filtered, newContact].sort((a, b) => a.last_name.localeCompare(b.last_name));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedContact = { ...payload.new, roles: Array.isArray(payload.new.roles) ? payload.new.roles : [] } as Contact;
            setContacts(current => current.map(c => c.id === updatedContact.id ? updatedContact : c).sort((a, b) => a.last_name.localeCompare(b.last_name)));
          } else if (payload.eventType === 'DELETE') {
            console.log('[Contacts Realtime] DELETE payload:', payload);
            console.log('[Contacts Realtime] payload.old:', payload.old);
            const deletedId = payload.old?.id || (payload.old as any)?.id;
            console.log('[Contacts Realtime] Deleting contact with ID:', deletedId);
            if (deletedId) {
              setContacts(current => {
                const filtered = current.filter(c => c.id !== deletedId);
                console.log('[Contacts Realtime] Filtered from', current.length, 'to', filtered.length, 'contacts');
                return filtered;
              });
            } else {
              console.error('[Contacts Realtime] No ID found in DELETE payload');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Filter and sort contacts
  useEffect(() => {
    let result = [...contacts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.title?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (filterRoles.length > 0) {
      result = result.filter(c =>
        c.roles.some(role => filterRoles.includes(role))
      );
    }

    // Status filter
    if (filterStatus.length > 0) {
      result = result.filter(c => filterStatus.includes(c.status));
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          break;
        case "company":
          comparison = (a.company || "").localeCompare(b.company || "");
          break;
        case "recent":
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredContacts(result);
  }, [contacts, searchQuery, filterRoles, filterStatus, sortField, sortDirection]);

  // Make contacts readable to the AI
  useCopilotReadable({
    description: "The current list of project contacts and stakeholders with their roles",
    value: contacts.map(c => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
      phone: c.phone,
      company: c.company,
      title: c.title,
      roles: c.roles,
      status: c.status,
    })),
  });

  // AI action to create a contact
  useCopilotAction({
    name: "createContact",
    description: "Create a new contact record. Use 'roles' parameter to assign multiple role tags like Founder, Investor, Director, Advisor, etc. Requires EDITOR, ADMIN, or OWNER role.",
    parameters: [
      {
        name: "first_name",
        type: "string",
        description: "Contact's first name",
        required: true,
      },
      {
        name: "last_name",
        type: "string",
        description: "Contact's last name",
        required: true,
      },
      {
        name: "email",
        type: "string",
        description: "Contact's email address",
        required: false,
      },
      {
        name: "phone",
        type: "string",
        description: "Contact's phone number",
        required: false,
      },
      {
        name: "company",
        type: "string",
        description: "Company name",
        required: false,
      },
      {
        name: "title",
        type: "string",
        description: "Job title",
        required: false,
      },
      {
        name: "roles",
        type: "string[]",
        description: "Array of role tags (e.g., ['Founder', 'CEO'] or ['Investor', 'Director']). Available: Founder, Co-Founder, CEO, CTO, CFO, Director, Investor, Advisor, Consultant, Team Member, Client, Vendor, Partner, Stakeholder",
        required: false,
      },
      {
        name: "notes",
        type: "string",
        description: "Additional notes about the contact",
        required: false,
      },
    ],
    handler: async ({ first_name, last_name, email, phone, company, title, roles, notes }) => {
      try {
        if (!canEdit) {
          const errorMsg = getCreatePermissionError("contacts", role);
          console.error("[AI Action] Permission denied:", errorMsg);
          throw new Error(errorMsg);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !currentOrg) {
          console.error("[AI Action] Not authenticated");
          throw new Error("Not authenticated");
        }

        // Normalize roles to lowercase for consistency
        const normalizedRoles = Array.isArray(roles) ? roles.map(r => r.toLowerCase().replace(/\s+/g, '-')) : [];

        console.log("[AI Action] Creating contact:", { first_name, last_name, email, company, title, roles: normalizedRoles, org_id: currentOrg.id });

        const { data: insertedData, error } = await supabase.from("contacts").insert({
          first_name,
          last_name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          title: title || null,
          roles: normalizedRoles,
          type: null, // Legacy field, using roles instead
          status: "active",
          notes: notes || null,
          org_id: currentOrg.id,
          tenant_id: null,
          created_by: user.id,
        } as any)
        .select()
        .single();

        if (error) {
          console.error("[AI Action] Database error:", error);
          throw new Error(`Failed to create contact: ${error.message}`);
        }

        console.log("[AI Action] Contact created successfully:", insertedData.id);

        await logAgentAction(
          'create',
          'contact',
          insertedData.id,
          null,
          { first_name, last_name, email, company, roles: normalizedRoles },
          { source: 'ai_assistant' }
        );

        return `Contact created successfully: ${first_name} ${last_name}`;
      } catch (error) {
        console.error("[AI Action] Error creating contact:", error);
        throw error;
      }
    },
  });

  // AI action to update a contact
  useCopilotAction({
    name: "updateContact",
    description: "Update an existing contact's information including roles",
    parameters: [
      {
        name: "contactId",
        type: "string",
        description: "The ID of the contact to update",
        required: true,
      },
      {
        name: "first_name",
        type: "string",
        description: "Contact's first name",
        required: false,
      },
      {
        name: "last_name",
        type: "string",
        description: "Contact's last name",
        required: false,
      },
      {
        name: "email",
        type: "string",
        description: "Contact's email address",
        required: false,
      },
      {
        name: "phone",
        type: "string",
        description: "Contact's phone number",
        required: false,
      },
      {
        name: "company",
        type: "string",
        description: "Company name",
        required: false,
      },
      {
        name: "title",
        type: "string",
        description: "Job title",
        required: false,
      },
      {
        name: "roles",
        type: "string[]",
        description: "Array of role tags to replace existing roles",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "Contact status (active or inactive)",
        required: false,
      },
      {
        name: "notes",
        type: "string",
        description: "Additional notes",
        required: false,
      },
    ],
    handler: async ({ contactId, first_name, last_name, email, phone, company, title, roles, status, notes }) => {
      if (!canEdit) {
        return getEditPermissionError("contacts", role);
      }

      const contact = contacts.find(c => c.id === contactId);
      if (!contact) {
        throw new Error("Contact not found");
      }

      const updates: any = {};
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (email !== undefined) updates.email = email || null;
      if (phone !== undefined) updates.phone = phone || null;
      if (company !== undefined) updates.company = company || null;
      if (title !== undefined) updates.title = title || null;
      if (roles !== undefined) updates.roles = roles.map((r: string) => r.toLowerCase().replace(/\s+/g, '-'));
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes || null;

      const { error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", contactId);

      if (error) throw error;

      const currentContact = contacts.find(c => c.id === contactId);
      if (currentContact) {
        const beforeState = {
          first_name: currentContact.first_name,
          last_name: currentContact.last_name,
          email: currentContact.email,
          company: currentContact.company,
          roles: currentContact.roles,
          status: currentContact.status
        };

        await logAgentAction(
          'update',
          'contact',
          contactId,
          beforeState,
          { ...updates },
          { source: 'ai_assistant' }
        );
      }

      return `Contact updated successfully`;
    },
  });

  // AI action to delete a contact
  useCopilotAction({
    name: "deleteContact",
    description: "Delete a contact from the system",
    parameters: [
      {
        name: "contactId",
        type: "string",
        description: "The ID of the contact to delete",
        required: true,
      },
    ],
    handler: async ({ contactId }) => {
      if (!canDelete) {
        return getDeletePermissionError("contacts", role);
      }

      const currentContact = contacts.find(c => c.id === contactId);

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      if (currentContact) {
        await logAgentAction(
          'delete',
          'contact',
          contactId,
          { first_name: currentContact.first_name, last_name: currentContact.last_name, email: currentContact.email, company: currentContact.company, roles: currentContact.roles, status: currentContact.status },
          null,
          { source: 'ai_assistant' }
        );
      }

      return `Contact deleted successfully`;
    },
  });

  // Create contact handler
  const handleCreateContact = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    const { error } = await supabase.from("contacts").insert({
      ...newContact,
      email: newContact.email || null,
      phone: newContact.phone || null,
      company: newContact.company || null,
      title: newContact.title || null,
      notes: newContact.notes || null,
      type: null, // Legacy field
      org_id: currentOrg.id,
      tenant_id: null,
      created_by: user.id,
    } as never);

    if (error) {
      console.error("Error creating contact:", error);
      return;
    }

    setIsCreating(false);
    setNewContact({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      title: "",
      roles: [],
      status: "active",
      notes: "",
    });
  };

  // Update contact handler
  const handleUpdateContact = async () => {
    if (!editingContact) return;

    const { error } = await supabase
      .from("contacts")
      .update({
        first_name: editingContact.first_name,
        last_name: editingContact.last_name,
        email: editingContact.email || null,
        phone: editingContact.phone || null,
        company: editingContact.company || null,
        title: editingContact.title || null,
        roles: editingContact.roles,
        status: editingContact.status,
        notes: editingContact.notes || null,
      } as never)
      .eq("id", editingContact.id);

    if (error) {
      console.error("Error updating contact:", error);
      return;
    }

    setEditingContact(null);
  };

  // Delete contact handler
  const handleDeleteContact = async () => {
    if (!deletingContact) return;

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", deletingContact.id);

    if (error) {
      console.error("Error deleting contact:", error);
      return;
    }

    setDeletingContact(null);
  };

  const getRoleColor = (role: string) => {
    return ROLE_OPTIONS.find(opt => opt.value === role)?.color || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find(opt => opt.value === role)?.label || role;
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || STATUS_OPTIONS[0].color;
  };

  if (isLoading) {
    return <LoadingState message="Loading contacts..." />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Failed to load contacts"
        message={loadError}
        onRetry={loadContacts}
        type="database"
      />
    );
  }

  // Count active filters
  const activeFilterCount = filterRoles.length + (filterStatus.length < STATUS_OPTIONS.length ? 1 : 0);

  return (
    <div className="container-xl space-y-4 pb-20 md:pb-5 animate-fade-in">
      {/* Simplified header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">Contacts</h1>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            {filteredContacts.length} {filteredContacts.length === 1 ? "contact" : "contacts"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard require="create">
            <Button
              onClick={() => setIsCreating(true)}
              size="icon"
              className="h-9 w-9"
              aria-label="Add contact"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        </div>
      </header>

      {/* Clean search and filter bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />

        {/* Single filter/options button */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge variant="default" className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter & Sort</SheetTitle>
              <SheetDescription>
                Customize how contacts are displayed
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* View Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">View</Label>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="flex-1"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="flex-1"
                  >
                    <LayoutList className="h-4 w-4 mr-2" />
                    List
                  </Button>
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sort by</Label>
                <div className="space-y-2">
                  {[
                    { field: "name" as SortField, dir: "asc" as SortDirection, label: "Name (A-Z)" },
                    { field: "name" as SortField, dir: "desc" as SortDirection, label: "Name (Z-A)" },
                    { field: "company" as SortField, dir: "asc" as SortDirection, label: "Company" },
                    { field: "recent" as SortField, dir: "desc" as SortDirection, label: "Recently added" },
                  ].map((option) => (
                    <Button
                      key={`${option.field}-${option.dir}`}
                      variant={sortField === option.field && sortDirection === option.dir ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setSortField(option.field);
                        setSortDirection(option.dir);
                      }}
                      className="w-full justify-start"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Roles</Label>
                  {filterRoles.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterRoles([])}
                      className="h-auto p-1 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {ROLE_OPTIONS.map((role) => (
                    <Button
                      key={role.value}
                      variant={filterRoles.includes(role.value) ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setFilterRoles(
                          filterRoles.includes(role.value)
                            ? filterRoles.filter(r => r !== role.value)
                            : [...filterRoles, role.value]
                        );
                      }}
                      className="w-full justify-start"
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Status</Label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((status) => (
                    <Button
                      key={status.value}
                      variant={filterStatus.includes(status.value) ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setFilterStatus(
                          filterStatus.includes(status.value)
                            ? filterStatus.filter(s => s !== status.value)
                            : [...filterStatus, status.value]
                        );
                      }}
                      className="w-full justify-start"
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reset all */}
              {(activeFilterCount > 0 || sortField !== "name" || viewMode !== "grid") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterRoles([]);
                    setFilterStatus(["active"]);
                    setSortField("name");
                    setSortDirection("asc");
                    setViewMode("grid");
                  }}
                  className="w-full"
                >
                  Reset all
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {contacts.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
          <p className="text-lg font-medium text-muted-foreground mb-2">No contacts yet</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Add contacts to track project stakeholders, team members, and external partners
          </p>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <Card className="p-12 md:p-16 flex flex-col items-center justify-center text-center">
          <Users className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/50 mb-3 md:mb-4" aria-hidden="true" />
          <p className="text-base md:text-lg font-medium text-muted-foreground mb-1.5 md:mb-2">No matches found</p>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md">
            Try adjusting your search or filters
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <Card
              key={contact.id}
              className="group relative p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => setEditingContact(contact)}
            >
              {/* Actions menu - only visible on hover/focus */}
              {(canEdit || canDelete) && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <PermissionGuard require="edit">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingContact(contact);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </PermissionGuard>
                      <PermissionGuard require="delete">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingContact(contact);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Avatar and Name */}
              <div className="flex items-start gap-3 mb-4">
                <ContactAvatar
                  firstName={contact.first_name}
                  lastName={contact.last_name}
                  avatarUrl={contact.avatar_url}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base leading-tight truncate mb-0.5">
                    {contact.first_name} {contact.last_name}
                  </h3>
                  {contact.title && (
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.title}
                    </p>
                  )}
                  {contact.company && (
                    <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                      {contact.company}
                    </p>
                  )}
                </div>
              </div>

              {/* Roles - Show max 2, indicate if more */}
              {contact.roles && contact.roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {contact.roles.slice(0, 2).map((role) => (
                    <Badge key={role} variant="outline" className={cn("text-xs px-2 py-0.5", getRoleColor(role))}>
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                  {contact.roles.length > 2 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted">
                      +{contact.roles.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Contact info */}
              <div className="space-y-2 text-sm">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group/link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate group-hover/link:underline">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group/link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="group-hover/link:underline">{contact.phone}</span>
                  </a>
                )}
              </div>

              {/* Notes preview */}
              {contact.notes && (
                <p className="mt-4 text-xs text-muted-foreground/70 line-clamp-2 pt-3 border-t">
                  {contact.notes}
                </p>
              )}

              {/* Status indicator - subtle bottom badge */}
              <div className="absolute bottom-3 right-3">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  contact.status === "active" ? "bg-green-500" : "bg-gray-300"
                )} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredContacts.map((contact) => {
            const canEdit = true; // Replace with actual permission check
            const canDelete = true; // Replace with actual permission check

            return (
              <Card
                key={contact.id}
                className="group relative p-5 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => setEditingContact(contact)}
              >
                {/* Actions menu - only visible on hover/focus */}
                {(canEdit || canDelete) && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingContact(contact);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canEdit && canDelete && <DropdownMenuSeparator />}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingContact(contact);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <ContactAvatar
                    firstName={contact.first_name}
                    lastName={contact.last_name}
                    avatarUrl={contact.avatar_url}
                    size="lg"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name and title/company */}
                    <h3 className="font-semibold text-foreground text-lg leading-tight truncate mb-1">
                      {contact.first_name} {contact.last_name}
                    </h3>
                    {contact.title && (
                      <p className="text-sm text-muted-foreground truncate">{contact.title}</p>
                    )}
                    {contact.company && (
                      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                        {contact.company}
                      </p>
                    )}

                    {/* Roles - show max 3 in list view */}
                    {contact.roles && contact.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                        {contact.roles.slice(0, 3).map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className={cn("text-xs px-2 py-0.5", getRoleColor(role))}
                          >
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                        {contact.roles.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted">
                            +{contact.roles.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="space-y-1.5 text-sm mt-3">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group/link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate group-hover/link:underline">
                            {contact.email}
                          </span>
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group/link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="group-hover/link:underline">{contact.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Notes preview */}
                    {contact.notes && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status indicator - subtle dot */}
                <div className="absolute bottom-3 right-3">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      contact.status === "active" ? "bg-green-500" : "bg-gray-300"
                    )}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Contact Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
            <DialogDescription>Add a new contact to your project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {/* Avatar Upload */}
            <div className="flex justify-center pb-4 border-b">
              <AvatarUpload
                firstName={newContact.first_name || "New"}
                lastName={newContact.last_name || "Contact"}
                currentAvatarUrl={newContact.avatar_url}
                orgId={currentOrg?.id || ""}
                onAvatarChange={(url) => setNewContact({ ...newContact, avatar_url: url })}
                size="xl"
                editable={true}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={newContact.last_name}
                  onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="CEO"
                  value={newContact.title}
                  onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roles">Roles</Label>
              <MultiSelectTags
                options={ROLE_OPTIONS}
                selected={newContact.roles}
                onChange={(roles) => setNewContact({ ...newContact, roles })}
                placeholder="Select roles..."
                allowCustom={true}
              />
              <p className="text-xs text-muted-foreground">
                Select multiple roles like Founder, Investor, Director, etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Additional notes..."
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateContact}
              disabled={!newContact.first_name || !newContact.last_name}
            >
              Create Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4 overflow-y-auto flex-1 px-1">
              {/* Avatar Upload */}
              <div className="flex justify-center pb-4 border-b">
                <AvatarUpload
                  contactId={editingContact.id}
                  firstName={editingContact.first_name}
                  lastName={editingContact.last_name}
                  currentAvatarUrl={editingContact.avatar_url}
                  orgId={currentOrg?.id || ""}
                  onAvatarChange={(url) => setEditingContact({ ...editingContact, avatar_url: url })}
                  size="xl"
                  editable={true}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name *</Label>
                  <Input
                    id="edit_first_name"
                    value={editingContact.first_name}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name *</Label>
                  <Input
                    id="edit_last_name"
                    value={editingContact.last_name}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, last_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editingContact.email || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={editingContact.phone || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, phone: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_company">Company</Label>
                  <Input
                    id="edit_company"
                    value={editingContact.company || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, company: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_title">Title</Label>
                  <Input
                    id="edit_title"
                    value={editingContact.title || ""}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, title: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_roles">Roles</Label>
                <MultiSelectTags
                  options={ROLE_OPTIONS}
                  selected={editingContact.roles}
                  onChange={(roles) => setEditingContact({ ...editingContact, roles })}
                  placeholder="Select roles..."
                  allowCustom={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <Button
                      key={status.value}
                      type="button"
                      variant={editingContact.status === status.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditingContact({ ...editingContact, status: status.value })}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <textarea
                  id="edit_notes"
                  rows={3}
                  value={editingContact.notes || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, notes: e.target.value })
                  }
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContact}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingContact} onOpenChange={() => setDeletingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingContact && (
            <div className="py-4">
              <p className="font-medium">
                {deletingContact.first_name} {deletingContact.last_name}
              </p>
              {deletingContact.email && (
                <p className="text-sm text-muted-foreground">{deletingContact.email}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingContact(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContact}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
