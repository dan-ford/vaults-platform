import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPlanChangeAllowed } from '@/lib/vaults/guards';
import { seatsRemaining } from '@/lib/vaults/plan';
import type { VaultPlanTier } from '@/lib/config/plans';

/**
 * GET /api/vaults/[vaultId]/plan
 * Get plan details for a vault
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
      .select('id, name, plan_tier, seats_limit, members_count')
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

    return NextResponse.json({
      tier: vault.plan_tier,
      seatsLimit: vault.seats_limit,
      membersCount: vault.members_count,
      seatsRemaining: remaining,
    });
  } catch (error) {
    console.error('Error fetching vault plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/vaults/[vaultId]/plan
 * Update vault plan tier (admin only)
 */
export async function PATCH(
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

    // Check user is an admin or owner
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', params.vaultId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const newTier = body.tier as VaultPlanTier;

    if (!['Small', 'Medium', 'Enterprise'].includes(newTier)) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
    }

    // Get current vault state
    const { data: vault, error: vaultError } = await supabase
      .from('organizations')
      .select('id, name, plan_tier, seats_limit, members_count')
      .eq('id', params.vaultId)
      .single();

    if (vaultError || !vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    // Check if plan change is allowed (will throw if not)
    try {
      assertPlanChangeAllowed(vault.members_count, newTier);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : 'Plan change not allowed',
          currentMembers: vault.members_count,
          requestedTier: newTier,
        },
        { status: 409 }
      );
    }

    // Update plan tier (trigger will update seats_limit)
    const { data: updated, error: updateError } = await supabase
      .from('organizations')
      .update({ plan_tier: newTier })
      .eq('id', params.vaultId)
      .select('id, name, plan_tier, seats_limit, members_count')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Failed to update plan' },
        { status: 500 }
      );
    }

    const remaining = seatsRemaining(
      updated.members_count,
      updated.plan_tier as VaultPlanTier
    );

    return NextResponse.json({
      tier: updated.plan_tier,
      seatsLimit: updated.seats_limit,
      membersCount: updated.members_count,
      seatsRemaining: remaining,
    });
  } catch (error) {
    console.error('Error updating vault plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
