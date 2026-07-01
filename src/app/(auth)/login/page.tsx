'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/schemas/auth'
import { loginAction, loginWithGoogleAction } from '@/features/auth/actions'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    setUnverifiedEmail(null)
    const result = await loginAction(data)
    if (result.success) {
      const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((result as any).role ?? '')
      const dest = searchParams.get('redirect') ?? (isAdmin ? '/admin' : '/')
      router.push(dest)
      router.refresh()
    } else {
      setServerError(result.message)
      if (result.errors?.email === 'Email belum diverifikasi') {
        setUnverifiedEmail(data.email)
      }
    }
  }

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogleAction()
    if ('url' in result) {
      window.location.href = result.url
    }
  }

  return (
    <div
      className="border p-6 sm:p-8"
      style={{
        background: 'hsl(var(--background-card))',
        borderColor: 'hsl(var(--border))',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          Selamat Datang Kembali
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Masuk ke akun Fardax Store Anda
        </p>
      </div>

      {serverError && (
        <div className="mb-5 rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{serverError}</p>
          {unverifiedEmail && (
            <Link
              href={`/verifikasi?email=${encodeURIComponent(unverifiedEmail)}`}
              className="mt-2 inline-block text-sm font-semibold underline"
              style={{ color: 'hsl(var(--primary))' }}
            >
              Verifikasi sekarang dengan cara lain →
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: 'hsl(var(--foreground-muted))' }}
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm outline-none transition-all duration-150"
              style={{
                background: 'hsl(var(--background-muted))',
                border: `1px solid ${errors.email ? 'hsl(0 84% 60%)' : 'transparent'}`,
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--clay-inset)',
                color: 'hsl(var(--foreground))',
              }}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Password
            </label>
            <Link
              href="/lupa-password"
              className="text-xs font-medium"
              style={{ color: 'hsl(var(--primary))' }}
            >
              Lupa password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: 'hsl(var(--foreground-muted))' }}
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 text-sm outline-none transition-all duration-150"
              style={{
                background: 'hsl(var(--background-muted))',
                border: `1px solid ${errors.password ? 'hsl(0 84% 60%)' : 'transparent'}`,
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--clay-inset)',
                color: 'hsl(var(--foreground))',
              }}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
              ) : (
                <Eye className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[44px] text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2 active:scale-[0.99]"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--clay-primary)',
          }}
        >
          {isSubmitting && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSubmitting ? 'Sedang masuk...' : 'Masuk'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span
            className="px-3 text-xs"
            style={{
              background: 'hsl(var(--background-card))',
              color: 'hsl(var(--foreground-muted))',
            }}
          >
            atau masuk dengan
          </span>
        </div>
      </div>

      {/* Google Login */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full min-h-[44px] text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-150 border active:scale-[0.99]"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          color: 'hsl(var(--foreground))',
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Masuk dengan Google
      </button>

      {/* Register link */}
      <p className="mt-6 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
        Belum punya akun?{' '}
        <Link
          href="/daftar"
          className="font-semibold"
          style={{ color: 'hsl(var(--primary))' }}
        >
          Daftar sekarang
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="rounded-[20px] border p-6 sm:p-8 animate-pulse"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}>
        <div className="h-8 rounded bg-gray-700 mb-4 w-3/4" />
        <div className="h-4 rounded bg-gray-700 mb-8 w-1/2" />
        <div className="space-y-4">
          <div className="h-11 rounded-[14px] bg-gray-700" />
          <div className="h-11 rounded-[14px] bg-gray-700" />
          <div className="h-11 rounded-[14px] bg-gray-700" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
