/**
 * React hook for audit logging in client components
 * Provides helpers for logging agent and user actions
 */

import { useCallback } from 'react';
import { useOrganization } from '@/lib/context/organization-context';
import { createClient } from '@/lib/supabase/client';
import { writeAuditLog, redactSensitiveFields, type AuditLogEntry } from '@/lib/services/audit-log';

export function useAuditLog() {
  const { currentOrg } = useOrganization();
  const supabase = createClient();

  /**
   * Log an agent action
   */
  const logAgentAction = useCallback(
    async (
      action: string,
      resourceType: string,
      resourceId: string | null,
      beforeState: Record<string, any> | null,
      afterState: Record<string, any> | null,
      metadata?: Record<string, any>
    ): Promise<{ success: boolean; error: Error | null }> => {
      if (!currentOrg) {
        return { success: false, error: new Error('No organization context') };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('No authenticated user') };
      }

      const entry: AuditLogEntry = {
        actorId: user.id,
        actorType: 'agent',
        action,
        resourceType,
        resourceId,
        beforeState: redactSensitiveFields(beforeState),
        afterState: redactSensitiveFields(afterState),
        metadata,
        orgId: currentOrg.id,
        tenantId: currentOrg.id,
      };

      return writeAuditLog(entry);
    },
    [currentOrg, supabase]
  );

  /**
   * Log a user action
   */
  const logUserAction = useCallback(
    async (
      action: string,
      resourceType: string,
      resourceId: string | null,
      beforeState: Record<string, any> | null,
      afterState: Record<string, any> | null,
      metadata?: Record<string, any>
    ): Promise<{ success: boolean; error: Error | null }> => {
      if (!currentOrg) {
        return { success: false, error: new Error('No organization context') };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('No authenticated user') };
      }

      const entry: AuditLogEntry = {
        actorId: user.id,
        actorType: 'user',
        action,
        resourceType,
        resourceId,
        beforeState: redactSensitiveFields(beforeState),
        afterState: redactSensitiveFields(afterState),
        metadata,
        orgId: currentOrg.id,
        tenantId: currentOrg.id,
      };

      return writeAuditLog(entry);
    },
    [currentOrg, supabase]
  );

  /**
   * Log a system action
   */
  const logSystemAction = useCallback(
    async (
      action: string,
      resourceType: string,
      resourceId: string | null,
      beforeState: Record<string, any> | null,
      afterState: Record<string, any> | null,
      metadata?: Record<string, any>
    ): Promise<{ success: boolean; error: Error | null }> => {
      if (!currentOrg) {
        return { success: false, error: new Error('No organization context') };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('No authenticated user') };
      }

      const entry: AuditLogEntry = {
        actorId: user.id,
        actorType: 'system',
        action,
        resourceType,
        resourceId,
        beforeState: redactSensitiveFields(beforeState),
        afterState: redactSensitiveFields(afterState),
        metadata,
        orgId: currentOrg.id,
        tenantId: currentOrg.id,
      };

      return writeAuditLog(entry);
    },
    [currentOrg, supabase]
  );

  return {
    logAgentAction,
    logUserAction,
    logSystemAction,
  };
}
