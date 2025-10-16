/**
 * Billing abstraction layer (stub implementation)
 * This will be replaced with actual payment provider integration
 */

export type VaultTier = 'Basic' | 'Premium' | 'Ultimate';

export interface VaultPlan {
  tier: VaultTier;
  founderSeats: number;
  investorSeats: number;
}

const PLAN_LIMITS: Record<VaultTier, { founderSeats: number; investorSeats: number }> = {
  Basic: { founderSeats: 2, investorSeats: 2 },
  Premium: { founderSeats: 5, investorSeats: 5 },
  Ultimate: { founderSeats: 50, investorSeats: 50 },
};

/**
 * Get the plan details for a vault
 */
export async function getVaultPlan(vaultId: string): Promise<VaultPlan> {
  // Dynamically import supabase to avoid circular dependencies
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vault_subscriptions')
    .select('tier, founder_seats, investor_seats')
    .eq('vault_id', vaultId)
    .single();

  if (error || !data) {
    // Return default Basic plan if no subscription found
    return {
      tier: 'Basic',
      ...PLAN_LIMITS.Basic,
    };
  }

  return {
    tier: data.tier as VaultTier,
    founderSeats: data.founder_seats,
    investorSeats: data.investor_seats,
  };
}

/**
 * Check if a vault can invite more users of a specific role
 */
export async function canInvite(
  vaultId: string,
  role: 'founder' | 'investor'
): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  // Get the vault's plan
  const plan = await getVaultPlan(vaultId);

  // Count current members by role (simplified - in production would map org_role to founder/investor)
  const { count, error } = await supabase
    .from('org_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', vaultId);

  if (error || count === null) {
    // If we can't determine, allow the invite (fail open during trial)
    return true;
  }

  // For now, use simple logic: allow if total members < sum of seats
  const totalSeats = plan.founderSeats + plan.investorSeats;
  return count < totalSeats;
}

/**
 * Start a trial period for a vault
 * TODO: Implement trial record creation
 */
export async function startTrial(vaultId: string): Promise<void> {
  // Stub: no-op during development
  // In production, this would create a trial record in vault_subscriptions
  // with an expiry date (e.g., 14 days from now)
  console.log(`[Billing Stub] Starting trial for vault ${vaultId}`);
}

/**
 * Get the current seat usage for a vault
 */
export async function getVaultSeatUsage(
  vaultId: string
): Promise<{ founders: number; investors: number }> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('org_memberships')
    .select('role')
    .eq('org_id', vaultId);

  if (error || !data) {
    return { founders: 0, investors: 0 };
  }

  // Simplified mapping: OWNER/ADMIN = founders, EDITOR/VIEWER = investors
  const founders = data.filter((m: any) => m.role === 'OWNER' || m.role === 'ADMIN').length;
  const investors = data.filter((m: any) => m.role === 'EDITOR' || m.role === 'VIEWER').length;

  return { founders, investors };
}
