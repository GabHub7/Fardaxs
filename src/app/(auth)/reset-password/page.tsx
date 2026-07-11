import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './reset-password-form'

/**
 * The recovery email (sent via supabase.auth.resetPasswordForEmail in
 * forgotPasswordAction) links straight to /reset-password?code=xxx — it
 * does NOT go through /api/auth/callback first. So this page itself is
 * responsible for exchanging that code for a session before the form can
 * call supabase.auth.updateUser(), which relies on that session existing.
 * Without this exchange, updateUser() would fail with "Auth session
 * missing" even though the link itself was valid.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams

  if (!code) {
    return <ExpiredLinkNotice />
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return <ExpiredLinkNotice />
  }

  return <ResetPasswordForm />
}

function ExpiredLinkNotice() {
  return (
    <div
      className="rounded-[20px] border p-8 text-center space-y-4"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
        style={{ background: 'hsl(var(--destructive)/0.12)' }}
      >
        <AlertCircle className="h-7 w-7" style={{ color: 'hsl(var(--destructive))' }} />
      </div>
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Link Tidak Valid atau Kedaluwarsa
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Link reset password ini sudah tidak berlaku. Silakan minta link baru.
        </p>
      </div>
      <Link
        href="/lupa-password"
        className="inline-block rounded-[12px] px-5 py-2.5 text-sm font-semibold"
        style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
      >
        Minta Link Baru
      </Link>
    </div>
  )
}
