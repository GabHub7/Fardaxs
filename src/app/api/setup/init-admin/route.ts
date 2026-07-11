import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * One-time admin initialization endpoint.
 * Sets up the Supabase Auth user for the admin account.
 *
 * POST /api/setup/init-admin
 * Body: { password: "new_password" }
 */
export async function POST(request: Request) {
  try {
    const { password = 'farz1704' } = await request.json().catch(() => ({}))

    const email = 'fardaxstore@gmail.com'
    const roleId = '00000000-0000-0000-0000-000000000004' // SUPER_ADMIN

    const serviceClient = createServiceClient()

    // 1. Check if user exists in auth.users via admin API
    const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers()

    if (listError) {
      console.error('Failed to list users:', listError)
      return NextResponse.json(
        { error: 'Failed to check existing users', details: listError.message },
        { status: 500 }
      )
    }

    const existingAuthUser = users?.find((u) => u.email === email)
    let authUserId = existingAuthUser?.id

    // 2. Create or update auth user
    if (!authUserId) {
      const { data, error } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Fardax Admin' },
      })

      if (error || !data.user) {
        console.error('Failed to create auth user:', error)
        return NextResponse.json(
          { error: 'Failed to create auth user', details: error?.message },
          { status: 500 }
        )
      }

      authUserId = data.user.id
    } else {
      // Update password for existing user
      const { error } = await serviceClient.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
      })

      if (error) {
        console.error('Failed to update auth user:', error)
        return NextResponse.json(
          { error: 'Failed to update auth user', details: error.message },
          { status: 500 }
        )
      }
    }

    // 3. Ensure user profile exists in public.users
    const { data: existingProfile } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (!existingProfile) {
      const { error: insertError } = await serviceClient.from('users').insert({
        auth_id: authUserId,
        email,
        username: 'fardaxadmin',
        full_name: 'Fardax Admin',
        role_id: roleId,
        email_verified: true,
        status: 'ACTIVE',
      })

      if (insertError) {
        console.error('Failed to create user profile:', insertError)
        return NextResponse.json(
          { error: 'Failed to create user profile', details: insertError.message },
          { status: 500 }
        )
      }
    } else {
      // Update existing profile
      const { error: updateError } = await serviceClient
        .from('users')
        .update({
          auth_id: authUserId,
          role_id: roleId,
          email_verified: true,
          status: 'ACTIVE',
        })
        .eq('email', email)

      if (updateError) {
        console.error('Failed to update user profile:', updateError)
        return NextResponse.json(
          { error: 'Failed to update user profile', details: updateError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account initialized successfully',
      credentials: {
        email,
        password,
        role: 'SUPER_ADMIN',
      },
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Setup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
