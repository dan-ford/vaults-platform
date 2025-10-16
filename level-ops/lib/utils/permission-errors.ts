import type { Database } from "@/lib/supabase/database.types";

type OrgRole = Database["public"]["Enums"]["org_role"];

interface PermissionErrorOptions {
  action: "create" | "edit" | "update" | "delete";
  resource: string;
  currentRole: OrgRole | null;
  requiredRoles?: OrgRole[];
}

/**
 * Generate a consistent, user-friendly permission error message
 */
export function getPermissionError({
  action,
  resource,
  currentRole,
  requiredRoles = ["OWNER", "ADMIN", "EDITOR"],
}: PermissionErrorOptions): string {
  const roleDisplay = currentRole || "None";
  const requiredDisplay = requiredRoles.join(", ");

  const actionVerbs: Record<string, string> = {
    create: "create",
    edit: "edit",
    update: "edit",
    delete: "delete",
  };

  const verb = actionVerbs[action] || action;

  return `Permission denied: You need ${requiredDisplay} role to ${verb} ${resource}. Your current role is: ${roleDisplay}. Please contact an Admin or Owner to request the necessary permissions.`;
}

/**
 * Generate a permission error for delete operations (OWNER/ADMIN only)
 */
export function getDeletePermissionError(
  resource: string,
  currentRole: OrgRole | null
): string {
  return getPermissionError({
    action: "delete",
    resource,
    currentRole,
    requiredRoles: ["OWNER", "ADMIN"],
  });
}

/**
 * Generate a permission error for edit operations (OWNER/ADMIN/EDITOR)
 */
export function getEditPermissionError(
  resource: string,
  currentRole: OrgRole | null
): string {
  return getPermissionError({
    action: "edit",
    resource,
    currentRole,
    requiredRoles: ["OWNER", "ADMIN", "EDITOR"],
  });
}

/**
 * Generate a permission error for create operations (OWNER/ADMIN/EDITOR)
 */
export function getCreatePermissionError(
  resource: string,
  currentRole: OrgRole | null
): string {
  return getPermissionError({
    action: "create",
    resource,
    currentRole,
    requiredRoles: ["OWNER", "ADMIN", "EDITOR"],
  });
}
