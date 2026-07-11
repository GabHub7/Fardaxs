'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { resetPasswordSchema, type ResetPasswordInput } from '@/schemas/auth'
import { resetPasswordAction } from '@/features/auth/actions'


export function ResetPasswordForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null)
    const result = await resetPasswordAction(data.password)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } else {
      setServerError(result.message)
    }
  }

  if (success) {
    return (
      <div
        className="rounded-[20px] border p-8 text-center space-y-4"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'hsl(var(--success)/0.15)' }}
        >
          <CheckCircle className="h-7 w-7" style={{ color: 'hsl(var(--success))' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Password Berhasil Diubah
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Password baru kamu sudah aktif. Mengarahkan ke halaman login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[20px] border p-6 sm:p-8"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Buat Password Baru
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Masukkan password baru untuk akunmu.
        </p>
      </div>

      {serverError && (
        <div
          className="mb-4 flex items-start gap-2 rounded-[12px] p-3 text-sm"
          style={{ background: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' }}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
            Password Baru
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            </div>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 karakter"
              className="w-full rounded-[12px] pl-10 pr-10 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'hsl(var(--background))',
                border: `1.5px solid ${errors.password ? 'hsl(var(--destructive))' : 'hsl(var(--border))'}`,
                color: 'hsl(var(--foreground))',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              {showPassword
                ? <EyeOff className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
                : <Eye className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
              }
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs" style={{ color: 'hsl(var(--destructive))' }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
            Konfirmasi Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            </div>
            <input
              {...register('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Ulangi password baru"
              className="w-full rounded-[12px] pl-10 pr-10 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'hsl(var(--background))',
                border: `1.5px solid ${errors.confirm_password ? 'hsl(var(--destructive))' : 'hsl(var(--border))'}`,
                color: 'hsl(var(--foreground))',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              {showConfirm
                ? <EyeOff className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
                : <Eye className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
              }
            </button>
          </div>
          {errors.confirm_password && (
            <p className="mt-1 text-xs" style={{ color: 'hsl(var(--destructive))' }}>
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        {/* Password requirements hint */}
        <div
          className="rounded-[10px] p-3 text-xs space-y-1"
          style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))' }}
        >
          <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Syarat password:</p>
          <p>• Minimal 8 karakter</p>
          <p>• Mengandung huruf besar dan kecil</p>
          <p>• Mengandung angka</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-[12px] py-3 text-sm font-semibold transition-all disabled:opacity-60"
          style={{
            background: isSubmitting ? 'hsl(var(--primary)/0.7)' : 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          }}
        >
          {isSubmitting ? 'Memperbarui...' : 'Simpan Password Baru'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
        Ingat password lama?{' '}
        <Link href="/login" className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>
          Masuk
        </Link>
      </p>
    </div>
  )
}
