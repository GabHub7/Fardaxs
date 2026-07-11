import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'
import { waSendOtp, waVerifyOtp } from '@/lib/whatsapp'
import { normalizeVerificationMethod } from '@/lib/verification-method'
import type { ApiResponse } from '@/types'

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

async function verifyEmailCode(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  code: string
): Promise<{ ok: boolean; message?: string }> {
  const { data: otp } = await serviceClient
    .from('verification_otps')
    .select('id, code_hash, attempts, max_attempts, consumed_at, expires_at')
    .eq('user_id', userId)
    .eq('purpose', 'REGISTER')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otp) return { ok: false, message: 'Kode tidak ditemukan. Minta kode baru.' }
  if (new Date(otp.expires_at) < new Date()) return { ok: false, message: 'Kode sudah kadaluarsa. Minta kode baru.' }
  if (otp.attempts >= otp.max_attempts) return { ok: false, message: 'Terlalu banyak percobaan salah. Minta kode baru.' }

  if (hashOtp(code) !== otp.code_hash) {
    await serviceClient.from('verification_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    return { ok: false, message: 'Kode salah. Coba lagi.' }
  }

  await serviceClient.from('verification_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otp.id)
  return { ok: true }
}

async function markFullyVerified(serviceClient: ReturnType<typeof createServiceClient>, userId: string, authId: string | null) {
  await serviceClient.from('users').update({ email_verified: true }).eq('id', userId)
  // Also confirm in Supabase Auth so signInWithPassword stops blocking on
  // "Email not confirmed" — our OTP is now the source of truth, not theirs.
  if (authId) {
    await serviceClient.auth.admin.updateUserById(authId, { email_confirm: true })
  }
}

/**
 * POST /api/auth/otp/verify
 * Verifies a 6-digit code for either channel (EMAIL — checked against our
 * own verification_otps table, or WA_OTP — delegated to the WhatsApp bot).
 *
 * For the two-step `EMAIL_AND_OTP` mode, this verifies whichever step is
 * currently pending. After the email step succeeds it automatically sends
 * the WhatsApp OTP and responds with `nextStep: "WA_OTP"` so the frontend
 * can move straight to the second code without an extra click. The account
 * is only marked fully verified once BOTH steps are done.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const body = await request.json().catch(() => null) as { email?: string; code?: string } | null
  const email = body?.email?.trim().toLowerCase()
  const code = body?.code?.trim()

  if (!email || !code) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Email dan kode wajib diisi' }, { status: 400 })
  }

  const rl = await checkAuthRateLimit(`otp-verify:${ip}:${email}`)
  if (!rl.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' },
      { status: 429 }
    )
  }

  const serviceClient = createServiceClient()

  const { data: user } = await serviceClient
    .from('users')
    .select('id, auth_id, email, phone, email_verified, email_step_verified, otp_step_verified')
    .eq('email', email)
    .single()

  if (!user) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Akun tidak ditemukan.' }, { status: 404 })
  }

  if (user.email_verified) {
    return NextResponse.json<ApiResponse>({ success: true, message: 'Akun sudah terverifikasi.' })
  }

  const { data: methodSetting } = await serviceClient
    .from('site_settings')
    .select('value')
    .eq('key', 'verification_method')
    .maybeSingle()
  const method = normalizeVerificationMethod(methodSetting?.value)

  if (method === 'NONE') {
    await markFullyVerified(serviceClient, user.id, user.auth_id as string | null)
    return NextResponse.json<ApiResponse>({ success: true, message: 'Akun ini tidak memerlukan verifikasi.' })
  }

  if (method === 'EMAIL') {
    const result = await verifyEmailCode(serviceClient, user.id, code)
    if (!result.ok) return NextResponse.json<ApiResponse>({ success: false, message: result.message ?? 'Kode salah.' }, { status: 400 })
    await markFullyVerified(serviceClient, user.id, user.auth_id as string | null)
    return NextResponse.json<ApiResponse>({ success: true, message: 'Akun berhasil diverifikasi!' })
  }

  if (method === 'WA_OTP') {
    if (!user.phone) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Nomor WhatsApp tidak ditemukan.' }, { status: 400 })
    }
    const result = await waVerifyOtp(user.phone, code)
    if (!result.valid) {
      return NextResponse.json<ApiResponse>({ success: false, message: result.message || 'Kode salah atau kadaluarsa.' }, { status: 400 })
    }
    await markFullyVerified(serviceClient, user.id, user.auth_id as string | null)
    return NextResponse.json<ApiResponse>({ success: true, message: 'Akun berhasil diverifikasi!' })
  }

  // method === 'EMAIL_AND_OTP' — two sequential steps.
  if (!user.email_step_verified) {
    const result = await verifyEmailCode(serviceClient, user.id, code)
    if (!result.ok) return NextResponse.json<ApiResponse>({ success: false, message: result.message ?? 'Kode salah.' }, { status: 400 })

    await serviceClient.from('users').update({ email_step_verified: true }).eq('id', user.id)

    // Immediately kick off step 2 so the user doesn't need an extra "resend" click.
    if (user.phone) {
      await waSendOtp(user.phone).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: user.phone
        ? 'Email terverifikasi! Kode kedua telah dikirim ke WhatsApp Anda.'
        : 'Email terverifikasi! Namun nomor WhatsApp belum terdaftar untuk langkah kedua.',
      nextStep: 'WA_OTP',
    })
  }

  if (!user.otp_step_verified) {
    if (!user.phone) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Nomor WhatsApp tidak ditemukan.' }, { status: 400 })
    }
    const result = await waVerifyOtp(user.phone, code)
    if (!result.valid) {
      return NextResponse.json<ApiResponse>({ success: false, message: result.message || 'Kode salah atau kadaluarsa.' }, { status: 400 })
    }

    await serviceClient.from('users').update({ otp_step_verified: true }).eq('id', user.id)
    await markFullyVerified(serviceClient, user.id, user.auth_id as string | null)
    return NextResponse.json<ApiResponse>({ success: true, message: 'Akun berhasil diverifikasi!' })
  }

  // Both steps already done but email_verified somehow wasn't flipped — fix it.
  await markFullyVerified(serviceClient, user.id, user.auth_id as string | null)
  return NextResponse.json<ApiResponse>({ success: true, message: 'Akun berhasil diverifikasi!' })
}
