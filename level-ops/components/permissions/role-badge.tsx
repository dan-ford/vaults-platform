"use client";

import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Shield, ShieldCheck, Edit, Eye } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type OrgRole = Database["public"]["Enums"]["org_role"];

const ROLE_CONFIG: Record<OrgRole, {
  label: string;
  icon: typeof Shield;
  color: string;
  description: string;
}> = {
  OWNER: {
    label: "Owner",
    icon: ShieldCheck,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Full control",
  },
  ADMIN: {
    label: "Admin",
    icon: Shield,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Full control",
  },
  EDITOR: {
    label: "Editor",
    icon: Edit,
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Can create and edit",
  },
  VIEWER: {
    label: "Viewer",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    description: "Read-only access",
  },
};

export function RoleBadge({ showDescription = false }: { showDescription?: boolean }) {
  const { role } = usePermissions();

  if (!role) return null;

  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{config.description}</span>
      )}
    </div>
  );
}
