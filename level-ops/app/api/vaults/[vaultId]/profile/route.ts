import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { vaultProfileSchema } from '@/lib/validators/profile';

/**
 * GET /api/vaults/[vaultId]/profile
 * Returns vault profile with addresses
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

    // Check user is a member of this vault
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', params.vaultId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('vault_profiles')
      .select('*')
      .eq('vault_id', params.vaultId)
      .single();

    // Get addresses
    const { data: addresses, error: addressesError } = await supabase
      .from('vault_addresses')
      .select('*')
      .eq('vault_id', params.vaultId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = not found, which is okay for first time
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    if (addressesError) {
      console.error('Error fetching addresses:', addressesError);
    }

    return NextResponse.json({
      profile: profile || null,
      addresses: addresses || [],
      canEdit: ['OWNER', 'ADMIN'].includes(membership.role),
    });
  } catch (error) {
    console.error('Error in GET /api/vaults/[vaultId]/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vaults/[vaultId]/profile
 * Upsert vault profile (admin only)
 */
export async function PUT(
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

    // Check user is admin/owner
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

    // Parse and validate body
    const body = await request.json();
    const validated = vaultProfileSchema.parse(body);

    // Upsert profile
    const { data: profile, error: upsertError } = await supabase
      .from('vault_profiles')
      .upsert(
        {
          vault_id: params.vaultId,
          ...validated,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'vault_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting profile:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_log').insert({
      entity_type: 'vault_profile',
      entity_id: profile.id,
      action: 'update',
      vault_id: params.vaultId,
      actor_id: user.id,
      metadata: {
        changed_fields: Object.keys(validated),
      },
    } as any);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in PUT /api/vaults/[vaultId]/profile:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
