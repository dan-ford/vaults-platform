"use client";

import { useOrganization } from "@/lib/context/organization-context";

/**
 * Hook to check if a feature flag is enabled for the current organization
 *
 * @param flag - The feature flag name (e.g., 'executive_layer_v2')
 * @returns boolean indicating if the feature is enabled
 *
 * @example
 * ```tsx
 * const executiveLayerEnabled = useFeatureFlag('executive_layer_v2');
 *
 * return executiveLayerEnabled ? (
 *   <Link href="/plan">Plan</Link>
 * ) : (
 *   <Link href="/milestones">Milestones</Link>
 * );
 * ```
 */
export function useFeatureFlag(flag: string): boolean {
  const { currentOrg } = useOrganization();

  if (!currentOrg?.settings?.modules) {
    return false;
  }

  // Type-safe access to module feature flags
  const modules = currentOrg.settings.modules as Record<string, boolean>;
  return modules[flag] === true;
}

/**
 * Hook to get all enabled feature flags for the current organization
 *
 * @returns Object with all feature flags and their states
 *
 * @example
 * ```tsx
 * const flags = useFeatureFlags();
 * console.log(flags.executive_layer_v2); // true or false
 * ```
 */
export function useFeatureFlags(): Record<string, boolean> {
  const { currentOrg } = useOrganization();

  if (!currentOrg?.settings?.modules) {
    return {};
  }

  return (currentOrg.settings.modules as Record<string, boolean>) || {};
}
