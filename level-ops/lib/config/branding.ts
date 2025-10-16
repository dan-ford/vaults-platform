/**
 * Centralized branding configuration for VAULTS
 * All product naming and terminology should reference this file
 */

export const APP_NAME = 'VAULTS';

export const terms = {
  vault: 'Vault',
  vaultPlural: 'Vaults',
  portfolio: 'Portfolio',
  vaultOwner: 'Vault Owner',
  founderSeat: 'Founder seat',
  investorSeat: 'Investor seat',
  // Lowercase variants for use in sentences
  vaultLower: 'vault',
  vaultsLower: 'vaults',
  portfolioLower: 'portfolio',
} as const;

// Environment variable override support
export const getAppName = () => {
  if (typeof window !== 'undefined') {
    return (window as any).ENV?.NEXT_PUBLIC_APP_NAME || APP_NAME;
  }
  return process.env.NEXT_PUBLIC_APP_NAME || APP_NAME;
};
