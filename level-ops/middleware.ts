import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/tasks', '/milestones', '/risks', '/decisions', '/settings', '/profile', '/notifications']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if logged in and trying to access login
  if (request.nextUrl.pathname === '/login' && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Check if new user needs onboarding (redirect to onboarding if no organizations)
  if (user && request.nextUrl.pathname === '/dashboard') {
    try {
      const { data: memberships } = await supabase
        .from('org_memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .limit(1)

      // If user has no organizations and not already on onboarding page, redirect to onboarding
      if (!memberships || memberships.length === 0) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/onboarding'
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error('Error checking user memberships:', error)
    }
  }

  // Host-based tenant resolution - extract organization from domain/subdomain
  const host = request.headers.get('host') || ''

  // Only attempt resolution if user is authenticated
  if (user && host) {
    try {
      // Query for organization with matching domain
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('domain', host.split(':')[0]) // Remove port if present
        .maybeSingle()

      // Verify user is a member of this organization
      if (org) {
        const { data: membership } = await supabase
          .from('org_memberships')
          .select('org_id')
          .eq('org_id', org.id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (membership) {
          // Set organization ID in header for client-side access
          response.headers.set('x-organization-id', org.id)
        }
      }
    } catch (error) {
      console.error('Error resolving organization from domain:', error)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
