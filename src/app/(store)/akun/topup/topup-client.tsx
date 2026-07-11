'use client'

import { useState } from 'react'
import { Wallet, Check, Loader2, AlertCircle, ExternalLink, QrCode, Copy, ClipboardCheck } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { formatCurrency } from '@/lib/utils'
import { QrisCode } from '@/components/qris-code'

const NOMINAL_OPTIONS = [10000, 25000, 50000, 100000, 200000, 500000]

const METHODS = [
  { id: 'QRIS', label: 'QRIS' },
  { id: 'DANA', label: 'DANA' },
  { id: 'GOPAY', label: 'GoPay' },
  { id: 'OVO', label: 'OVO' },
  { id: 'SHOPEEPAY', label: 'ShopeePay' },
]

interface TopupResult {
  invoiceNumber: string
  amount: number
  method: string
  paymentUrl: string | null
  qrUrl: string | null
  paymentCode: string | null
  expiredAt: string
}

interface RecentMutation {
  id: string
  type: string
  amount: number
  description: string | null
  created_at: string
}

const MUTATION_LABELS: Record<string, string> = {
  TOP_UP: 'Top Up',
  PURCHASE: 'Pembelian',
  REFUND: 'Refund',
  BONUS: 'Bonus',
  REFERRAL_COMMISSION: 'Komisi Referral',
  ADJUSTMENT: 'Penyesuaian Admin',
}

