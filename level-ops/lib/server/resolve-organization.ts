import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Resolve organization from domain (subdomain or custom domain)
 * Returns organization ID if found, null otherwise
 */
export async function resolveOrganizationFromDomain(
  host: string
): Promise<string | null> {
  // Skip resolution for localhost development
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Query for organization with matching domain
  // RLS ensures user can only see orgs they're a member of
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('domain', host)
    .maybeSingle();

  if (error) {
    console.error('Error resolving organization from domain:', error);
    return null;
  }

  // Verify user is actually a member of this organization
  if (org) {
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id')
      .eq('org_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      return org.id;
    }
  }

  return null;
}

/**
 * Parse domain from host header
 * Removes port if present
 */
export function parseDomainFromHost(host: string): string {
  return host.split(':')[0];
}
