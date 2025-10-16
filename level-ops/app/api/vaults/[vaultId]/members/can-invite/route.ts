import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { seatsRemaining } from '@/lib/vaults/plan';
import type { VaultPlanTier } from '@/lib/config/plans';

/**
 * GET /api/vaults/[vaultId]/members/can-invite
 * Check if the vault can accept new members
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vaultId: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vault with plan info
    const { data: vault, error: vaultError } = await supabase
      .from('organizations')
      .select('id, plan_tier, seats_limit, members_count')
      .eq('id', params.vaultId)
      .single();

    if (vaultError || !vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    // Check user is a member (RLS will enforce this at DB level too)
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', params.vaultId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const remaining = seatsRemaining(
      vault.members_count,
      vault.plan_tier as VaultPlanTier
    );
    const canInvite = remaining > 0;

    return NextResponse.json({
      canInvite,
      seatsRemaining: remaining,
      seatsLimit: vault.seats_limit,
      membersCount: vault.members_count,
      planTier: vault.plan_tier,
    });
  } catch (error) {
    console.error('Error checking can-invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
