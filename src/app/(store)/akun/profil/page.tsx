'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfileAction } from './actions'
import { getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Phone, CheckCircle2, AlertCircle } from 'lucide-react'

interface Toast {
  type: 'success' | 'error'
  message: string
}

interface UserProfile {
  full_name: string | null
  phone: string | null
  email: string
  created_at: string
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [isPending, startTransition] = useTransition()

  // Load profile on mount
  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || cancelled) return

      const { data } = await supabase
        .from('users')
        .select('full_name, phone, email, created_at')
        .eq('auth_id', user.id)
        .single()

      if (cancelled) return

      if (data) {
        setProfile(data as UserProfile)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
      }
      setLoading(false)
    }
    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-dismiss toast after 4 s
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(id)
  }, [toast])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateProfileAction(fullName, phone)
      setToast({
        type: result.success ? 'success' : 'error',
        message: result.message,
      })
      if (result.success && profile) {
        setProfile({ ...profile, full_name: fullName.trim(), phone: phone.trim() || null })
      }
    })
  }

  const displayName = profile?.full_name ?? profile?.email ?? 'Pengguna'

  return (
    <div className="max-w-lg space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="rounded-[14px] border p-4 flex items-start gap-3"
          role="alert"
          style={
            toast.type === 'success'
              ? {
                  background: 'hsl(var(--success)/0.1)',
                  borderColor: 'hsl(var(--success)/0.3)',
                }
              : {
                  background: 'hsl(var(--destructive)/0.1)',
                  borderColor: 'hsl(var(--destructive)/0.3)',
                }
          }
        >
          {toast.type === 'success' ? (
            <CheckCircle2
              size={18}
              className="shrink-0 mt-0.5"
              style={{ color: 'hsl(var(--success))' }}
            />
          ) : (
            <AlertCircle
              size={18}
              className="shrink-0 mt-0.5"
              style={{ color: 'hsl(var(--destructive))' }}
            />
          )}
          <p
            className="text-sm font-medium"
            style={{
              color:
                toast.type === 'success'
                  ? 'hsl(var(--success))'
                  : 'hsl(var(--destructive))',
            }}
          >
            {toast.message}
          </p>
        </div>
      )}

      {/* Avatar & email */}
      <div
        className="rounded-[20px] border p-5 flex items-center gap-4"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
          style={{
            background: 'hsl(var(--primary)/0.15)',
            color: 'hsl(var(--primary))',
          }}
          aria-label={`Avatar ${displayName}`}
        >
          {loading ? (
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'hsl(var(--primary))' }}
            />
          ) : (
            getInitials(displayName)
          )}
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-bold truncate"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {loading ? '—' : displayName}
          </p>
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: 'hsl(var(--foreground-muted))' }}
          >
            {loading ? '—' : (profile?.email ?? '')}
          </p>
          <p
            className="text-[10px] mt-1"
            style={{ color: 'hsl(var(--foreground-muted))' }}
          >
            Email tidak dapat diubah
          </p>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-[20px] border p-5"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <h2
          className="text-sm font-bold mb-5"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          Informasi Pribadi
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Full name */}
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Nama Lengkap
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'hsl(var(--foreground-muted))' }}
              />
              <Input
                id="full_name"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading || isPending}
                required
                maxLength={100}
                autoComplete="name"
                className="pl-10"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Nomor Telepon{' '}
              <span style={{ color: 'hsl(var(--foreground-muted))' }}>(opsional)</span>
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'hsl(var(--foreground-muted))' }}
              />
              <Input
                id="phone"
                type="tel"
                placeholder="Contoh: 08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading || isPending}
                autoComplete="tel"
                className="pl-10"
              />
            </div>
            <p
              className="mt-1.5 text-xs"
              style={{ color: 'hsl(var(--foreground-muted))' }}
            >
              Format: 08xxxxxxxxxx atau +628xxxxxxxxxx
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            loading={isPending}
            disabled={loading || isPending}
          >
            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </form>
      </div>
    </div>
  )
}
