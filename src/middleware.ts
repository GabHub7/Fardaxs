import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/akun', '/keranjang', '/pesanan', '/riwayat']
const ADMIN_ROUTES = ['/admin']
const AUTH_ROUTES = ['/login', '/daftar', '/lupa-password', '/reset-password']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Redirect authenticated users away from auth pages
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect user routes
  if (!user && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r))

  // Banning a user only updates `users.status` — it doesn't revoke their
  // existing Supabase Auth session, so without this check an already
  // logged-in user who gets banned mid-session keeps full access to
  // /akun and /admin until their token happens to expire. Re-check status
  // on every request that touches a protected/admin route and kill the
  // session immediately if it's no longer ACTIVE.
  if (user && (isProtected || isAdminRoute)) {
    const { data: userData } = await supabase
      .from('users')
      .select('status, role_id, roles(name)')
      .eq('auth_id', user.id)
      .single()

    if (userData?.status === 'BANNED' || userData?.status === 'SUSPENDED') {
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('banned', '1')
      return NextResponse.redirect(loginUrl)
    }

    if (isAdminRoute) {
      // Supabase returns the joined relation as an array unless the FK is
      // declared 1:1 — normalize both shapes here.
      const rolesRelation = userData?.roles
      const roleRecord = Array.isArray(rolesRelation) ? rolesRelation[0] : rolesRelation
      const roleName = (roleRecord as { name?: string } | null | undefined)?.name

      if (!roleName || !['ADMIN', 'SUPER_ADMIN'].includes(roleName)) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  } else if (!user && isAdminRoute) {
    return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
  }

  // Security headers
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images|icons|api/webhooks|api/cron).*)',
  ],
}
