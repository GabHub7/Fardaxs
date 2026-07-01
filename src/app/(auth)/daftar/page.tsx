'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail, Phone, User, CheckCircle } from 'lucide-react'
import { registerSchema, type RegisterInput } from '@/schemas/auth'
import { registerAction } from '@/features/auth/actions'

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autoVerified, setAutoVerified] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [requiresPhone, setRequiresPhone] = useState(false)

  useEffect(() => {
    fetch('/api/auth/verification-method')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) setRequiresPhone(!!json.requiresPhone)
      })
      .catch(() => {
        // Keep default (phone optional) if this fails — registration still works.
      })
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    const result = await registerAction(data)
    if (result.success) {
      setAutoVerified(!!result.autoVerified)
      setRegisteredEmail(data.email)
      setSuccess(true)
    } else {
      setServerError(result.message)
    }
  }

  if (success) {
    return (
      <div
        className="rounded-[20px] border p-8 text-center"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'hsl(142 71% 45% / 0.15)' }}
        >
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          Registrasi Berhasil!
        </h2>
        <p className="text-sm mb-6" style={{ color: 'hsl(var(--foreground-muted))' }}>
          {autoVerified
            ? 'Akun kamu sudah aktif. Tidak perlu verifikasi tambahan — langsung masuk dan mulai berbelanja.'
            : 'Kami telah mengirim kode verifikasi. Cek inbox/WhatsApp kamu untuk mengaktifkan akun.'}
        </p>
        <button
          onClick={() =>
            router.push(
              autoVerified ? '/login' : `/verifikasi?email=${encodeURIComponent(registeredEmail)}`
            )
          }
          className="w-full min-h-[44px] rounded-[14px] text-sm font-semibold"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {autoVerified ? 'Masuk Sekarang' : 'Lanjut Verifikasi'}
        </button>
      </div>
    )
  }

  return (
    <div
      className="rounded-[20px] border p-6 sm:p-8"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          Buat Akun Baru
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Daftar dan mulai berbelanja di Fardax Store
        </p>
      </div>

      {serverError && (
        <div className="mb-5 rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Nama Lengkap
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              placeholder="Nama lengkap Anda"
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-[14px] text-sm outline-none"
              style={{
                background: 'hsl(var(--background-muted))',
                border: `1px solid ${errors.full_name ? 'hsl(0 84% 60%)' : 'hsl(var(--border))'}`,
                color: 'hsl(var(--foreground))',
              }}
              {...register('full_name')}
            />
          </div>
          {errors.full_name && <p className="mt-1.5 text-xs text-red-400">{errors.full_name.message}</p>}
        </div>

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

        {/* Phone (WhatsApp) */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Nomor WhatsApp{requiresPhone ? '' : ' (opsional)'}
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+6281234567890"
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-[14px] text-sm outline-none"
              style={{
                background: 'hsl(var(--background-muted))',
                border: `1px solid ${errors.phone ? 'hsl(0 84% 60%)' : 'hsl(var(--border))'}`,
                color: 'hsl(var(--foreground))',
              }}
              {...register('phone')}
            />
          </div>
          {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone.message}</p>}
          {requiresPhone && !errors.phone && (
            <p className="mt-1.5 text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Wajib diisi — kode verifikasi OTP akan dikirim ke nomor ini.
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 karakter"
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-[14px] text-sm outline-none"
              style={{
                background: 'hsl(var(--background-muted))',
                border: `1px solid ${errors.password ? 'hsl(0 84% 60%)' : 'hsl(var(--border))'}`,
                color: 'hsl(var(--foreground))',
              }}
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {showPassword ? <EyeOff className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} /> : <Eye className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
          <p className="mt-1.5 text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Min. 8 karakter, huruf besar, huruf kecil, dan angka
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirm_password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Konfirmasi Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            <input
              id="confirm_password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Ulangi password"
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-[14px] text-sm outline-none"
              style={{
                background: 'hsl(var(--background-muted))',
                border: `1px solid ${errors.confirm_password ? 'hsl(0 84% 60%)' : 'hsl(var(--border))'}`,
                color: 'hsl(var(--foreground))',
              }}
              {...register('confirm_password')}
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {showConfirm ? <EyeOff className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} /> : <Eye className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />}
            </button>
          </div>
          {errors.confirm_password && <p className="mt-1.5 text-xs text-red-400">{errors.confirm_password.message}</p>}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3">
          <input
            id="agree_terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border"
            style={{ accentColor: 'hsl(var(--primary))' }}
            {...register('agree_terms')}
          />
          <label htmlFor="agree_terms" className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Saya menyetujui{' '}
            <Link href="/syarat-ketentuan" className="font-medium" style={{ color: 'hsl(var(--primary))' }}>
              Syarat & Ketentuan
            </Link>{' '}
            dan{' '}
            <Link href="/kebijakan-privasi" className="font-medium" style={{ color: 'hsl(var(--primary))' }}>
              Kebijakan Privasi
            </Link>
          </label>
        </div>
        {errors.agree_terms && <p className="text-xs text-red-400 -mt-2">{errors.agree_terms.message}</p>}

        {/* Submit */}
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
          {isSubmitting ? 'Mendaftar...' : 'Buat Akun'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
        Sudah punya akun?{' '}
        <Link href="/login" className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>
          Masuk
        </Link>
      </p>
    </div>
  )
}
