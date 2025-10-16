import { useOrganization } from "@/lib/context/organization-context";
import type { Database } from "@/lib/supabase/database.types";

type OrgRole = Database["public"]["Enums"]["org_role"];

export function usePermissions() {
  const { currentOrg } = useOrganization();

  const role: OrgRole | null = currentOrg?.role || null;

  // Permission check functions
  const can = {
    // Admin-only actions
    manageSettings: (): boolean => role === "OWNER" || role === "ADMIN",
    manageMembers: (): boolean => role === "OWNER" || role === "ADMIN",
    deleteAny: (): boolean => role === "OWNER" || role === "ADMIN",

    // Edit actions (OWNER, ADMIN, EDITOR)
    create: (): boolean => role === "OWNER" || role === "ADMIN" || role === "EDITOR",
    edit: (): boolean => role === "OWNER" || role === "ADMIN" || role === "EDITOR",
    update: (): boolean => role === "OWNER" || role === "ADMIN" || role === "EDITOR",

    // Read actions (all roles)
    view: (): boolean => role !== null,
    read: (): boolean => role !== null,
  };

  // Helper to check specific permission
  const hasPermission = (action: "create" | "edit" | "delete" | "admin" | "view"): boolean => {
    switch (action) {
      case "create":
      case "edit":
        return can.edit();
      case "delete":
        return can.deleteAny();
      case "admin":
        return can.manageSettings();
      case "view":
        return can.view();
      default:
        return false;
    }
  };

  return {
    role,
    can,
    hasPermission,
    isOwner: role === "OWNER",
    isAdmin: role === "ADMIN",
    isEditor: role === "EDITOR",
    isViewer: role === "VIEWER",
    canEdit: can.edit(),
    canDelete: can.deleteAny(),
    canManage: can.manageSettings(),
  };
}
