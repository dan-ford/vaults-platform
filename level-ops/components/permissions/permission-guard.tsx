"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

interface PermissionGuardProps {
  children: ReactNode;
  require: "create" | "edit" | "delete" | "admin" | "view";
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  children,
  require,
  fallback,
  showMessage = false
}: PermissionGuardProps) {
  const { hasPermission, role } = usePermissions();

  if (!hasPermission(require)) {
    if (showMessage) {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to {require} in this vault.
            Your current role is: {role || "None"}
          </AlertDescription>
        </Alert>
      );
    }
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}
