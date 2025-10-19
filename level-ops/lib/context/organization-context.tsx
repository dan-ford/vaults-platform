"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type OrgMembership = Database["public"]["Tables"]["org_memberships"]["Row"];
type OrgRole = Database["public"]["Enums"]["org_role"];

interface OrganizationWithRole extends Organization {
  role: OrgRole;
}

interface OrganizationContextType {
  /** Currently selected organization */
  currentOrg: OrganizationWithRole | null;
  /** All organizations the user is a member of */
  organizations: OrganizationWithRole[];
  /** Switch to a different organization */
  setCurrentOrg: (orgId: string) => void;
  /** Refresh organizations list (e.g., after accepting an invitation) */
  refreshOrganizations: () => Promise<void>;
  /** Loading state */
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within OrganizationProvider"
    );
  }
  return context;
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrg, setCurrentOrgState] =
    useState<OrganizationWithRole | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Extract loadOrganizations so it can be called externally
  const loadOrganizations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get all organizations the user is a member of
      const { data: memberships, error: membershipsError } = await supabase
        .from("org_memberships")
        .select(
          `
          org_id,
          role,
          organizations (
            id,
            name,
            slug,
            logo_url,
            brand_color,
            domain,
            settings,
            created_at,
            updated_at
          )
        `
        )
        .eq("user_id", user.id);

      if (membershipsError) {
        console.error("Error loading organizations:", membershipsError);
        setIsLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        setIsLoading(false);
        return;
      }

      // Transform memberships into OrganizationWithRole
      const orgsWithRoles: OrganizationWithRole[] = memberships
        .map((m: any) => {
          const org = m.organizations;
          if (!org) return null;
          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo_url: org.logo_url,
            brand_color: org.brand_color,
            domain: org.domain,
            settings: org.settings,
            created_at: org.created_at,
            updated_at: org.updated_at,
            role: m.role,
          };
        })
        .filter((org: OrganizationWithRole | null): org is OrganizationWithRole => org !== null);

      setOrganizations(orgsWithRoles);

      // Check if current domain matches an organization domain (host-based resolution)
      const currentHost = window.location.host;
      const domainMatchedOrg = orgsWithRoles.find(
        (org) => org.domain === currentHost
      );

      // Priority: domain-matched org > localStorage > first org
      let defaultOrg: OrganizationWithRole | undefined;
      if (domainMatchedOrg) {
        // Domain takes priority - auto-select organization based on domain
        defaultOrg = domainMatchedOrg;
        localStorage.setItem("currentOrgId", domainMatchedOrg.id);
      } else {
        // Fallback to localStorage or first org
        const storedOrgId = localStorage.getItem("currentOrgId");
        defaultOrg =
          orgsWithRoles.find((org) => org.id === storedOrgId) ||
          orgsWithRoles[0];
      }

      if (defaultOrg) {
        setCurrentOrgState(defaultOrg);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user's organizations on mount
  useEffect(() => {
    loadOrganizations();
  }, [supabase]);

  // Subscribe to organization changes
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel("org-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organizations",
          filter: `id=eq.${currentOrg.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['organizations']['Row']>) => {
          if (payload.eventType === "UPDATE") {
            const updatedOrg = payload.new as Organization;

            // Update currentOrg, preserving the role
            setCurrentOrgState((prev) =>
              prev
                ? { ...prev, ...updatedOrg, role: prev.role }
                : null
            );

            // Also update the organizations array so it stays in sync
            setOrganizations((prev) =>
              prev.map((org) =>
                org.id === updatedOrg.id
                  ? { ...org, ...updatedOrg, role: org.role }
                  : org
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  const setCurrentOrg = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrgState(org);
      localStorage.setItem("currentOrgId", orgId);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        organizations,
        setCurrentOrg,
        refreshOrganizations: loadOrganizations,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}
