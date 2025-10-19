"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Users, Mail, Palette, Building2, Trash2, X, CheckCircle2, Clock, AlertCircle, Crown, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import type { Database } from "@/lib/supabase/database.types";
import { getContrastRatio, getContrastRating, suggestAccessibleAlternatives } from "@/lib/utils/contrast";
import { AVAILABLE_MODULES, type ModuleSettings, getDefaultModuleSettings } from "@/lib/types/modules";
import { terms } from "@/lib/config/branding";
import { PLAN_DISPLAY, type VaultPlanTier } from "@/lib/config/plans";

type OrgMembership = Database["public"]["Tables"]["org_memberships"]["Row"] & {
  profiles?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
};

type OrgInvitation = Database["public"]["Tables"]["org_invitations"]["Row"];

type TabType = "profile" | "organization" | "members" | "invitations" | "branding" | "plan" | "notifications";

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Owner", description: `Full control of ${terms.vaultLower}` },
  { value: "ADMIN", label: "Admin", description: "Manage members and settings" },
  { value: "EDITOR", label: "Editor", description: "Create and edit content" },
  { value: "VIEWER", label: "Viewer", description: "View only access" },
];

const ROLE_COLORS = {
  OWNER: "bg-slate-300 text-slate-950 border-slate-400",
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  EDITOR: "bg-slate-200 text-slate-900 border-slate-300",
  VIEWER: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [members, setMembers] = useState<OrgMembership[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite dialog state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Database["public"]["Enums"]["org_role"]>("VIEWER");
  const [isInviting, setIsInviting] = useState(false);

  // Organization settings state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Branding state
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#3b82f6");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Plan state
  const [planTier, setPlanTier] = useState<VaultPlanTier>("Small");
  const [seatsLimit, setSeatsLimit] = useState(10);
  const [membersCount, setMembersCount] = useState(0);
  const [seatsRemaining, setSeatsRemaining] = useState(10);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [showPlanDowngradeWarning, setShowPlanDowngradeWarning] = useState(false);
  const [attemptedPlanTier, setAttemptedPlanTier] = useState<VaultPlanTier | null>(null);

  // Notification preferences state
  const [emailInvites, setEmailInvites] = useState(true);
  const [emailDigests, setEmailDigests] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);
  const [isSavingNotifPrefs, setIsSavingNotifPrefs] = useState(false);

  const supabase = createClient();
  const { currentOrg, organizations } = useOrganization();
  const { hasPermission, role, canEdit, canManage, isViewer } = usePermissions();

  // Check if user is admin
  const isAdmin = canManage;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Always load user profile and notification prefs
      await Promise.all([
        loadProfile(),
        loadNotificationPrefs()
      ]);

      // Load org-specific data if user has an org and is admin
      if (currentOrg && isAdmin) {
        await Promise.all([
          loadMembers(),
          loadInvitations(),
          loadOrgSettings(),
          loadPlanData()
        ]);
      } else if (currentOrg) {
        // Load basic org settings even for non-admins
        loadOrgSettings();
      }

      setIsLoading(false);
    };

    loadData();

    // Reload data when page becomes visible (e.g., navigating back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentOrg?.id, isAdmin]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
    } else if (data) {
      setFirstName((data as any).first_name || "");
      setLastName((data as any).last_name || "");
      setPhone((data as any).phone || "");
      setAvatarUrl((data as any).avatar_url || "");
      setUserEmail((data as any).email);
    }
  };

  const loadNotificationPrefs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_notification_prefs")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error loading notification preferences:", error);
    } else if (data) {
      setEmailInvites((data as any).email_invites);
      setEmailDigests((data as any).email_digests);
      setSmsAlerts((data as any).sms_alerts);
      setWhatsappAlerts((data as any).whatsapp_alerts);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setIsSavingNotifPrefs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_notification_prefs")
        .upsert({
          user_id: user.id,
          email_invites: emailInvites,
          email_digests: emailDigests,
          sms_alerts: smsAlerts,
          whatsapp_alerts: whatsappAlerts,
        } as any);

      if (error) throw error;
      alert("Notification preferences saved!");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setIsSavingNotifPrefs(false);
    }
  };

  const loadMembers = async () => {
    if (!currentOrg) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("org_memberships")
      .select(`
        org_id,
        user_id,
        role,
        created_at,
        updated_at,
        profiles (
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading members:", error);
    } else if (data) {
      setMembers(data as any);
    }
    setIsLoading(false);
  };

  const loadInvitations = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("org_invitations")
      .select("*")
      .eq("org_id", currentOrg.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading invitations:", error);
    } else if (data) {
      setInvitations(data);
    }
  };

  const loadOrgSettings = async () => {
    if (!currentOrg) return;

    setOrgName(currentOrg.name);
    setOrgSlug(currentOrg.slug);
    setOrgDomain(currentOrg.domain || "");
    setLogoUrl(currentOrg.logo_url || "");
    setBrandColor(currentOrg.brand_color || "#3b82f6");

    // Load module settings
    const settings = (currentOrg.settings as ModuleSettings) || {};
    const defaultSettings = getDefaultModuleSettings();
    const modules = settings.modules || defaultSettings.modules || {};
    setEnabledModules(modules);
  };

  const loadPlanData = async () => {
    if (!currentOrg) return;

    try {
      const response = await fetch(`/api/vaults/${currentOrg.id}/plan`);
      if (!response.ok) {
        console.error("Error loading plan data:", await response.text());
        return;
      }

      const data = await response.json();
      setPlanTier(data.tier);
      setSeatsLimit(data.seatsLimit);
      setMembersCount(data.membersCount);
      setSeatsRemaining(data.seatsRemaining);
    } catch (error) {
      console.error("Error loading plan data:", error);
    }
  };

  const handleChangePlan = async (newTier: VaultPlanTier) => {
    if (!currentOrg) return;

    setIsChangingPlan(true);
    try {
      const response = await fetch(`/api/vaults/${currentOrg.id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          // Downgrade prevented - show warning
          setAttemptedPlanTier(newTier);
          setShowPlanDowngradeWarning(true);
        } else {
          alert(`Failed to change plan: ${error.error || "Unknown error"}`);
        }
        return;
      }

      const data = await response.json();
      setPlanTier(data.tier);
      setSeatsLimit(data.seatsLimit);
      setMembersCount(data.membersCount);
      setSeatsRemaining(data.seatsRemaining);
      alert(`Plan changed to ${data.tier} successfully!`);
    } catch (error) {
      console.error("Error changing plan:", error);
      alert("Failed to change plan. Please try again.");
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handleInviteMember = async () => {
    if (!currentOrg || !inviteEmail) return;

    setIsInviting(true);
    try {
      // Check if we have available seats
      const canInviteResponse = await fetch(`/api/vaults/${currentOrg.id}/members/can-invite`);
      if (canInviteResponse.ok) {
        const { canInvite, seatsRemaining: remaining } = await canInviteResponse.json();
        if (!canInvite) {
          alert(`Seat limit reached!\n\nYour ${terms.vaultLower} has ${remaining} seats remaining. Please upgrade your plan or remove a member before inviting new members.`);
          setIsInviting(false);
          return;
        }
      }

      // Generate random token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if the invited user exists in the system
      const { data: invitedProfile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", inviteEmail)
        .single();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from("org_invitations")
        .insert({
          org_id: currentOrg.id,
          email: inviteEmail,
          role: inviteRole,
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Get inviter profile for email
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .single();

      const inviterName =
        (inviterProfile as any)?.first_name && (inviterProfile as any)?.last_name
          ? `${(inviterProfile as any).first_name} ${(inviterProfile as any).last_name}`
          : user.email || "A team member";

      // Generate invite URL
      const inviteUrl = `${window.location.origin}/invite?token=${token}`;

      // Call Edge Function to send email
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`;
      const { data: authData } = await supabase.auth.getSession();

      try {
        const emailResponse = await fetch(edgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.session?.access_token}`,
          },
          body: JSON.stringify({
            vaultName: currentOrg.name,
            inviterName,
            inviteeEmail: inviteEmail,
            inviteUrl,
            expiryHours: 168, // 7 days = 168 hours
          }),
        });

        if (!emailResponse.ok) {
          console.error("Failed to send invite email:", await emailResponse.text());
        }
      } catch (emailError) {
        console.error("Error sending invite email:", emailError);
      }

      // If user exists, also send them an in-app notification
      if (invitedProfile) {
        const { error: notificationError } = await supabase.rpc('create_notification', {
          p_user_id: (invitedProfile as any).user_id,
          p_type: 'vault_invite',
          p_title: `${terms.vault} invitation`,
          p_message: `You've been invited to join ${currentOrg.name} as ${inviteRole}. Click to accept or decline.`,
          p_action_url: '/notifications',
          p_metadata: {
            org_id: currentOrg.id,
            org_name: currentOrg.name,
            org_slug: currentOrg.slug,
            invitation_id: (invitation as any).id,
            role: inviteRole
          }
        } as any);

        if (notificationError) {
          console.error("Error creating notification:", notificationError);
        }

        alert(`Invitation sent!\n\n${inviteEmail} has been sent an email invitation and will also see it in their notifications center.`);
      } else {
        alert(`Invitation sent!\n\n${inviteEmail} has been sent an email with the invitation link.\n\nExpires in 7 days.`);
      }

      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("VIEWER");
      loadInvitations();
    } catch (error) {
      console.error("Error creating invitation:", error);
      alert("Failed to create invitation. Please try again.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    const { error } = await supabase
      .from("org_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      console.error("Error revoking invitation:", error);
      alert("Failed to revoke invitation");
    } else {
      loadInvitations();
    }
  };

  const handleChangeRole = async (userId: string, newRole: Database["public"]["Enums"]["org_role"]) => {
    if (!currentOrg) return;
    if (!confirm(`Change this member's role to ${newRole}?`)) return;

    const { error } = await supabase
      .from("org_memberships")
      .update({ role: newRole })
      .eq("org_id", currentOrg.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error changing role:", error);
      alert("Failed to change role. You may not have permission or this is the last OWNER.");
    } else {
      loadMembers();
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrg) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    const { error } = await supabase
      .from("org_memberships")
      .delete()
      .eq("org_id", currentOrg.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member. You may not have permission or cannot remove the last OWNER.");
    } else {
      loadMembers();
    }
  };

  const handleSaveOrganization = async () => {
    if (!currentOrg || !orgName || !orgSlug) return;

    setIsSavingOrg(true);
    try {
      const moduleSettings: ModuleSettings = {
        modules: enabledModules as any,
      };

      const { error} = await supabase
        .from("organizations")
        .update({
          name: orgName,
          slug: orgSlug,
          domain: orgDomain || null, // Set to null if empty
          settings: moduleSettings,
        })
        .eq("id", currentOrg.id);

      if (error) throw error;
      alert(`${terms.vault} settings saved!`);
    } catch (error) {
      console.error("Error saving organization:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsSavingBranding(true);
    try {
      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('org-logos').remove([oldPath]);
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentOrg.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('org-logos')
        .getPublicUrl(fileName);

      // Update organization with new logo URL
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: publicUrl })
        .eq("id", currentOrg.id);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      alert("Logo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!currentOrg) return;
    if (!confirm(`Are you sure you want to remove the ${terms.vaultLower} logo?`)) return;

    setIsSavingBranding(true);
    try {
      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('org-logos').remove([oldPath]);
      }

      const { error } = await supabase
        .from("organizations")
        .update({ logo_url: null })
        .eq("id", currentOrg.id);

      if (error) throw error;

      setLogoUrl("");
      alert("Logo removed!");
    } catch (error) {
      console.error("Error removing logo:", error);
      alert("Failed to remove logo. Please try again.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!currentOrg) return;

    setIsSavingBranding(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          brand_color: brandColor,
        })
        .eq("id", currentOrg.id);

      if (error) throw error;

      // Reload the page to refresh organization context with new color
      window.location.reload();
    } catch (error) {
      console.error("Error saving branding:", error);
      alert("Failed to save branding. Please try again.");
      setIsSavingBranding(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      alert("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    setIsSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", user.id);

      if (error) throw error;

      setAvatarUrl("");
      alert("Profile photo removed!");
    } catch (error) {
      console.error("Error removing avatar:", error);
      alert("Failed to remove photo. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      alert("Profile updated!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="container-xl space-y-5 pb-20 md:pb-5 animate-fade-in">
      <header className="flex items-start justify-between pb-3 border-b border-gray-200">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            {currentOrg ? `Manage ${currentOrg.name} settings and team members` : 'Manage your profile and preferences'}
          </p>
          <RoleBadge />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {/* Profile tab - available to all users */}
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-3 sm:px-4 py-3 font-medium text-xs border-b-2 transition-colors flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px] flex-shrink-0 ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Profile</span>
        </button>

        {/* Notifications tab - available to all users */}
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-3 sm:px-4 py-3 font-medium text-xs border-b-2 transition-colors flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px] flex-shrink-0 ${
            activeTab === "notifications"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="w-5 h-5" />
          <span>Notifications</span>
        </button>

        {/* Admin-only tabs */}
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("organization")}
              className={`px-3 sm:px-4 py-3 font-medium text-xs border-b-2 transition-colors flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px] flex-shrink-0 ${
                activeTab === "organization"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>{terms.vault}</span>
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`px-3 sm:px-4 py-3 font-medium text-xs border-b-2 transition-colors flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px] flex-shrink-0 ${
                activeTab === "members"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Members ({members.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("invitations")}
              className={`px-3 sm:px-4 py-3 font-medium text-xs border-b-2 transition-colors flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px] flex-shrink-0 ${
                activeTab === "invitations"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-5 h-5" />
              <span>Invitations ({invitations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`px-3 sm:px-4 py-3 font-medium text-xs border-b-2 transition-colors flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px] flex-shrink-0 ${
                activeTab === "branding"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Palette className="w-5 h-5" />
              <span>Branding</span>
            </button>
            <button
              onClick={() => setActiveTab("plan")}
              className={`px-3 sm:px-4 py-3 font-medium text-xs border-b-2 transition-colors flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px] flex-shrink-0 ${
                activeTab === "plan"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="w-5 h-5" />
              <span>Plan</span>
            </button>
          </>
        )}
      </div>

      {/* Profile Tab - Available to all users */}
      {activeTab === "profile" && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">My Profile</h2>
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Profile Photo</Label>
                <div className="flex items-center gap-4">
                  {avatarUrl && (
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a photo (JPG, PNG, GIF, WebP • Max 5MB)
                    </p>
                    {avatarUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteAvatar}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove Photo
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">{terms.vaultPlural}</h3>
              <div className="space-y-2">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {org.slug}
                      </p>
                    </div>
                    <Badge variant="outline" className={ROLE_COLORS[org.role]}>
                      {org.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications Tab - Available to all users */}
      {activeTab === "notifications" && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Choose how you want to receive notifications from the platform.
          </p>
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <input
                  type="checkbox"
                  id="email-invites"
                  checked={emailInvites}
                  onChange={(e) => setEmailInvites(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded"
                />
                <div className="flex-1">
                  <Label htmlFor="email-invites" className="font-medium cursor-pointer">
                    Email - Vault Invitations
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive email notifications when you're invited to join a vault
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <input
                  type="checkbox"
                  id="email-digests"
                  checked={emailDigests}
                  onChange={(e) => setEmailDigests(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded"
                />
                <div className="flex-1">
                  <Label htmlFor="email-digests" className="font-medium cursor-pointer">
                    Email - Digest & Updates
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive periodic email digests of activity and updates
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50">
                <input
                  type="checkbox"
                  id="sms-alerts"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  disabled
                  className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <Label htmlFor="sms-alerts" className="font-medium cursor-pointer flex items-center gap-2">
                    SMS Alerts
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive SMS notifications for important alerts (not yet available)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50">
                <input
                  type="checkbox"
                  id="whatsapp-alerts"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  disabled
                  className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <Label htmlFor="whatsapp-alerts" className="font-medium cursor-pointer flex items-center gap-2">
                    WhatsApp Alerts
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive WhatsApp notifications for important alerts (not yet available)
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveNotificationPrefs} disabled={isSavingNotifPrefs}>
                {isSavingNotifPrefs ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Organization Tab */}
      {activeTab === "organization" && isAdmin && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{terms.vault} Settings</h2>
          <div className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="org-name">{terms.vault} Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={`Enter ${terms.vaultLower} name`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug (URL identifier)</Label>
              <Input
                id="org-slug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="vault-slug"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs and must be unique
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-domain">Custom Domain (Optional)</Label>
              <Input
                id="org-domain"
                value={orgDomain}
                onChange={(e) => setOrgDomain(e.target.value.toLowerCase())}
                placeholder="portal.yourcompany.com"
              />
              <p className="text-xs text-muted-foreground">
                Set a custom domain or subdomain for this {terms.vaultLower}. When users access this domain, they'll be automatically logged into this {terms.vaultLower}. Leave empty to use the {terms.vaultLower} switcher instead.
              </p>
            </div>

            {/* Module Toggles */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <h3 className="text-lg font-semibold">Enabled Modules</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which features are available for this {terms.vaultLower}
                </p>
              </div>
              <div className="space-y-2">
                {AVAILABLE_MODULES.map((module) => (
                  <label
                    key={module.key}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={enabledModules[module.key] !== false}
                      onChange={(e) =>
                        setEnabledModules((prev) => ({
                          ...prev,
                          [module.key]: e.target.checked,
                        }))
                      }
                      disabled={module.required}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{module.name}</span>
                        {module.required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleSaveOrganization} disabled={isSavingOrg}>
              {isSavingOrg ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>
      )}

      {/* Members Tab */}
      {activeTab === "members" && isAdmin && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Team Members</h2>
            <Button onClick={() => setActiveTab("invitations")}>
              <Mail className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground">No members found</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {member.profiles?.first_name || member.profiles?.last_name
                        ? `${member.profiles.first_name || ""} ${member.profiles.last_name || ""}`.trim()
                        : "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.profiles?.email || member.user_id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={ROLE_COLORS[member.role]}>
                      {member.role}
                    </Badge>
                    {currentOrg.role === "OWNER" && (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.user_id, e.target.value as any)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Invitations Tab */}
      {activeTab === "invitations" && isAdmin && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>

          {invitations.length === 0 ? (
            <p className="text-muted-foreground">No pending invitations</p>
          ) : (
            <div className="space-y-2">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expires_at) < new Date();
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isExpired ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <X className="w-3 h-3 mr-1" />
                          Expired
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const inviteUrl = `${window.location.origin}/invite?token=${invitation.token}`;
                              await navigator.clipboard.writeText(inviteUrl);
                              alert("Invitation link copied to clipboard!");
                            }}
                          >
                            Copy Link
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Branding Tab */}
      {activeTab === "branding" && isAdmin && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{terms.vault} Branding</h2>
          <div className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="logo">{terms.vault} Logo</Label>
              <div className="space-y-3">
                {logoUrl && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <img src={logoUrl} alt="Logo preview" className="h-16 object-contain" />
                  </div>
                )}
                <Input
                  id="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a logo (JPG, PNG, GIF, WebP, SVG • Max 5MB)
                </p>
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteLogo}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove Logo
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-color">Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="brand-color"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>

              {/* Contrast Validation */}
              {(() => {
                const contrastRatio = getContrastRatio(brandColor, "#ffffff");
                const rating = getContrastRating(contrastRatio);
                const alternatives = suggestAccessibleAlternatives(brandColor, "#ffffff");

                return (
                  <div className="space-y-3 mt-3">
                    {/* Contrast Ratio Display */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Contrast Ratio:</span>
                      <span className="font-mono font-medium">{contrastRatio.toFixed(2)}:1</span>
                      <Badge
                        variant="outline"
                        className={
                          rating.level === 'aaa' ? 'bg-slate-200 text-slate-900 border-slate-300' :
                          rating.level === 'aa' ? 'bg-primary/10 text-primary border-primary/20' :
                          rating.level === 'aa-large' ? 'bg-muted text-muted-foreground border-border' :
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }
                      >
                        {rating.label}
                      </Badge>
                    </div>

                    {/* Rating Description */}
                    <p className="text-xs text-muted-foreground">
                      {rating.description}
                    </p>

                    {/* Warning for Poor Contrast */}
                    {rating.level === 'fail' && (
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-destructive">
                          <p className="font-medium mb-1">Accessibility Warning</p>
                          <p>This color does not meet WCAG AA standards for text on white backgrounds. Consider using one of the suggested alternatives below.</p>
                        </div>
                      </div>
                    )}

                    {/* Suggest Alternatives for Poor Contrast */}
                    {rating.level !== 'aaa' && alternatives && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Suggested Accessible Alternatives:</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBrandColor(alternatives.darker)}
                            className="flex-1 p-3 rounded-lg border-2 border-gray-200 hover:border-primary transition-colors"
                            style={{ backgroundColor: alternatives.darker }}
                          >
                            <div className="flex items-center justify-between text-white text-sm">
                              <span>Darker</span>
                              <span className="font-mono text-xs">{alternatives.darker}</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBrandColor(alternatives.lighter)}
                            className="flex-1 p-3 rounded-lg border-2 border-gray-200 hover:border-primary transition-colors"
                            style={{ backgroundColor: alternatives.lighter }}
                          >
                            <div className="flex items-center justify-between text-white text-sm">
                              <span>Lighter</span>
                              <span className="font-mono text-xs">{alternatives.lighter}</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    <div className="mt-2 p-4 rounded" style={{ backgroundColor: brandColor }}>
                      <p className="text-white font-medium">Preview: Button Text</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <Button onClick={handleSaveBranding} disabled={isSavingBranding}>
              {isSavingBranding ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </Card>
      )}

      {/* Plan & Seats Tab */}
      {activeTab === "plan" && isAdmin && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Plan & Seats</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This {terms.vaultLower}'s plan sets the total members allowed. You can change plans at any time. Billing will be handled separately.
          </p>

          <div className="space-y-6 max-w-2xl">
            {/* Current Plan */}
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{planTier}</p>
                    <p className="text-sm text-muted-foreground">{PLAN_DISPLAY[planTier].note}</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Active
                  </Badge>
                </div>
              </div>
            </div>

            {/* Seats Usage */}
            <div className="space-y-2">
              <Label>Seats Used</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {membersCount} of {seatsLimit} seats used
                  </span>
                  <span className="font-medium">
                    {seatsRemaining} remaining
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      seatsRemaining === 0
                        ? "bg-destructive"
                        : seatsRemaining < 3
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${(membersCount / seatsLimit) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Change Plan */}
            <div className="space-y-2">
              <Label htmlFor="plan-tier">Change Plan</Label>
              <select
                id="plan-tier"
                value={planTier}
                onChange={(e) => handleChangePlan(e.target.value as VaultPlanTier)}
                disabled={isChangingPlan}
                className="w-full border rounded-md px-3 py-2"
              >
                {Object.entries(PLAN_DISPLAY).map(([tier, { label, note }]) => (
                  <option key={tier} value={tier}>
                    {label} - {note}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Select a new plan to upgrade or downgrade. Changes take effect immediately.
              </p>
            </div>

            {/* Warning for near-capacity */}
            {seatsRemaining < 3 && seatsRemaining > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Running low on seats</p>
                  <p>
                    You have {seatsRemaining} {seatsRemaining === 1 ? "seat" : "seats"} remaining. Consider upgrading your plan if you need to invite more members.
                  </p>
                </div>
              </div>
            )}

            {/* Warning for at-capacity */}
            {seatsRemaining === 0 && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-sm text-destructive">
                  <p className="font-medium">Seat limit reached</p>
                  <p>
                    Your {terms.vaultLower} is at full capacity. Upgrade your plan or remove members to invite new team members.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Plan Downgrade Warning Dialog */}
      <Dialog open={showPlanDowngradeWarning} onOpenChange={setShowPlanDowngradeWarning}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Cannot Downgrade Plan</DialogTitle>
            <DialogDescription>
              Your current member count exceeds the new plan's limit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive">
                <p className="font-medium mb-1">Downgrade Not Allowed</p>
                <p>
                  You currently have {membersCount} members. The {attemptedPlanTier} plan allows{" "}
                  {attemptedPlanTier && PLAN_DISPLAY[attemptedPlanTier].note?.match(/\d+/)?.[0]} seats.
                </p>
                <p className="mt-2">
                  Please remove {membersCount - (attemptedPlanTier ? parseInt(PLAN_DISPLAY[attemptedPlanTier].note?.match(/\d+/)?.[0] || "0") : 0)} member(s) first or choose a higher plan.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={() => {
              setShowPlanDowngradeWarning(false);
              setAttemptedPlanTier(null);
            }}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              {currentOrg ? `Send an invitation to join ${currentOrg.name}` : 'Send an invitation to join your vault'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full border rounded-md px-3 py-2"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={isInviting || !inviteEmail}>
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
