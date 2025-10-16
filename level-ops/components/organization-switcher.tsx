"use client";

import { useState } from "react";
import { useOrganization } from "@/lib/context/organization-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Building2 } from "lucide-react";
import { terms } from "@/lib/config/branding";

export function OrganizationSwitcher() {
  const { currentOrg, organizations, setCurrentOrg, isLoading } =
    useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading...
      </div>
    );
  }

  if (!currentOrg) {
    return null;
  }

  // Filter out default tenant from display
  const displayOrgs = organizations.filter(org => org.slug !== 'default');
  const displayCurrentOrg = displayOrgs.find(org => org.id === currentOrg.id) || displayOrgs[0];

  // If only default tenant exists, don't show switcher
  if (!displayCurrentOrg) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={`Current ${terms.vaultLower}: ${displayCurrentOrg.name}`}
        title={displayCurrentOrg.name}
      >
        <Building2 className="h-[25px] w-[25px]" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 w-auto min-w-[200px] rounded-md border bg-popover p-1 shadow-md z-50">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
              Your {terms.vaultsLower}
            </div>

            {displayOrgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setCurrentOrg(org.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Badge
                  variant={
                    org.role === "OWNER"
                      ? "default"
                      : org.role === "ADMIN"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-xs px-1.5 py-0 flex-shrink-0"
                >
                  {org.role}
                </Badge>
                <span className="font-medium flex-1 text-left">{org.name}</span>
                {org.id === displayCurrentOrg.id && (
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}

            {displayOrgs.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No {terms.vaultsLower} found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
