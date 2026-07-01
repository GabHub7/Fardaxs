import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export type VerificationMethod = 'NONE' | 'EMAIL' | 'WA_OTP' | 'EMAIL_AND_OTP'

const VALID_METHODS: VerificationMethod[] = ['NONE', 'EMAIL', 'WA_OTP', 'EMAIL_AND_OTP']

export function normalizeVerificationMethod(value: unknown): VerificationMethod {
  return VALID_METHODS.includes(value as VerificationMethod) ? (value as VerificationMethod) : 'EMAIL'
}

/**
 * GET /api/auth/verification-method
 * Public — just exposes which verification mode is currently active so the
 * register/login/verify pages can adapt (e.g. show the phone field, decide
 * whether to skip the OTP step entirely). Not sensitive information.
 */
export async function GET() {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('site_settings')
    .select('value')
    .eq('key', 'verification_method')
    .maybeSingle()

  const method = normalizeVerificationMethod(data?.value)

  return NextResponse.json({
    success: true,
    method,
    requiresPhone: method === 'WA_OTP' || method === 'EMAIL_AND_OTP',
  })
}
