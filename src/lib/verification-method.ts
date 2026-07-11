export type VerificationMethod = 'NONE' | 'EMAIL' | 'WA_OTP' | 'EMAIL_AND_OTP'

const VALID_METHODS: VerificationMethod[] = ['NONE', 'EMAIL', 'WA_OTP', 'EMAIL_AND_OTP']

export function normalizeVerificationMethod(value: unknown): VerificationMethod {
  return VALID_METHODS.includes(value as VerificationMethod) ? (value as VerificationMethod) : 'EMAIL'
}
