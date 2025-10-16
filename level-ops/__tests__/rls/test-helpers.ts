/**
 * RLS Test Helpers
 *
 * Utilities for testing Row-Level Security policies in Supabase.
 * These helpers create test users, organizations, and verify data isolation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

interface TestOrg {
  id: string;
  slug: string;
  name: string;
}

/**
 * Create a test user for RLS testing
 */
export async function createTestUser(email: string, password: string = 'TestPassword123!'): Promise<TestUser> {
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create user with admin API
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Sign in as the user to get a client with their session
  const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return {
    id: authData.user.id,
    email,
    client: userClient,
  };
}

/**
 * Create a test organization
 */
export async function createTestOrg(name: string, slug: string): Promise<TestOrg> {
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await serviceClient
    .from('organizations')
    .insert({
      name,
      slug,
      domain: `${slug}.test.vaults.app`,
      brand_color: '#3b82f6',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test org: ${error?.message}`);
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
  };
}

/**
 * Add user to organization with specified role
 */
export async function addOrgMember(
  orgId: string,
  userId: string,
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'
): Promise<void> {
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await serviceClient
    .from('org_memberships')
    .insert({
      org_id: orgId,
      user_id: userId,
      role,
    });

  if (error) {
    throw new Error(`Failed to add org member: ${error.message}`);
  }
}

/**
 * Clean up test data
 */
export async function cleanupTestData(userIds: string[], orgIds: string[]): Promise<void> {
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Delete org memberships first (foreign key constraint)
  if (orgIds.length > 0) {
    await serviceClient.from('org_memberships').delete().in('org_id', orgIds);
  }

  // Delete organizations
  if (orgIds.length > 0) {
    await serviceClient.from('organizations').delete().in('id', orgIds);
  }

  // Delete users
  for (const userId of userIds) {
    await serviceClient.auth.admin.deleteUser(userId);
  }
}

/**
 * Test that a query returns no results (RLS blocking access)
 */
export async function expectNoAccess(
  client: SupabaseClient,
  table: string,
  orgId: string
): Promise<void> {
  const { data, error } = await client
    .from(table)
    .select('*')
    .eq('org_id', orgId);

  // Should either return empty array or error
  if (error) {
    // RLS can cause errors, which is valid
    return;
  }

  if (data && data.length > 0) {
    throw new Error(`Expected no access to ${table} in org ${orgId}, but got ${data.length} rows`);
  }
}

/**
 * Test that a query returns expected results (RLS allowing access)
 */
export async function expectAccess(
  client: SupabaseClient,
  table: string,
  orgId: string,
  expectedCount?: number
): Promise<void> {
  const { data, error } = await client
    .from(table)
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    throw new Error(`Expected access to ${table} in org ${orgId}, but got error: ${error.message}`);
  }

  if (expectedCount !== undefined && data.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} rows in ${table}, but got ${data.length}`);
  }
}
