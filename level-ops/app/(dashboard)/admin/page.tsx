"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Users, AlertCircle, Shield, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { RoleBadge } from "@/components/permissions";
import { terms } from "@/lib/config/branding";

type Organization = Database["public"]["Tables"]["organizations"]["Row"] & {
  member_count?: number;
};

export default function AdminPage() {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Create org dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkPlatformAdmin();
  }, []);

  const checkPlatformAdmin = async () => {
    try {
      const { data, error } = await supabase.rpc("is_platform_admin");

      if (error) {
        console.error("Error checking platform admin:", error);
        setIsPlatformAdmin(false);
      } else {
        setIsPlatformAdmin(data === true);
        if (data === true) {
          loadOrganizations();
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setIsPlatformAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgsError) throw orgsError;

      // Get member counts for each organization
      const orgsWithCounts = await Promise.all(
        (orgs || []).map(async (org: any) => {
          const { count } = await supabase
            .from("org_memberships")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id);

          return {
            ...org,
            member_count: count || 0,
          };
        })
      );

      setOrganizations(orgsWithCounts);
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName || !newOrgSlug || !ownerEmail) {
      alert("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    try {
      // Check if user exists with this email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", ownerEmail)
        .single();

      if (profileError || !profile) {
        alert("No user found with that email address. The user must sign up first.");
        return;
      }

      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: newOrgName,
          slug: newOrgSlug,
        } as any)
        .select()
        .single();

      if (orgError) throw orgError;

      // Send notification to owner instead of auto-creating membership
      // This allows the owner to accept and join from the notification center
      const { error: notificationError } = await supabase.rpc('create_notification', {
        p_user_id: (profile as any).user_id,
        p_type: 'vault_owner_assigned',
        p_title: `You've been assigned as ${terms.vaultLower} owner`,
        p_message: `You have been assigned as the owner of ${newOrgName}. Click Accept to access the ${terms.vaultLower}.`,
        p_action_url: '/notifications',
        p_metadata: {
          org_id: (newOrg as any).id,
          org_name: newOrgName,
          org_slug: newOrgSlug
        }
      } as any);

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't fail the whole operation if notification fails
        // Fall back to creating membership directly
        const { error: membershipError } = await supabase
          .from("org_memberships")
          .insert({
            org_id: (newOrg as any).id,
            user_id: (profile as any).user_id,
            role: "OWNER",
          } as any);

        if (membershipError) throw membershipError;

        alert(`${terms.vault} "${newOrgName}" created successfully! Owner membership created directly (notification failed).`);
      } else {
        alert(`${terms.vault} "${newOrgName}" created successfully! ${ownerEmail} will receive a notification to accept ownership.`);
      }
      setIsCreateDialogOpen(false);
      setNewOrgName("");
      setNewOrgSlug("");
      setOwnerEmail("");
      loadOrganizations();
    } catch (error: any) {
      console.error("Error creating organization:", error);

      // Provide user-friendly error messages
      if (error.message?.includes("organizations_slug_key")) {
        alert(`The slug "${newOrgSlug}" is already taken. Please choose a different one.`);
      } else if (error.message?.includes("duplicate")) {
        alert(`An organization with this name or slug already exists. Please use different values.`);
      } else {
        alert(`Failed to create organization: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone and will delete all associated data.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);

      if (error) throw error;

      alert(`Organization "${orgName}" deleted successfully!`);
      loadOrganizations();
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      alert(`Failed to delete organization: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container-xl space-y-5 pb-20 md:pb-5">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="container-xl space-y-5 pb-20 md:pb-5">
        <header className="flex items-start justify-between pb-3 border-b border-gray-200">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Vaults Admin</h1>
            <p className="text-sm text-muted-foreground">Platform administration</p>
          </div>
        </header>
        <Card className="p-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Platform Admin Access Required</p>
          <p className="text-muted-foreground">
            You need to be a VAULTS platform administrator to access this page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Vaults Admin</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Platform administration • {organizations.length} {terms.vaultsLower}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Create {terms.vault}
        </Button>
      </div>

      {/* Organizations List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">All {terms.vaultPlural}</h2>
        {organizations.length === 0 ? (
          <p className="text-muted-foreground">No {terms.vaultsLower} yet</p>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
              >
                <div className="flex items-center gap-3">
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt={org.name}
                      className="h-10 w-10 object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-lg truncate">{org.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      /{org.slug}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {org.member_count} {org.member_count === 1 ? "member" : "members"}
                    </span>
                  </div>
                  <Badge variant="outline" style={{ backgroundColor: org.brand_color || "#3b82f6", color: "#fff" }}>
                    {org.brand_color || "#3b82f6"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOrganization(org.id, org.name)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New {terms.vault}</DialogTitle>
            <DialogDescription>
              Create a new {terms.vaultLower} and assign an initial owner
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="org-name">{terms.vault} Name</Label>
              <Input
                id="org-name"
                value={newOrgName}
                onChange={(e) => {
                  setNewOrgName(e.target.value);
                  // Auto-generate slug
                  setNewOrgSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  );
                }}
                placeholder="Acme Corporation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug (URL identifier)</Label>
              <Input
                id="org-slug"
                value={newOrgSlug}
                onChange={(e) =>
                  setNewOrgSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="acme-corp"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs: /{newOrgSlug || "slug"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-email">Owner Email Address</Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@acme.com"
              />
              <p className="text-xs text-muted-foreground">
                User must already have an account
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isCreating}>
              {isCreating ? "Creating..." : `Create ${terms.vault}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
