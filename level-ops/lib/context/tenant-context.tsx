"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface TenantContextType {
  tenantId: string | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  isLoading: true,
});

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadTenant() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get the user's tenant membership
        const { data: membership } = await supabase
          .from("tenant_members")
          .select("tenant_id")
          .eq("user_id", user.id)
          .single();

        if (membership) {
          setTenantId((membership as { tenant_id: string }).tenant_id);
        }
      } catch (error) {
        console.error("Error loading tenant:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTenant();
  }, [supabase]);

  return (
    <TenantContext.Provider value={{ tenantId, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}
