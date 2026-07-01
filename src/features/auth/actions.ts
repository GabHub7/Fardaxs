'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'
import { normalizeVerificationMethod, type VerificationMethod } from '@/app/api/auth/verification-method/route'
import type { LoginInput, RegisterInput } from '@/schemas/auth'

type ActionResult = {
  success: boolean
  message: string
  role?: string
  errors?: Record<string, string>
  verificationMethod?: VerificationMethod
  autoVerified?: boolean
}

async function getRequestIp(): Promise<string> {
  const headerList = await headers()
  return headerList.get('x-forwarded-for') ?? headerList.get('x-real-ip') ?? 'unknown'
}

export async function loginAction(data: LoginInput): Promise<ActionResult> {
  // Rate limit by IP+email so one abusive client can't brute-force a
  // single account, nor hammer the endpoint with random credentials.
  const ip = await getRequestIp()
  const rl = await checkAuthRateLimit(`login:${ip}:${data.email.toLowerCase()}`)
  if (!rl.success) {
    return { success: false, message: 'Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    // Log failed login attempt (fire and forget)
    logLoginAttempt(data.email, false, error.message).catch(() => {})

    if (error.message.includes('Invalid login credentials')) {
      return { success: false, message: 'Email atau password salah.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return {
        success: false,
        message: 'Email belum diverifikasi. Cek inbox Anda.',
        errors: { email: 'Email belum diverifikasi' },
      }
    }
    return { success: false, message: 'Gagal masuk. Coba lagi.' }
  }

  logLoginAttempt(data.email, true).catch(() => {})

  // Ambil role user untuk keperluan redirect di client
  const { data: { user } } = await supabase.auth.getUser()
  let roleName = ''
  if (user) {
    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
      .from('users')
      .select('roles(name)')
      .eq('auth_id', user.id)
      .single()
    const rolesRelation = profile?.roles
    const roleRecord = Array.isArray(rolesRelation) ? rolesRelation[0] : rolesRelation
    roleName = (roleRecord as { name?: string } | null)?.name ?? ''
  }

  revalidatePath('/', 'layout')
  return { success: true, message: 'Berhasil masuk', role: roleName }
}

export async function registerAction(data: RegisterInput): Promise<ActionResult> {
  const ip = await getRequestIp()
  const rl = await checkAuthRateLimit(`register:${ip}`)
  if (!rl.success) {
    return { success: false, message: 'Terlalu banyak percobaan registrasi. Coba lagi dalam beberapa menit.' }
  }

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Check if email already exists
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', data.email)
    .maybeSingle()

  if (existingUser) {
    return {
      success: false,
      message: 'Email sudah terdaftar.',
      errors: { email: 'Email sudah terdaftar' },
    }
  }

  // Determine the active verification mode (admin-controlled, Pengaturan →
  // Sistem). This decides whether we skip verification entirely (NONE),
  // require email OTP, require WhatsApp OTP, or require both in sequence.
  const { data: methodSetting } = await serviceClient
    .from('site_settings')
    .select('value')
    .eq('key', 'verification_method')
    .maybeSingle()
  const method = normalizeVerificationMethod(methodSetting?.value)
  const needsPhone = method === 'WA_OTP' || method === 'EMAIL_AND_OTP'

  if (needsPhone && !data.phone) {
    return {
      success: false,
      message: 'Nomor WhatsApp wajib diisi untuk verifikasi OTP.',
      errors: { phone: 'Nomor WhatsApp wajib diisi' },
    }
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
      },
      // No emailRedirectTo here on purpose — verification is now handled by
      // our own OTP flow (/api/auth/otp/send + /verifikasi), not Supabase's
      // built-in confirmation link (which depended on the project's Site
      // URL and broke across preview/production domains).
    },
  })

  if (error) {
    return { success: false, message: 'Gagal mendaftar. Coba lagi.' }
  }

  const autoVerified = method === 'NONE'

  if (authData.user) {
    // Create user profile in users table
    const { error: profileError } = await serviceClient.from('users').insert({
      auth_id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      phone: data.phone || null,
      role_id: '00000000-0000-0000-0000-000000000001', // MEMBER role
      email_verified: autoVerified,
      status: 'ACTIVE',
    })

    if (profileError) {
      // Don't fail registration if profile creation fails — will be created on next login
      console.error('Profile creation failed:', profileError.message)
    } else if (autoVerified) {
      // Mode "NONE" — confirm immediately in Supabase Auth too, so
      // signInWithPassword never blocks on "Email not confirmed"
      // regardless of the Supabase project's own email-confirmation
      // setting. No OTP is sent at all in this mode.
      await serviceClient.auth.admin.updateUserById(authData.user.id, { email_confirm: true })
    } else {
      // Send our own OTP (email or WA, per the admin's verification_method
      // setting) — fire and forget so registration doesn't hang on it.
      // NOTE: if Supabase's "Confirm email" auth setting is still enabled,
      // it will ALSO send its own link email. Disable that in
      // Supabase Dashboard → Authentication → Sign In / Providers → Email
      // to avoid sending two different verification emails.
      const proto = process.env.NEXT_PUBLIC_APP_URL ?? ''
      fetch(`${proto}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      }).catch(() => {})
    }
  }

  return {
    success: true,
    message: autoVerified
      ? 'Registrasi berhasil! Akun Anda sudah aktif, silakan langsung masuk.'
      : 'Registrasi berhasil! Cek email Anda untuk verifikasi.',
    verificationMethod: method,
    autoVerified,
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function forgotPasswordAction(email: string): Promise<ActionResult> {
  const ip = await getRequestIp()
  const rl = await checkAuthRateLimit(`forgot-password:${ip}`)
  if (!rl.success) {
    return { success: true, message: 'Jika email terdaftar, link reset password telah dikirim.' }
  }

  const supabase = await createClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`

  // Supabase Auth sends the recovery email itself (via the SMTP configured
  // on the project, Project Settings → Authentication → SMTP Settings) —
  // no manual link generation + Resend call needed anymore. The email
  // content/branding is controlled from Supabase Dashboard → Authentication
  // → Email Templates → "Reset Password", not from this codebase.
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  // Always return success — never reveal whether the email exists, and
  // don't surface Supabase's internal error to the user (e.g. rate limit
  // on Supabase's side) since that itself could leak account existence.
  if (error) {
    return {
      success: true,
      message: 'Jika email terdaftar, link reset password telah dikirim.',
    }
  }

  return {
    success: true,
    message: 'Link reset password telah dikirim ke email Anda. Cek inbox (dan folder spam).',
  }
}

export async function resetPasswordAction(password: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, message: 'Gagal mengubah password. Link mungkin sudah kedaluwarsa.' }
  }

  return { success: true, message: 'Password berhasil diubah! Silakan masuk.' }
}

export async function loginWithGoogleAction(): Promise<{ url: string } | ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return { success: false, message: 'Gagal masuk dengan Google.' }
  }

  return { url: data.url }
}

async function logLoginAttempt(
  email: string,
  success: boolean,
  reason?: string
): Promise<void> {
  try {
    const serviceClient = createServiceClient()
    await serviceClient.from('login_attempts').insert({
      email,
      success,
      failure_reason: reason,
    })
  } catch {
    // Non-critical — do not throw
  }
}
