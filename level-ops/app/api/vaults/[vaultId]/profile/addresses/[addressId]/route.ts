import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { addressSchema } from '@/lib/validators/profile';

/**
 * PUT /api/vaults/[vaultId]/profile/addresses/[addressId]
 * Update an address
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ vaultId: string; addressId: string }> }
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
        .eq('vault_id', params.vaultId)
        .neq('id', params.addressId);
    }

    // Update address
    const { data: address, error: updateError } = await supabase
      .from('vault_addresses')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.addressId)
      .eq('vault_id', params.vaultId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating address:', updateError);
      return NextResponse.json(
        { error: 'Failed to update address' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_log').insert({
      entity_type: 'vault_address',
      entity_id: address.id,
      action: 'update',
      vault_id: params.vaultId,
      actor_id: user.id,
    } as any);

    return NextResponse.json({ address });
  } catch (error) {
    console.error('Error in PUT /api/vaults/[vaultId]/profile/addresses/[addressId]:', error);
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

/**
 * DELETE /api/vaults/[vaultId]/profile/addresses/[addressId]
 * Delete an address
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ vaultId: string; addressId: string }> }
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

    // Delete address
    const { error: deleteError } = await supabase
      .from('vault_addresses')
      .delete()
      .eq('id', params.addressId)
      .eq('vault_id', params.vaultId);

    if (deleteError) {
      console.error('Error deleting address:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete address' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_log').insert({
      entity_type: 'vault_address',
      entity_id: params.addressId,
      action: 'delete',
      vault_id: params.vaultId,
      actor_id: user.id,
    } as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/vaults/[vaultId]/profile/addresses/[addressId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
