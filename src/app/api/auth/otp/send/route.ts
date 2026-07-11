import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'
import { sendVerificationOtpEmail } from '@/lib/email'
import { waSendOtp } from '@/lib/whatsapp'
import { normalizeVerificationMethod } from '@/lib/verification-method'
import type { ApiResponse } from '@/types'

const OTP_TTL_MINUTES = 10

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

async function sendEmailOtp(serviceClient: ReturnType<typeof createServiceClient>, userId: string, email: string, fullName: string | null) {
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

  const { error: insertError } = await serviceClient.from('verification_otps').insert({
    user_id: userId,
    channel: 'EMAIL',
    code_hash: hashOtp(code),
    destination: email,
    purpose: 'REGISTER',
    expires_at: expiresAt,
  })

  if (insertError) {
    return { ok: false, message: 'Gagal membuat kode verifikasi.' }
  }

  try {
    await sendVerificationOtpEmail({ to: email, name: fullName ?? 'Pelanggan', code, purpose: 'REGISTER' })
  } catch {
    return { ok: false, message: 'Gagal mengirim email. Pastikan layanan email aktif.' }
  }

  return { ok: true, message: 'Kode verifikasi dikirim ke email kamu.' }
}

/**
 * POST /api/auth/otp/send
 * Sends (or resends) a verification code for an existing, unverified user.
 * Channel (EMAIL vs WA_OTP) is decided by the admin-controlled
 * `verification_method` setting in site_settings — not by the caller.
 *
 * For the two-step `EMAIL_AND_OTP` mode, this automatically figures out
 * which step the user is currently on (email first, then WhatsApp) based
 * on `email_step_verified` / `otp_step_verified` and sends the right one.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const body = await request.json().catch(() => null) as { email?: string } | null
  const email = body?.email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Email wajib diisi' }, { status: 400 })
  }

  const rl = await checkAuthRateLimit(`otp-send:${ip}:${email}`)
  if (!rl.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Terlalu banyak permintaan. Coba lagi dalam beberapa menit.' },
      { status: 429 }
    )
  }

  const serviceClient = createServiceClient()

  const { data: user } = await serviceClient
    .from('users')
    .select('id, email, full_name, phone, email_verified, email_step_verified, otp_step_verified')
    .eq('email', email)
    .single()

  // Don't reveal whether the email exists — always respond success-shaped.
  if (!user) {
    return NextResponse.json<ApiResponse>({ success: true, message: 'Jika email terdaftar, kode verifikasi telah dikirim.' })
  }

  if (user.email_verified) {
    return NextResponse.json<ApiResponse>({ success: true, message: 'Akun sudah terverifikasi. Silakan masuk.' })
  }

  const { data: methodSetting } = await serviceClient
    .from('site_settings')
    .select('value')
    .eq('key', 'verification_method')
    .maybeSingle()
  const method = normalizeVerificationMethod(methodSetting?.value)

  if (method === 'NONE') {
    // Shouldn't normally happen (NONE accounts are confirmed at registration
    // time), but handle gracefully if called anyway.
    await serviceClient.from('users').update({ email_verified: true }).eq('id', user.id)
    await serviceClient.auth.admin.updateUserById(user.id, { email_confirm: true }).catch(() => {})
    return NextResponse.json<ApiResponse>({ success: true, message: 'Akun ini tidak memerlukan verifikasi.' })
  }

  // Decide which channel to send right now.
  let channel: 'EMAIL' | 'WA_OTP'
  if (method === 'EMAIL') {
    channel = 'EMAIL'
  } else if (method === 'WA_OTP') {
    channel = 'WA_OTP'
  } else {
    // EMAIL_AND_OTP — email step first, then WhatsApp.
    channel = user.email_step_verified ? 'WA_OTP' : 'EMAIL'
  }

  if (channel === 'WA_OTP') {
    if (!user.phone) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Nomor WhatsApp belum terdaftar di akun ini.' },
        { status: 400 }
      )
    }
    const sent = await waSendOtp(user.phone)
    if (!sent) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Gagal mengirim kode via WhatsApp. Coba lagi nanti.' },
        { status: 502 }
      )
    }
    return NextResponse.json({
      success: true,
      message: 'Kode verifikasi dikirim via WhatsApp.',
      channel: 'WA_OTP',
      stage: method === 'EMAIL_AND_OTP' ? 2 : 1,
    })
  }

  const result = await sendEmailOtp(serviceClient, user.id, email, user.full_name)
  if (!result.ok) {
    return NextResponse.json<ApiResponse>({ success: false, message: result.message }, { status: 502 })
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    channel: 'EMAIL',
    stage: method === 'EMAIL_AND_OTP' ? 1 : 1,
  })
}

