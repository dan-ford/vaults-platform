import type { VaultProfile, VaultAddress } from '@/lib/validators/profile';

export interface ProfileResponse {
  profile: VaultProfile | null;
  addresses: VaultAddress[];
  canEdit: boolean;
}

export async function getVaultProfile(vaultId: string): Promise<ProfileResponse> {
  const response = await fetch(`/api/vaults/${vaultId}/profile`);
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
}

export async function updateVaultProfile(
  vaultId: string,
  profile: VaultProfile
): Promise<{ profile: VaultProfile }> {
  const response = await fetch(`/api/vaults/${vaultId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }
  return response.json();
}

export async function createAddress(
  vaultId: string,
  address: VaultAddress
): Promise<{ address: VaultAddress }> {
  const response = await fetch(`/api/vaults/${vaultId}/profile/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(address),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create address');
  }
  return response.json();
}

export async function updateAddress(
  vaultId: string,
  addressId: string,
  address: VaultAddress
): Promise<{ address: VaultAddress }> {
  const response = await fetch(
    `/api/vaults/${vaultId}/profile/addresses/${addressId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(address),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update address');
  }
  return response.json();
}

export async function deleteAddress(
  vaultId: string,
  addressId: string
): Promise<void> {
  const response = await fetch(
    `/api/vaults/${vaultId}/profile/addresses/${addressId}`,
    {
      method: 'DELETE',
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete address');
  }
}
