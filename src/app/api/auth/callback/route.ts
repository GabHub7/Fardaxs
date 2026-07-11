import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure user profile exists in our users table
      const serviceClient = createServiceClient()
      const { data: existingUser } = await serviceClient
        .from('users')
        .select('id')
        .eq('auth_id', data.user.id)
        .maybeSingle()

      if (!existingUser) {
        // Create user profile for OAuth users
        await serviceClient.from('users').insert({
          auth_id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
          role_id: '00000000-0000-0000-0000-000000000001',
          email_verified: true, // Google accounts are pre-verified
          status: 'ACTIVE',
        })
      } else {
        // Update last login
        await serviceClient
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('auth_id', data.user.id)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
