'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  userId: string
  isBanned: boolean
  currentRole: string
  roleOptions: string[]
}

/**
 * Ban/unban + role change for a single user, via the existing PATCH
 * /api/admin/users endpoint (id passed in the body — see that route).
 *
 * Uses fetch instead of a <Link href="/admin/pengguna/[id]/ban"> style
 * navigation, since no such page route exists — that was the cause of the
 * "Ban" 404 (same class of bug fixed for products via ToggleStatusButton).
 */
export function UserActions({ userId, isBanned, currentRole, roleOptions }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState(currentRole)

  async function updateUser(body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError('')
    setPending(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...body }),
      })
      const json = (await res.json()) as { success: boolean; message?: string }
      if (!json.success) {
        setError(json.message ?? 'Gagal memproses aksi')
        return
      }
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setPending(false)
    }
  }

  const baseBtn =
    'w-full px-4 py-2.5 rounded-[12px] text-sm font-semibold press-effect hover-fade disabled:opacity-60 inline-flex items-center justify-center gap-2'

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Role
        </label>
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={pending}
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-[12px] border outline-none"
            style={{
              background: 'hsl(var(--background-muted))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || role === currentRole}
            onClick={() => updateUser({ role })}
            className="px-3 py-2 rounded-[12px] text-xs font-medium disabled:opacity-40 press-effect hover-fade flex-shrink-0"
            style={{
              background: 'hsl(var(--primary) / 0.1)',
              color: 'hsl(var(--primary))',
              border: '1px solid hsl(var(--primary) / 0.3)',
            }}
          >
            Simpan
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          updateUser(
            { status: isBanned ? 'ACTIVE' : 'BANNED' },
            isBanned
              ? 'Aktifkan kembali akun pengguna ini?'
              : 'Yakin ingin mem-ban pengguna ini? Mereka tidak akan bisa login atau checkout.'
          )
        }
        className={baseBtn}
        style={{
          background: isBanned ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--destructive) / 0.1)',
          color: isBanned ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
          border: `1px solid ${isBanned ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--destructive) / 0.3)'}`,
        }}
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {isBanned ? 'Aktifkan Kembali' : 'Ban Pengguna'}
      </button>

      {error && (
        <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>
          {error}
        </p>
      )}
    </div>
  )
}
