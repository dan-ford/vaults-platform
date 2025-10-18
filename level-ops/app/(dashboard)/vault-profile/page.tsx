"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Target, Activity, Pencil, Calendar, User as UserIcon, TrendingUp, FileText, AlertTriangle, Shield, Trash2, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { useOrganization } from "@/lib/context/organization-context";
import { LoadingState } from "@/components/error-states";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { VaultProfileForm } from "@/components/vault-profile/vault-profile-form";
import { OKRForm } from "@/components/vault-profile/okr-form";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type VaultProfile = Tables<"vault_profiles">;
type OKR = Tables<"okrs">;

const STATUS_COLORS = {
  "not-started": "bg-slate-100 text-slate-800 border-slate-200",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  "completed": "bg-green-100 text-green-800 border-green-200",
  "at-risk": "bg-destructive/10 text-destructive border-destructive/20",
  "cancelled": "bg-gray-100 text-gray-600 border-gray-200",
};

export default function VaultProfilePage() {
  const [vaultProfile, setVaultProfile] = useState<VaultProfile | null>(null);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
  const [isOKRFormOpen, setIsOKRFormOpen] = useState(false);
  const [editingOKR, setEditingOKR] = useState<OKR | null>(null);
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const router = useRouter();
  const { role, canEdit, canDelete } = usePermissions();
  const { logAgentAction } = useAuditLog();

  // Load vault profile data
  const loadVaultProfile = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from("vault_profiles")
        .select("*")
        .eq("vault_id", currentOrg.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error loading vault profile:", error);
      } else {
        setVaultProfile(data);
      }
    } catch (error) {
      console.error("Error in loadVaultProfile:", error);
    }
  };

  // Load OKRs
  const loadOKRs = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from("okrs")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading OKRs:", error);
      } else if (data) {
        setOkrs(data);
      }
    } catch (error) {
      console.error("Error in loadOKRs:", error);
    }
  };

  // Load recent activity
  const loadRecentActivity = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading activity:", error);
      } else if (data) {
        setRecentActivity(data);
      }
    } catch (error) {
      console.error("Error in loadRecentActivity:", error);
    }
  };

  // Handler functions
  const handleEditOKR = (okr: OKR) => {
    setEditingOKR(okr);
    setIsOKRFormOpen(true);
  };

  const handleDeleteOKR = async (okr: OKR) => {
    if (!confirm(`Are you sure you want to delete this OKR: "${okr.objective}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("okrs")
        .delete()
        .eq("id", okr.id);

      if (error) throw error;

      await loadOKRs(); // Reload OKRs
    } catch (error) {
      console.error("Error deleting OKR:", error);
      alert("Failed to delete OKR. Please try again.");
    }
  };

  const handleOKRFormSuccess = async () => {
    await loadOKRs();
    setEditingOKR(null);
  };

  const handleProfileFormSuccess = async () => {
    await loadVaultProfile();
  };

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadVaultProfile(), loadOKRs(), loadRecentActivity()]);
    setIsLoading(false);
  };

  // Load on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;
    loadData();

    const handleVisibilityChange = () => {
      if (!document.hidden) loadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentOrg?.id]);

  // Realtime subscriptions
  useEffect(() => {
    if (!currentOrg) return;

    const vaultProfileChannel = supabase
      .channel('vault-profile-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vault_profiles', filter: `vault_id=eq.${currentOrg.id}` },
        () => loadVaultProfile()
      )
      .subscribe();

    const okrsChannel = supabase
      .channel('okrs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'okrs', filter: `org_id=eq.${currentOrg.id}` },
        () => loadOKRs()
      )
      .subscribe();

    const activityChannel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log', filter: `org_id=eq.${currentOrg.id}` },
        () => loadRecentActivity()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(vaultProfileChannel);
      supabase.removeChannel(okrsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [currentOrg?.id]);

  // Make vault profile and OKRs readable to AI
  useCopilotReadable({
    description: "Organization profile and OKRs for the current vault",
    value: {
      profile: vaultProfile ? {
        legal_name: vaultProfile.legal_name,
        brand_name: vaultProfile.brand_name,
        mission: vaultProfile.mission,
        vision: vaultProfile.vision,
        values: vaultProfile.values,
        industry: vaultProfile.industry,
        company_size: vaultProfile.company_size,
        description: vaultProfile.description,
      } : null,
      okrs: okrs.map(okr => ({
        id: okr.id,
        objective: okr.objective,
        key_result: okr.key_result,
        status: okr.status,
        progress: okr.progress,
        due_date: okr.due_date,
        notes: okr.notes,
      })),
    },
  });

  // AI action: Update vault profile
  useCopilotAction({
    name: "updateVaultProfile",
    description: "Update the organization profile for the current vault. Requires ADMIN or OWNER role. You can update mission, vision, values (array of strings), industry, company size, legal name, brand name, and description.",
    parameters: [
      { name: "legal_name", type: "string", description: "Legal company name", required: false },
      { name: "brand_name", type: "string", description: "Brand or trading name", required: false },
      { name: "mission", type: "string", description: "Company mission statement", required: false },
      { name: "vision", type: "string", description: "Company vision statement", required: false },
      { name: "values", type: "string[]", description: "Core company values (array of strings)", required: false },
      { name: "industry", type: "string", description: "Industry sector", required: false },
      { name: "company_size", type: "string", description: "Company size (e.g., '1-10', '11-50')", required: false },
      { name: "description", type: "string", description: "Brief company description", required: false },
    ],
    handler: async ({ legal_name, brand_name, mission, vision, values, industry, company_size, description }) => {
      if (!canEdit) {
        throw new Error(getEditPermissionError("vault profile", role));
      }

      if (!currentOrg) {
        throw new Error("No organization selected");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates: any = {};
      if (legal_name !== undefined) updates.legal_name = legal_name;
      if (brand_name !== undefined) updates.brand_name = brand_name;
      if (mission !== undefined) updates.mission = mission;
      if (vision !== undefined) updates.vision = vision;
      if (values !== undefined) updates.values = values;
      if (industry !== undefined) updates.industry = industry;
      if (company_size !== undefined) updates.company_size = company_size;
      if (description !== undefined) updates.description = description;

      if (Object.keys(updates).length === 0) {
        return "No fields to update";
      }

      updates.vault_id = currentOrg.id;
      updates.updated_by = user.id;

      let result;
      if (vaultProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from("vault_profiles")
          .update(updates)
          .eq("id", vaultProfile.id)
          .select()
          .single();

        if (error) throw new Error(`Failed to update vault profile: ${error.message}`);
        result = data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from("vault_profiles")
          .insert([updates])
          .select()
          .single();

        if (error) throw new Error(`Failed to create vault profile: ${error.message}`);
        result = data;
      }

      await logAgentAction(
        vaultProfile ? 'update' : 'create',
        'vault_profile',
        result.id,
        vaultProfile || null,
        updates,
        { source: 'ai_assistant' }
      );

      await loadVaultProfile();

      const updatedFields = Object.keys(updates).filter(k => k !== 'vault_id' && k !== 'updated_by').join(', ');
      return `Vault profile ${vaultProfile ? 'updated' : 'created'} successfully. Updated fields: ${updatedFields}`;
    },
  });

  // AI action: Create OKR
  useCopilotAction({
    name: "createOKR",
    description: "Create a new Objective and Key Result (OKR) for the current vault. Requires EDITOR, ADMIN, or OWNER role.",
    parameters: [
      { name: "objective", type: "string", description: "The objective to achieve (e.g., 'Achieve product-market fit')", required: true },
      { name: "key_result", type: "string", description: "Measurable key result (e.g., 'Reach 1,000 active users with 40% weekly retention')", required: true },
      { name: "status", type: "string", description: "Status: not-started, in-progress, completed, at-risk, or cancelled", required: false },
      { name: "progress", type: "number", description: "Progress percentage (0-100)", required: false },
      { name: "due_date", type: "string", description: "Due date (YYYY-MM-DD format)", required: false },
      { name: "notes", type: "string", description: "Additional notes or context", required: false },
    ],
    handler: async ({ objective, key_result, status, progress, due_date, notes }) => {
      if (!canEdit) {
        throw new Error(getCreatePermissionError("OKRs", role));
      }

      if (!currentOrg) {
        throw new Error("No organization selected");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const okrData = {
        objective,
        key_result,
        status: status || "not-started",
        progress: progress !== undefined ? Math.max(0, Math.min(100, progress)) : 0,
        due_date: due_date || null,
        notes: notes || null,
        org_id: currentOrg.id,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from("okrs")
        .insert([okrData])
        .select()
        .single();

      if (error) throw new Error(`Failed to create OKR: ${error.message}`);

      await logAgentAction(
        'create',
        'okr',
        data.id,
        null,
        okrData,
        { source: 'ai_assistant' }
      );

      await loadOKRs();

      return `OKR created successfully: "${objective}" with key result "${key_result}"`;
    },
  });

  // AI action: Update OKR
  useCopilotAction({
    name: "updateOKR",
    description: "Update an existing OKR by its objective name or ID. Requires EDITOR, ADMIN, or OWNER role.",
    parameters: [
      { name: "identifier", type: "string", description: "OKR ID or objective name to update", required: true },
      { name: "objective", type: "string", description: "New objective text", required: false },
      { name: "key_result", type: "string", description: "New key result text", required: false },
      { name: "status", type: "string", description: "New status: not-started, in-progress, completed, at-risk, or cancelled", required: false },
      { name: "progress", type: "number", description: "New progress percentage (0-100)", required: false },
      { name: "due_date", type: "string", description: "New due date (YYYY-MM-DD format)", required: false },
      { name: "notes", type: "string", description: "New notes or context", required: false },
    ],
    handler: async ({ identifier, objective, key_result, status, progress, due_date, notes }) => {
      if (!canEdit) {
        throw new Error(getEditPermissionError("OKRs", role));
      }

      if (!currentOrg) {
        throw new Error("No organization selected");
      }

      // Find OKR by ID or objective name
      const okr = okrs.find(o =>
        o.id === identifier ||
        o.objective.toLowerCase().includes(identifier.toLowerCase())
      );

      if (!okr) {
        throw new Error(`OKR not found with identifier: ${identifier}`);
      }

      const updates: any = {};
      if (objective !== undefined) updates.objective = objective;
      if (key_result !== undefined) updates.key_result = key_result;
      if (status !== undefined) updates.status = status;
      if (progress !== undefined) updates.progress = Math.max(0, Math.min(100, progress));
      if (due_date !== undefined) updates.due_date = due_date;
      if (notes !== undefined) updates.notes = notes;

      if (Object.keys(updates).length === 0) {
        return "No fields to update";
      }

      const { data, error } = await supabase
        .from("okrs")
        .update(updates)
        .eq("id", okr.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update OKR: ${error.message}`);

      await logAgentAction(
        'update',
        'okr',
        okr.id,
        okr,
        updates,
        { source: 'ai_assistant' }
      );

      await loadOKRs();

      const updatedFields = Object.keys(updates).join(', ');
      return `OKR "${okr.objective}" updated successfully. Updated fields: ${updatedFields}`;
    },
  });

  // AI action: Delete OKR
  useCopilotAction({
    name: "deleteOKR",
    description: "Delete an OKR by its objective name or ID. Requires ADMIN or OWNER role. This action is permanent.",
    parameters: [
      { name: "identifier", type: "string", description: "OKR ID or objective name to delete", required: true },
    ],
    handler: async ({ identifier }) => {
      if (!canDelete) {
        throw new Error(getDeletePermissionError("OKRs", role));
      }

      if (!currentOrg) {
        throw new Error("No organization selected");
      }

      // Find OKR by ID or objective name
      const okr = okrs.find(o =>
        o.id === identifier ||
        o.objective.toLowerCase().includes(identifier.toLowerCase())
      );

      if (!okr) {
        throw new Error(`OKR not found with identifier: ${identifier}`);
      }

      const { error } = await supabase
        .from("okrs")
        .delete()
        .eq("id", okr.id);

      if (error) throw new Error(`Failed to delete OKR: ${error.message}`);

      await logAgentAction(
        'delete',
        'okr',
        okr.id,
        okr,
        null,
        { source: 'ai_assistant' }
      );

      await loadOKRs();

      return `OKR "${okr.objective}" deleted successfully`;
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading vault profile..." />;
  }

  const values = vaultProfile?.values as string[] | null;
  const activityIcons: Record<string, any> = {
    decision: FileText,
    risk: AlertTriangle,
    document: FileText,
    okr: Target,
    secret: Shield,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {currentOrg?.name || "Vault Profile"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Organization information, objectives, and recent activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {role || "Member"}
          </Badge>
        </div>
      </div>

      {/* Organization Info Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Organization Info</h2>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsProfileFormOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {vaultProfile ? (
          <div className="grid gap-4 md:grid-cols-2">
            {vaultProfile.mission && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Mission</h3>
                <p className="mt-1 text-sm">{vaultProfile.mission}</p>
              </div>
            )}
            {vaultProfile.vision && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Vision</h3>
                <p className="mt-1 text-sm">{vaultProfile.vision}</p>
              </div>
            )}
            {values && values.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Values</h3>
                <div className="flex flex-wrap gap-2">
                  {values.map((value, index) => (
                    <Badge key={index} variant="outline">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {vaultProfile.industry && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Industry</h3>
                <p className="mt-1 text-sm">{vaultProfile.industry}</p>
              </div>
            )}
            {vaultProfile.company_size && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Company Size</h3>
                <p className="mt-1 text-sm">{vaultProfile.company_size}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No organization info yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Organization profile editing coming soon
            </p>
          </div>
        )}
      </Card>

      {/* OKRs Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Objectives & Key Results</h2>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingOKR(null);
                setIsOKRFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add OKR
            </Button>
          )}
        </div>

        {okrs.length === 0 ? (
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No OKRs yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first objective and key result to track progress
            </p>
            {canEdit && (
              <Button
                onClick={() => {
                  setEditingOKR(null);
                  setIsOKRFormOpen(true);
                }}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create OKR
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {okrs.map((okr) => (
              <div key={okr.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {okr.objective}
                      </h3>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[okr.status as keyof typeof STATUS_COLORS]}
                      >
                        {okr.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {okr.key_result}
                    </p>
                    {okr.progress !== null && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{okr.progress}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${okr.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {okr.due_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Calendar className="h-3 w-3" />
                        {new Date(okr.due_date).toLocaleDateString()}
                      </div>
                    )}
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleEditOKR(okr)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteOKR(okr)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Activity Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No recent activity</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Activity will appear here as you use the vault
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => {
              const Icon = activityIcons[activity.resource_type] || Activity;
              return (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}</span>
                      {' '}
                      <span className="text-muted-foreground">{activity.resource_type}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {activity.actor_type}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <VaultProfileForm
        isOpen={isProfileFormOpen}
        onClose={() => setIsProfileFormOpen(false)}
        profile={vaultProfile}
        onSuccess={handleProfileFormSuccess}
      />

      <OKRForm
        isOpen={isOKRFormOpen}
        onClose={() => {
          setIsOKRFormOpen(false);
          setEditingOKR(null);
        }}
        okr={editingOKR}
        onSuccess={handleOKRFormSuccess}
      />
    </div>
  );
}