export function TopUpClient({ balance, recent }: { balance: number; recent: RecentMutation[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [method, setMethod] = useState('QRIS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TopupResult | null>(null)
  const [copied, setCopied] = useState(false)

  const amount = selected ?? (custom ? parseInt(custom.replace(/\D/g, ''), 10) : 0)
  const valid = amount >= 10000

  function pickNominal(n: number) {
    setSelected(n)
    setCustom('')
    setError(null)
  }

  function onCustomChange(v: string) {
    const digits = v.replace(/\D/g, '')
    setCustom(digits)
    setSelected(null)
    setError(null)
  }

  async function submit() {
    if (!valid) {
      setError('Minimal top up Rp10.000.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.message ?? 'Gagal membuat top up.')
        return
      }
      setResult(json.data as TopupResult)
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }

  // ── Result / payment screen ──────────────────────────────────────────────
  if (result) {
    return (
      <div className="px-4 py-5 space-y-5 animate-fade-in-up">
        <div className="rounded-[20px] p-5 text-center" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
          <div className="w-14 h-14 rounded-full bg-amber-400/15 flex items-center justify-center mx-auto mb-3">
            <Loader2 size={26} className="text-amber-500 animate-spin" />
          </div>
          <p className="text-sm font-semibold" style={{ color: MOCK.foreground }}>Menunggu Pembayaran</p>
          <p className="text-2xl font-extrabold mt-1" style={{ color: MOCK.foreground }}>{formatCurrency(result.amount)}</p>
          <p className="text-xs mt-1" style={{ color: MOCK.foregroundMuted }}>via {result.method}</p>
        </div>

        {result.qrUrl && (
          <div className="rounded-[20px] p-5 flex flex-col items-center" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <QrCode size={16} style={{ color: MOCK.primaryLight }} />
              <span className="text-xs font-semibold" style={{ color: MOCK.foreground }}>Scan QRIS</span>
            </div>
            <QrisCode data={result.qrUrl} className="w-52 h-52 rounded-[12px] bg-white p-2" />
          </div>
        )}

        {result.paymentCode && (
          <div className="rounded-[16px] p-4" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
            <p className="text-[11px] mb-1.5" style={{ color: MOCK.foregroundMuted }}>Nomor Pembayaran</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-base font-mono font-bold tracking-wide" style={{ color: MOCK.foreground }}>
                {result.paymentCode}
              </span>
              <button
                onClick={() => copyCode(result.paymentCode!)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-[10px] press-effect"
                style={{ background: `${MOCK.primary}1a`, color: MOCK.primaryLight }}
              >
                {copied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
          </div>
        )}

        {result.paymentUrl && (
          <a
            href={result.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-semibold text-white press-effect"
            style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
          >
            <ExternalLink size={16} />
            Buka Halaman Pembayaran
          </a>
        )}

        <button
          onClick={() => { setResult(null); setSelected(null); setCustom('') }}
          className="w-full rounded-[14px] py-3 text-sm font-semibold press-effect"
          style={{ border: `1px solid ${MOCK.border}`, color: MOCK.foregroundMuted }}
        >
          Top Up Lagi
        </button>
      </div>
    )
  }

  // ── Top-up form ──────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-5 space-y-5 animate-fade-in-up">
      {/* Balance */}
      <div className="rounded-[20px] p-5 flex items-center gap-4" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}>
          <Wallet size={22} className="text-white" />
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: MOCK.foregroundMuted }}>Saldo Aktif</p>
          <p className="text-xl font-bold" style={{ color: MOCK.foreground }}>{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Nominal */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: MOCK.foreground }}>Pilih Nominal</p>
        <div className="grid grid-cols-3 gap-3">
          {NOMINAL_OPTIONS.map((n) => {
            const active = selected === n
            return (
              <button
                key={n}
                onClick={() => pickNominal(n)}
                className="py-3.5 rounded-[14px] text-sm font-bold press-effect transition-all"
                style={{
                  background: active ? `${MOCK.primary}1a` : MOCK.bgMuted,
                  border: `1.5px solid ${active ? MOCK.primary : MOCK.border}`,
                  color: active ? MOCK.primaryLight : MOCK.foreground,
                }}
              >
                {formatCurrency(n)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: MOCK.foreground }}>Atau Nominal Lain</p>
        <div className="flex items-center rounded-[14px] px-4" style={{ background: MOCK.bgMuted, border: `1.5px solid ${custom ? MOCK.primary : MOCK.border}` }}>
          <span className="text-sm font-semibold" style={{ color: MOCK.foregroundMuted }}>Rp</span>
          <input
            inputMode="numeric"
            value={custom ? parseInt(custom, 10).toLocaleString('id-ID') : ''}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="0"
            className="flex-1 bg-transparent py-3.5 px-2 text-sm font-bold outline-none"
            style={{ color: MOCK.foreground }}
          />
        </div>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: MOCK.foreground }}>Metode Pembayaran</p>
        <div className="grid grid-cols-4 gap-2">
          {METHODS.map((m) => {
            const active = method === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className="py-2.5 rounded-[12px] text-[11px] font-semibold press-effect transition-all"
                style={{
                  background: active ? `${MOCK.primary}1a` : MOCK.bgMuted,
                  border: `1.5px solid ${active ? MOCK.primary : MOCK.border}`,
                  color: active ? MOCK.primaryLight : MOCK.foregroundMuted,
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[12px] p-3 text-xs animate-fade-in" style={{ background: MOCK.destructiveBg, color: MOCK.destructive }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={loading || !valid}
        className="w-full flex items-center justify-center gap-2 rounded-[14px] py-4 text-sm font-bold text-white press-effect transition-all disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
        {loading ? 'Memproses...' : valid ? `Top Up ${formatCurrency(amount)}` : 'Top Up Sekarang'}
      </button>

      {/* Recent wallet mutations — covers top ups, admin adjustments, refunds, etc. */}
      {recent.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2.5" style={{ color: MOCK.foreground }}>Riwayat Saldo</p>
          <div className="rounded-[16px] overflow-hidden" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
            {recent.map((m, i) => {
              const isCredit = m.amount >= 0
              const c = isCredit ? MOCK.success : MOCK.destructive
              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i > 0 ? `1px solid ${MOCK.border}` : 'none' }}>
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold truncate" style={{ color: MOCK.foreground }}>
                      {MUTATION_LABELS[m.type] ?? m.type}
                    </p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: MOCK.foregroundMuted }}>
                      {m.description ?? '-'} · {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold flex-shrink-0" style={{ color: c }}>
                    {isCredit ? '+' : '-'}{formatCurrency(Math.abs(m.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
