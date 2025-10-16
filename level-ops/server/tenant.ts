import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const getTenantFromHost = cache(async () => {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  
  if (!tenantSlug) {
    return null
  }

  const supabase = await createClient()
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', tenantSlug)
    .single()

  if (error || !tenant) {
    return null
  }

  return tenant
})

export const getCurrentUserTenantRole = cache(async (tenantId: string) => {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role, status')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  return membership
})