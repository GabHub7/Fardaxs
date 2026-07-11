'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Wallet, Plus, Minus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000]

export function SaldoAdjustForm({ userId, balance }: { userId: string; balance: number }) {
  const router = useRouter()
  const [mode, setMode] = useState<'add' | 'deduct'>('add')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const numericAmount = parseInt(amount, 10) || 0
  const valid = numericAmount > 0

  async function submit() {
    if (!valid) return
    const confirmMsg =
      mode === 'add'
        ? `Tambahkan ${formatCurrency(numericAmount)} ke saldo pengguna ini?`
        : `Kurangi ${formatCurrency(numericAmount)} dari saldo pengguna ini?`
    if (!window.confirm(confirmMsg)) return

    setPending(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/saldo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: mode === 'add' ? numericAmount : -numericAmount,
          description: description.trim() || undefined,
        }),
      })
      const json = (await res.json()) as { success: boolean; message?: string }
      if (!json.success) {
        setError(json.message ?? 'Gagal menyesuaikan saldo')
        return
      }
      setSuccess(json.message ?? 'Saldo berhasil disesuaikan')
      setAmount('')
      setDescription('')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet size={14} style={{ color: 'hsl(var(--foreground-muted))' }} />
        <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Saldo saat ini: <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{formatCurrency(balance)}</span>
        </p>
      </div>

      <div className="flex rounded-[12px] p-1" style={{ background: 'hsl(var(--background-muted))' }}>
        <button
          type="button"
          onClick={() => setMode('add')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-xs font-semibold press-effect"
          style={{
            background: mode === 'add' ? 'hsl(var(--success) / 0.15)' : 'transparent',
            color: mode === 'add' ? 'hsl(var(--success))' : 'hsl(var(--foreground-muted))',
          }}
        >
          <Plus size={12} /> Tambah
        </button>
        <button
          type="button"
          onClick={() => setMode('deduct')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-xs font-semibold press-effect"
          style={{
            background: mode === 'deduct' ? 'hsl(var(--destructive) / 0.15)' : 'transparent',
            color: mode === 'deduct' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground-muted))',
          }}
        >
          <Minus size={12} /> Kurangi
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {QUICK_AMOUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setAmount(String(n))}
            className="py-1.5 rounded-[10px] text-[10px] font-semibold press-effect"
            style={{
              background: amount === String(n) ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--background-muted))',
              color: amount === String(n) ? 'hsl(var(--primary))' : 'hsl(var(--foreground-muted))',
              border: `1px solid ${amount === String(n) ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
            }}
          >
            {(n / 1000).toLocaleString('id-ID')}rb
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Jumlah (Rp)
        </label>
        <input
          inputMode="numeric"
          value={amount ? parseInt(amount, 10).toLocaleString('id-ID') : ''}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          disabled={pending}
          className="w-full px-3 py-2.5 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        />
      </div>

      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Keterangan (opsional)
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Kompensasi kendala sistem"
          disabled={pending}
          className="w-full px-3 py-2.5 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        />
      </div>

      <button
        type="button"
        disabled={pending || !valid}
        onClick={submit}
        className="w-full px-4 py-2.5 rounded-[12px] text-sm font-semibold press-effect hover-fade disabled:opacity-50 inline-flex items-center justify-center gap-2"
        style={{
          background: mode === 'add' ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
          color: '#fff',
        }}
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {mode === 'add' ? 'Tambahkan Saldo' : 'Kurangi Saldo'}
      </button>

      {error && (
        <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs" style={{ color: 'hsl(var(--success))' }}>
          {success}
        </p>
      )}
    </div>
  )
}
