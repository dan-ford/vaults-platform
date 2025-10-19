"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, ExternalLink, Loader2, Trash2, Mail, MailOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { RoleBadge } from "@/components/permissions";
import type { Database } from "@/lib/supabase/database.types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Notification = any; // Database["public"]["Tables"]["notifications"]["Row"];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const router = useRouter();
  const { hasPermission, role, canEdit, isViewer } = usePermissions();

  useEffect(() => {
    loadNotifications();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['notifications']['Row']>) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? (payload.new as Notification) : n
              )
            );
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase
        .from("notifications") as any)
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      const { error } = await (supabase
        .from("notifications") as any)
        .update({ read_at: null })
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm("Delete this notification?")) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting notification:", error);
      alert("Failed to delete notification");
    }
  };

  const handleAcceptVaultInvite = async (notification: Notification) => {
    setProcessingIds((prev) => new Set(prev).add(notification.id));

    try {
      const metadata = notification.metadata as any;
      const invitationId = metadata?.invitation_id;
      const orgId = metadata?.org_id;

      if (!invitationId || !orgId) {
        alert("Invalid notification data");
        return;
      }

      // Accept the invitation using the RPC function
      const { data, error } = await supabase.rpc("accept_org_invite_by_id", {
        p_invitation_id: invitationId,
      } as any);

      if (error) throw error;

      if (!(data as any).success) {
        alert((data as any).message || "Failed to accept invitation");
        return;
      }

      // Mark notification as read
      await markAsRead(notification.id);

      alert(`Successfully joined ${metadata.org_name}!`);

      // Reload the page to refresh organization context
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      alert(`Failed to accept invitation: ${error.message}`);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleDeclineVaultInvite = async (notification: Notification) => {
    setProcessingIds((prev) => new Set(prev).add(notification.id));

    try {
      const metadata = notification.metadata as any;
      const invitationId = metadata?.invitation_id;

      if (!invitationId) {
        alert("Invalid notification data");
        return;
      }

      // Delete the invitation
      const { error } = await supabase
        .from("org_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      // Mark notification as read
      await markAsRead(notification.id);

      alert("Invitation declined");
    } catch (error: any) {
      console.error("Error declining invite:", error);
      alert(`Failed to decline invitation: ${error.message}`);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleAcceptOwnerAssignment = async (notification: Notification) => {
    setProcessingIds((prev) => new Set(prev).add(notification.id));

    try {
      const metadata = notification.metadata as any;
      const orgId = metadata?.org_id;

      if (!orgId) {
        alert("Invalid notification data");
        return;
      }

      // Check if membership already exists
      const { data: existingMembership } = await supabase
        .from("org_memberships")
        .select("*")
        .eq("org_id", orgId)
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .single();

      if (!existingMembership) {
        // Create the membership
        const { error: membershipError } = await supabase
          .from("org_memberships")
          .insert({
            org_id: orgId,
            user_id: (await supabase.auth.getUser()).data.user!.id,
            role: "OWNER",
          } as any);

        if (membershipError) throw membershipError;
      }

      // Mark notification as read
      await markAsRead(notification.id);

      alert(`Successfully joined ${metadata.org_name} as Owner!`);

      // Reload to refresh organization context
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error("Error accepting owner assignment:", error);
      alert(`Failed to accept assignment: ${error.message}`);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (isLoading) {
    return (
      <div className="container-xl space-y-5 pb-20 animate-fade-in">
        <header className="flex items-start justify-between pb-3 border-b border-gray-200">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              Stay updated on vault activities and invitations
            </p>
          </div>
        </header>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-3 text-sm font-normal text-muted-foreground">
                ({unreadCount} unread)
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on vault activities and invitations
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center">
          <Bell
            className="h-12 w-12 text-muted-foreground/50 mb-4"
            aria-hidden="true"
          />
          <p className="text-lg font-medium text-muted-foreground mb-2">
            No notifications
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            You&apos;ll receive notifications here for vault invites, task
            updates, and important activities
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isProcessing = processingIds.has(notification.id);
            const metadata = notification.metadata as any;

            return (
              <Card
                key={notification.id}
                className={`p-4 ${
                  notification.read_at ? "bg-muted/30" : "bg-background"
                }`}
              >
                <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
                  <div
                    className={`rounded-full p-2 flex-shrink-0 ${
                      notification.read_at
                        ? "bg-muted"
                        : "bg-primary/10"
                    }`}
                  >
                    <Bell
                      className={`h-4 w-4 ${
                        notification.read_at
                          ? "text-muted-foreground"
                          : "text-primary"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Mobile: Action buttons below content */}
                    <div className="flex md:hidden flex-wrap items-center gap-2 pt-2">
                      {/* Primary actions for vault invites and owner assignments */}
                      {notification.type === "vault_invite" && !notification.read_at && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptVaultInvite(notification)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineVaultInvite(notification)}
                            disabled={isProcessing}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}

                      {notification.type === "vault_owner_assigned" && !notification.read_at && (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptOwnerAssignment(notification)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Accept & Join
                        </Button>
                      )}

                      {/* View action if action_url exists - only show for non-action notifications */}
                      {notification.action_url &&
                       notification.read_at &&
                       notification.type !== "vault_invite" &&
                       notification.type !== "vault_owner_assigned" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            router.push(notification.action_url!);
                          }}
                          title="Go to related page"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Mark as read/unread toggle */}
                      {notification.read_at ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsUnread(notification.id)}
                          title="Mark as unread"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      ) : (
                        notification.type !== "vault_invite" &&
                        notification.type !== "vault_owner_assigned" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <MailOpen className="h-4 w-4" />
                          </Button>
                        )
                      )}

                      {/* Delete button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop: Action buttons on the right */}
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                    {/* Primary actions for vault invites and owner assignments */}
                    {notification.type === "vault_invite" && !notification.read_at && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptVaultInvite(notification)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineVaultInvite(notification)}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </>
                    )}

                    {notification.type === "vault_owner_assigned" && !notification.read_at && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptOwnerAssignment(notification)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Accept & Join Vault
                      </Button>
                    )}

                    {/* View action if action_url exists - only show for non-action notifications */}
                    {notification.action_url &&
                     notification.read_at &&
                     notification.type !== "vault_invite" &&
                     notification.type !== "vault_owner_assigned" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          router.push(notification.action_url!);
                        }}
                        title="Go to related page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Mark as read/unread toggle */}
                    {notification.read_at ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsUnread(notification.id)}
                        title="Mark as unread"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    ) : (
                      notification.type !== "vault_invite" &&
                      notification.type !== "vault_owner_assigned" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <MailOpen className="h-4 w-4" />
                        </Button>
                      )
                    )}

                    {/* Delete button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
