/**
 * Vault plan tiers and seat limits
 * These values are centralized for easy adjustment
 */

export type VaultPlanTier = 'Small' | 'Medium' | 'Enterprise';

/**
 * Maximum seats allowed per plan tier
 */
export const PLAN_SEATS: Record<VaultPlanTier, number> = {
  Small: 10,
  Medium: 25,
  Enterprise: 75,
};

/**
 * Display labels and notes for each plan tier
 */
export const PLAN_DISPLAY: Record<
  VaultPlanTier,
  { label: string; note?: string }
> = {
  Small: { label: 'Small', note: 'Up to 10 members' },
  Medium: { label: 'Medium', note: 'Up to 25 members' },
  Enterprise: { label: 'Enterprise', note: 'Up to 75 members' },
};

/**
 * Alternate plan names (for A/B testing, not shown in UI)
 */
export const PLAN_ALIASES: Record<string, VaultPlanTier> = {
  Solo: 'Small',
  Portfolio: 'Medium',
  Institution: 'Enterprise',
};
