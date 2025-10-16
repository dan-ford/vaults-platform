/**
 * Audit logging service for tracking all agent and user actions
 * Writes to activity_log table with before/after state snapshots
 */

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert'];

export interface AuditLogEntry {
  actorId: string;
  actorType: 'user' | 'agent' | 'system';
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  orgId: string;
  tenantId: string;
}

/**
 * Write an audit log entry
 *
 * @param entry - Audit log entry details
 * @returns Success status and any error
 */
export async function writeAuditLog(
  entry: AuditLogEntry
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createClient();

  try {
    const logEntry: ActivityLogInsert = {
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      before_state: entry.beforeState || null,
      after_state: entry.afterState || null,
      metadata: entry.metadata || null,
      org_id: entry.orgId,
      tenant_id: null, // Using organizations, not tenants
    };

    const { error } = await supabase
      .from('activity_log')
      .insert([logEntry] as any);

    if (error) {
      console.error('Audit log write error:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in writeAuditLog:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Write a batch of audit log entries
 * Useful for bulk operations
 *
 * @param entries - Array of audit log entries
 * @returns Success status and any error
 */
export async function writeAuditLogBatch(
  entries: AuditLogEntry[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createClient();

  try {
    const logEntries: ActivityLogInsert[] = entries.map(entry => ({
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      before_state: entry.beforeState || null,
      after_state: entry.afterState || null,
      metadata: entry.metadata || null,
      org_id: entry.orgId,
      tenant_id: null, // Using organizations, not tenants
    }));

    const { error } = await supabase
      .from('activity_log')
      .insert(logEntries as any);

    if (error) {
      console.error('Audit log batch write error:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in writeAuditLogBatch:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Fetch audit logs for a specific resource
 *
 * @param resourceType - Type of resource
 * @param resourceId - Resource UUID
 * @param orgId - Organization UUID for RLS
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function fetchAuditLogs(
  resourceType: string,
  resourceId: string,
  orgId: string,
  limit: number = 50
): Promise<{
  data: Array<{
    id: string;
    actor_id: string;
    actor_type: string;
    action: string;
    before_state: any;
    after_state: any;
    metadata: any;
    created_at: string;
  }> | null;
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, actor_id, actor_type, action, before_state, after_state, metadata, created_at')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Audit log fetch error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in fetchAuditLogs:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Helper to redact sensitive fields from state snapshots
 * Use this before logging to avoid storing secrets
 *
 * @param state - State object to redact
 * @param fieldsToRedact - Array of field names to redact
 * @returns Redacted state object
 */
export function redactSensitiveFields(
  state: Record<string, any> | null,
  fieldsToRedact: string[] = ['password', 'token', 'secret', 'api_key', 'apiKey']
): Record<string, any> | null {
  if (!state) return null;

  const redacted = { ...state };

  for (const field of fieldsToRedact) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }

  return redacted;
}
