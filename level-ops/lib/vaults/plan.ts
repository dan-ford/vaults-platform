/**
 * Vault plan helpers
 * Functions to check seat limits and plan capacities
 */

import { PLAN_SEATS, type VaultPlanTier } from '@/lib/config/plans';

/**
 * Get the seat limit for a given plan tier
 */
export function seatsForPlan(tier: VaultPlanTier): number {
  return PLAN_SEATS[tier];
}

/**
 * Check if adding another member would exceed the seat limit
 * @param currentMembers Current number of members in the vault
 * @param tier Plan tier to check against
 * @returns true if adding another member would exceed the limit
 */
export function willExceedSeats(
  currentMembers: number,
  tier: VaultPlanTier
): boolean {
  return currentMembers >= PLAN_SEATS[tier];
}

/**
 * Calculate remaining seats for a plan
 * @param currentMembers Current number of members
 * @param tier Plan tier
 * @returns Number of seats remaining (0 or positive)
 */
export function seatsRemaining(
  currentMembers: number,
  tier: VaultPlanTier
): number {
  const limit = PLAN_SEATS[tier];
  return Math.max(0, limit - currentMembers);
}
