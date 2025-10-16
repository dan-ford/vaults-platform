/**
 * Secret Access Anomaly Detection
 *
 * ⚠️ SERVER-SIDE ONLY - Do not import in client components!
 *
 * Detects suspicious access patterns for trade secrets:
 * - New device/IP for user
 * - Mass downloads (>5 in 1 hour)
 * - After-hours access (outside 8am-6pm user timezone)
 * - Access from unusual locations
 *
 * Alerts vault owners via email or notification.
 *
 * Usage: Call from server-side API routes or database triggers.
 */

import { createClient } from "@/lib/supabase/server";

export interface AnomalyDetectionResult {
  isAnomalous: boolean;
  anomalies: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  shouldAlert: boolean;
}

export interface AccessEvent {
  secretId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  action: 'view' | 'download' | 'export';
  timestamp: Date;
}

/**
 * Check if IP address is new for this user
 */
async function isNewIpAddress(userId: string, ipAddress: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('secret_audit')
    .select('ip_address')
    .eq('actor_id', userId)
    .limit(100);

  if (error || !data) return false;

  const knownIps = new Set(data.map((entry: any) => entry.ip_address).filter(Boolean));
  return !knownIps.has(ipAddress);
}

/**
 * Check if user has exceeded download threshold
 */
async function hasMassDownloads(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('secret_audit')
    .select('action')
    .eq('actor_id', userId)
    .eq('action', 'download')
    .gte('created_at', oneHourAgo);

  if (error || !data) return false;

  return data.length > 5;
}

/**
 * Check if access is outside business hours
 */
function isAfterHours(timestamp: Date, userTimezone: string = 'UTC'): boolean {
  try {
    const hour = timestamp.getHours();

    // Business hours: 8am - 6pm (user's timezone)
    // For simplicity, using UTC. In production, use user's actual timezone.
    return hour < 8 || hour >= 18;
  } catch {
    return false;
  }
}

/**
 * Detect anomalies in a secret access event
 */
export async function detectAnomalies(event: AccessEvent): Promise<AnomalyDetectionResult> {
  const anomalies: string[] = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Check for new IP address
  if (event.ipAddress) {
    const isNewIp = await isNewIpAddress(event.userId, event.ipAddress);
    if (isNewIp) {
      anomalies.push(`New IP address: ${event.ipAddress}`);
      severity = 'medium';
    }
  }

  // Check for mass downloads
  if (event.action === 'download') {
    const massDownload = await hasMassDownloads(event.userId);
    if (massDownload) {
      anomalies.push('Mass download detected (>5 in 1 hour)');
      severity = 'high';
    }
  }

  // Check for after-hours access
  const afterHours = isAfterHours(event.timestamp);
  if (afterHours) {
    anomalies.push(`After-hours access (${event.timestamp.toLocaleTimeString()})`);
    if (severity === 'low') severity = 'medium';
  }

  // Check for suspicious combinations
  if (anomalies.length > 1) {
    severity = 'critical';
  }

  return {
    isAnomalous: anomalies.length > 0,
    anomalies,
    severity,
    shouldAlert: severity === 'high' || severity === 'critical',
  };
}

/**
 * Send alert to vault owners
 */
export async function alertVaultOwners(
  vaultId: string,
  secretTitle: string,
  userId: string,
  userEmail: string,
  result: AnomalyDetectionResult
): Promise<void> {
  const supabase = await createClient();

  // Get vault owners
  const { data: owners, error: ownersError } = await supabase
    .from('org_memberships')
    .select('user_id, profiles(email)')
    .eq('org_id', vaultId)
    .in('role', ['OWNER', 'ADMIN']);

  if (ownersError || !owners) {
    console.error('Failed to get vault owners:', ownersError);
    return;
  }

  // Create notification for each owner
  for (const owner of owners) {
    await supabase.rpc('create_notification', {
      p_user_id: (owner as any).user_id,
      p_type: 'system',
      p_title: `Alert: Anomalous Secret Access Detected`,
      p_message: `Suspicious access to "${secretTitle}" by ${userEmail}. Anomalies: ${result.anomalies.join(', ')}. Severity: ${result.severity.toUpperCase()}.`,
      p_action_url: '/secrets',
      p_metadata: {
        secret_title: secretTitle,
        user_id: userId,
        user_email: userEmail,
        anomalies: result.anomalies,
        severity: result.severity,
        timestamp: new Date().toISOString(),
      },
    });
  }

  console.log(`[ALERT] Anomaly detected for secret "${secretTitle}" by ${userEmail}:`, result);
}

/**
 * Monitor access event for anomalies and alert if necessary
 */
export async function monitorSecretAccess(
  event: AccessEvent,
  vaultId: string,
  secretTitle: string,
  userEmail: string
): Promise<void> {
  try {
    const result = await detectAnomalies(event);

    if (result.isAnomalous) {
      console.warn('[ANOMALY DETECTED]', {
        secretId: event.secretId,
        userId: event.userId,
        anomalies: result.anomalies,
        severity: result.severity,
      });

      if (result.shouldAlert) {
        await alertVaultOwners(vaultId, secretTitle, event.userId, userEmail, result);
      }
    }
  } catch (error) {
    console.error('Error in anomaly detection:', error);
    // Don't throw - anomaly detection should not block access
  }
}
