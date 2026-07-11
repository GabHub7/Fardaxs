'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/auth'
import { forgotPasswordAction } from '@/features/auth/actions'

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (data: ForgotPasswordInput) => {
    await forgotPasswordAction(data.email)
    setSuccess(true)
  }

  if (success) {
    return (
      <div
        className="rounded-[20px] border p-8 text-center"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'hsl(217 91% 60% / 0.15)' }}
        >
          <CheckCircle className="h-8 w-8" style={{ color: 'hsl(var(--primary))' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          Email Terkirim
        </h2>
        <p className="text-sm mb-6" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Jika email Anda terdaftar, kami telah mengirim link reset password. Cek inbox dan folder spam Anda.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: 'hsl(var(--primary))' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Login
        </Link>
      </div>
    )
  }

  return (
    <div
      className="rounded-[20px] border p-6 sm:p-8"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: 'hsl(var(--foreground-muted))' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
          Lupa Password
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Masukkan email Anda dan kami akan mengirim link untuk mereset password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
            Alamat Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-[14px] text-sm outline-none"
              style={{
                background: 'hsl(var(--background-muted))',
                border: `1px solid ${errors.email ? 'hsl(0 84% 60%)' : 'hsl(var(--border))'}`,
                color: 'hsl(var(--foreground))',
              }}
              {...register('email')}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[44px] rounded-[14px] text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {isSubmitting && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSubmitting ? 'Mengirim...' : 'Kirim Link Reset'}
        </button>
      </form>
    </div>
  )
}
