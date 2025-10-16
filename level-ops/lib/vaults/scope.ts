/**
 * Vault scoping utilities
 * Provides compatibility layer during migration from tenant_id to vault_id
 */

/**
 * Get vault_id with fallback to tenant_id for backward compatibility
 * Use this helper during the transition period
 */
export function getVaultId(row: { vault_id?: string; tenant_id?: string } | null | undefined): string | undefined {
  if (!row) return undefined;
  return row.vault_id ?? row.tenant_id;
}

/**
 * Get org_id with fallback to tenant_id for backward compatibility
 * Use this during the transition to the new vault model
 */
export function getOrgId(row: { org_id?: string; tenant_id?: string } | null | undefined): string | undefined {
  if (!row) return undefined;
  return row.org_id ?? row.tenant_id;
}

/**
 * Require an active vault ID or throw
 * Use this in server actions that must have a vault context
 */
export function requireActiveVaultId(context: { vaultId?: string | null }): string {
  if (!context.vaultId) {
    throw new Error('Active Vault not set. Please select or create a Vault.');
  }
  return context.vaultId;
}

/**
 * Check if a row belongs to the active vault
 */
export function isInActiveVault(row: { vault_id?: string; tenant_id?: string; org_id?: string } | null, activeVaultId: string): boolean {
  if (!row) return false;
  const vaultId = getVaultId(row) ?? getOrgId(row);
  return vaultId === activeVaultId;
}
