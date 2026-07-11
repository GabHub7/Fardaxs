'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Toggles a product between ACTIVE and INACTIVE via the existing PATCH
 * /api/admin/products/[id] endpoint, then refreshes the list.
 *
 * (Replaces the old form POST to /toggle-status, which had no route handler
 * and therefore 404'd.)
 */
export function ToggleStatusButton({
  productId,
  currentStatus,
}: {
  productId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isActive = currentStatus === 'ACTIVE'

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isActive ? 'INACTIVE' : 'ACTIVE' }),
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-medium press-effect hover-fade disabled:opacity-60"
      style={{
        background: isActive ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--success) / 0.1)',
        color: isActive ? 'hsl(var(--destructive))' : 'hsl(var(--success))',
        border: `1px solid ${isActive ? 'hsl(var(--destructive) / 0.3)' : 'hsl(var(--success) / 0.3)'}`,
      }}
    >
      {loading && <Loader2 size={12} className="animate-spin" />}
      {isActive ? 'Nonaktifkan' : 'Aktifkan'}
    </button>
  )
}
