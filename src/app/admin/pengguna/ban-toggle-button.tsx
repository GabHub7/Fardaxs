'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Bans/unbans a user via the existing PATCH /api/admin/users endpoint, then
 * refreshes the list.
 *
 * (Replaces the old <Link href="/admin/pengguna/[id]/ban"> / ".../unban",
 * which had no matching page route and therefore 404'd — same bug class as
 * the products "toggle status" 404, fixed the same way.)
 */
export function BanToggleButton({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const confirmMsg = isBanned
      ? 'Aktifkan kembali akun pengguna ini?'
      : 'Yakin ingin mem-ban pengguna ini? Mereka tidak akan bisa login atau checkout.'
    if (!window.confirm(confirmMsg)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: isBanned ? 'ACTIVE' : 'BANNED' }),
      })
      const json = (await res.json()) as { success: boolean }
      if (json.success) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="px-3 py-1.5 rounded-[12px] text-xs font-medium press-effect hover-fade disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{
        background: isBanned ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--destructive) / 0.1)',
        color: isBanned ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
        border: `1px solid ${isBanned ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--destructive) / 0.3)'}`,
      }}
    >
      {loading && <Loader2 size={12} className="animate-spin" />}
      {isBanned ? 'Unban' : 'Ban'}
    </button>
  )
}
