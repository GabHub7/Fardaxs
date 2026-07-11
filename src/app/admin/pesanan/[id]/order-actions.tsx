'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  orderId: string
  canFulfill: boolean
  canCancel: boolean
  canRefund: boolean
  isFailed: boolean
}

/**
 * Admin order actions (fulfill / cancel / refund).
 *
 * Replaces the previous plain <form method="POST"> buttons, which (a) lived in
 * a Server Component yet used onClick/confirm — illegal — and (b) navigated the
 * browser to the raw JSON API response. These now call the API via fetch, show
 * a spinner, confirm destructive actions, surface errors, and refresh the page.
 */
export function OrderActions({ orderId, canFulfill, canCancel, canRefund, isFailed }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function run(action: 'fulfill' | 'cancel' | 'refund', confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError('')
    setPending(action)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/${action}`, { method: 'POST' })
      const json = (await res.json()) as { success: boolean; message?: string }
      if (!json.success) {
        setError(json.message ?? 'Gagal memproses aksi')
        return
      }
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setPending(null)
    }
  }

  const baseBtn = 'w-full px-4 py-2.5 rounded-[12px] text-sm font-semibold press-effect hover-fade disabled:opacity-60 inline-flex items-center justify-center gap-2'

  return (
    <>
      {canFulfill && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run('fulfill')}
          className={baseBtn}
          style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)' }}
        >
          {pending === 'fulfill' && <Loader2 size={14} className="animate-spin" />}
          {isFailed ? '↺ Coba Lagi Fulfillment' : '▶ Proses Manual'}
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run('cancel', 'Yakin ingin membatalkan pesanan ini?')}
          className={baseBtn}
          style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.3)' }}
        >
          {pending === 'cancel' && <Loader2 size={14} className="animate-spin" />}
          Batalkan Pesanan
        </button>
      )}

      {canRefund && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run('refund', 'Yakin ingin memproses refund untuk pesanan ini? Dana akan dikembalikan ke pelanggan.')}
          className={baseBtn}
          style={{ background: 'hsl(var(--warning) / 0.1)', color: 'hsl(var(--warning))', border: '1px solid hsl(var(--warning) / 0.3)' }}
        >
          {pending === 'refund' && <Loader2 size={14} className="animate-spin" />}
          ↩ Proses Refund
        </button>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
      )}
    </>
  )
}
