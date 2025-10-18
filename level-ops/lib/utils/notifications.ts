import { createClient } from "@/lib/supabase/client";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl,
  metadata = {},
}: CreateNotificationParams): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      action_url: actionUrl,
      metadata,
    });

    if (error) {
      console.error("Error creating notification:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception creating notification:", error);
    return { success: false, error };
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotifications(
  notifications: CreateNotificationParams[]
): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();

  try {
    const notificationRecords = notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      action_url: n.actionUrl,
      metadata: n.metadata || {},
    }));

    const { error } = await supabase.from("notifications").insert(notificationRecords);

    if (error) {
      console.error("Error creating notifications:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception creating notifications:", error);
    return { success: false, error };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception marking all notifications as read:", error);
    return false;
  }
}
