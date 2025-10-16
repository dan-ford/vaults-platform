import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { addressSchema } from '@/lib/validators/profile';

/**
 * POST /api/vaults/[vaultId]/profile/addresses
 * Create a new address
 */
export async function POST(
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
    const validated = addressSchema.parse(body);

    // If this is primary, unset other primary addresses
    if (validated.is_primary) {
      await supabase
        .from('vault_addresses')
        .update({ is_primary: false })
        .eq('vault_id', params.vaultId);
    }

    // Insert address
    const { data: address, error: insertError } = await supabase
      .from('vault_addresses')
      .insert({
        vault_id: params.vaultId,
        ...validated,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting address:', insertError);
      return NextResponse.json(
        { error: 'Failed to create address' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_log').insert({
      entity_type: 'vault_address',
      entity_id: address.id,
      action: 'create',
      vault_id: params.vaultId,
      actor_id: user.id,
    } as any);

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/vaults/[vaultId]/profile/addresses:', error);
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
