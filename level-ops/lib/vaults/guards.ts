/**
 * Vault plan guards
 * Validation functions that throw errors when plan constraints are violated
 */

import { seatsForPlan } from './plan';
import type { VaultPlanTier } from '@/lib/config/plans';

/**
 * Assert that a plan change is allowed based on current member count
 * @param currentMembers Number of members currently in the vault
 * @param newTier Target plan tier
 * @returns The seat limit for the new tier if allowed
 * @throws Error if current members exceed the new tier's seat limit
 */
export function assertPlanChangeAllowed(
  currentMembers: number,
  newTier: VaultPlanTier
): number {
  const limit = seatsForPlan(newTier);
  if (currentMembers > limit) {
    throw new Error(
      `Cannot downgrade: ${currentMembers} members > ${limit} seat limit.`
    );
  }
  return limit;
}

/**
 * Assert that a new member can be added to the vault
 * @param currentMembers Number of members currently in the vault
 * @param tier Current plan tier
 * @throws Error if the vault is at capacity
 */
export function assertCanAddMember(
  currentMembers: number,
  tier: VaultPlanTier
): void {
  const limit = seatsForPlan(tier);
  if (currentMembers >= limit) {
    throw new Error(
      `Seat limit reached. Upgrade plan or remove members. Current: ${currentMembers}/${limit}`
    );
  }
}
