'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiResponse, CheckoutResponse } from '@/types'
import {
  CreditCard,
  Smartphone,
  Wallet,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react'

type PaymentMethod =
  | 'QRIS'
  | 'VA_BCA'
  | 'VA_BNI'
  | 'VA_BRI'
  | 'VA_MANDIRI'
  | 'GOPAY'
  | 'OVO'
  | 'DANA'
  | 'SHOPEEPAY'

interface PaymentOption {
  id: PaymentMethod
  label: string
  shortLabel: string
  icon: string
  category: 'qris' | 'va' | 'ewallet'
  fee: string
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'QRIS', label: 'QRIS', shortLabel: 'QRIS', icon: '📱', category: 'qris', fee: '0.7%' },
  { id: 'VA_BCA', label: 'Virtual Account BCA', shortLabel: 'BCA', icon: '🏦', category: 'va', fee: 'Rp4.000' },
  { id: 'VA_BNI', label: 'Virtual Account BNI', shortLabel: 'BNI', icon: '🏦', category: 'va', fee: 'Rp4.000' },
  { id: 'VA_BRI', label: 'Virtual Account BRI', shortLabel: 'BRI', icon: '🏦', category: 'va', fee: 'Rp4.000' },
  { id: 'VA_MANDIRI', label: 'Virtual Account Mandiri', shortLabel: 'Mandiri', icon: '🏦', category: 'va', fee: 'Rp4.000' },
  { id: 'GOPAY', label: 'GoPay', shortLabel: 'GoPay', icon: '💚', category: 'ewallet', fee: '2%' },
  { id: 'OVO', label: 'OVO', shortLabel: 'OVO', icon: '💜', category: 'ewallet', fee: '2%' },
  { id: 'DANA', label: 'DANA', shortLabel: 'DANA', icon: '💙', category: 'ewallet', fee: '1.5%' },
  { id: 'SHOPEEPAY', label: 'ShopeePay', shortLabel: 'SPay', icon: '🧡', category: 'ewallet', fee: '1.5%' },
]

const CATEGORY_LABELS: Record<string, string> = {
  qris: 'QRIS',
  va: 'Transfer Bank',
  ewallet: 'E-Wallet',
}

function calculateFee(amount: number, method: PaymentMethod): number {
  switch (method) {
    case 'QRIS': return Math.round(amount * 0.007)
    case 'VA_BCA':
    case 'VA_BNI':
    case 'VA_BRI':
    case 'VA_MANDIRI': return 4000
    case 'GOPAY':
    case 'OVO': return Math.round(amount * 0.02)
    case 'DANA':
    case 'SHOPEEPAY': return Math.round(amount * 0.015)
    default: return 0
  }
}

interface Variant {
  id: string
  name: string
  selling_price: number
  reseller_price: number
  base_cost: number
  provider_product_code: string | null
  sort_order: number
}

interface Props {
  productId: string
  productName: string
  price: number
  targetType: string
  targetLabel: string
  targetPlaceholder: string
  targetValidation: string | null
  variants?: Variant[]
}

export function ProductOrderForm({
  productId,
  productName,
  price,
  targetType,
  targetLabel,
  targetPlaceholder,
  targetValidation,
  variants = [],
}: Props) {
  const router = useRouter()
  const [target, setTarget] = useState('')
  const [targetError, setTargetError] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [showAllMethods, setShowAllMethods] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null
  )

  const hasVariants = variants.length > 0
  const selectedVariant = hasVariants ? variants.find((v) => v.id === selectedVariantId) ?? variants[0] : null
  const activePrice = selectedVariant ? selectedVariant.selling_price : price

  const fee = selectedMethod ? calculateFee(activePrice, selectedMethod) : 0
  const total = activePrice + fee

  const visibleOptions = showAllMethods ? PAYMENT_OPTIONS : PAYMENT_OPTIONS.slice(0, 4)

  function validateTarget(value: string): string {
    if (!value.trim()) return `${targetLabel} wajib diisi`
    if (targetType === 'PHONE') {
      if (!/^[0-9]{8,15}$/.test(value.replace(/\D/g, ''))) {
        return 'Nomor tidak valid (8–15 digit angka)'
      }
    }
    if (targetValidation) {
      try {
        const regex = new RegExp(targetValidation)
        if (!regex.test(value)) return `Format ${targetLabel} tidak valid`
      } catch {
        // skip invalid regex
      }
    }
    return ''
  }

  function handleTargetChange(value: string) {
    setTarget(value)
    if (targetError) setTargetError(validateTarget(value))
  }

  async function handleSubmit() {
    const tErr = validateTarget(target)
    if (tErr) { setTargetError(tErr); return }
    if (!selectedMethod) { setApiError('Pilih metode pembayaran terlebih dahulu'); return }

    setApiError('')
    setLoading(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          variant_id: selectedVariantId ?? undefined,
          target: target.trim(),
          quantity: 1,
          payment_method: selectedMethod,
        }),
      })

      const json: ApiResponse<CheckoutResponse> = await res.json()

      if (!json.success || !json.data) {
        setApiError(json.message ?? 'Gagal membuat pesanan')
        return
      }

      router.push(`/pembayaran/${json.data.order_id}`)
    } catch {
      setApiError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // Group payment options by category
  const grouped = visibleOptions.reduce<Record<string, PaymentOption[]>>((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = []
    acc[opt.category].push(opt)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Variant Picker */}
      {hasVariants && (
        <div
          className="rounded-[20px] border p-4 space-y-3"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Pilih Varian
          </span>
          <div className="grid grid-cols-1 gap-2">
            {variants.map((v) => {
              const isSelected = selectedVariantId === v.id
              const hasDiscount = v.base_cost > 0 && v.base_cost > v.selling_price
              const discountPct = hasDiscount
                ? Math.round(((v.base_cost - v.selling_price) / v.base_cost) * 100)
                : 0
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className="rounded-[14px] border p-3 text-left transition-all press-effect"
                  style={{
                    background: isSelected ? 'hsl(var(--primary)/0.08)' : 'hsl(var(--background))',
                    borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    borderWidth: isSelected ? '1.5px' : '1px',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                        style={{
                          borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                          background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                        }}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}
                      >
                        {v.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasDiscount && (
                        <span className="text-[10px] line-through" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          {formatCurrency(v.base_cost)}
                        </span>
                      )}
                      <span
                        className="text-sm font-bold"
                        style={{ color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}
                      >
                        {formatCurrency(v.selling_price)}
                      </span>
                      {hasDiscount && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: 'hsl(var(--destructive)/0.12)', color: 'hsl(var(--destructive))' }}
                        >
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Target Input */}
      <div
        className="rounded-[20px] border p-4 space-y-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <label className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          {targetLabel}
        </label>
        <input
          type={targetType === 'PHONE' ? 'tel' : 'text'}
          value={target}
          onChange={e => handleTargetChange(e.target.value)}
          placeholder={targetPlaceholder}
          inputMode={targetType === 'PHONE' ? 'numeric' : 'text'}
          className="w-full rounded-[12px] px-3.5 py-2.5 text-sm outline-none transition-all"
          style={{
            background: 'hsl(var(--background))',
            border: `1.5px solid ${targetError ? 'hsl(var(--destructive))' : 'hsl(var(--border))'}`,
            color: 'hsl(var(--foreground))',
          }}
        />
        {targetError && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(var(--destructive))' }}>
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {targetError}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div
        className="rounded-[20px] border p-4 space-y-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Metode Pembayaran
        </span>

        {Object.entries(grouped).map(([category, opts]) => (
          <div key={category}>
            <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--foreground-muted))' }}>
              {CATEGORY_LABELS[category]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {opts.map(opt => {
                const isSelected = selectedMethod === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedMethod(opt.id)}
                    className="rounded-[12px] border p-3 text-left transition-all"
                    style={{
                      background: isSelected ? 'hsl(var(--primary)/0.12)' : 'hsl(var(--background))',
                      borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      borderWidth: isSelected ? '1.5px' : '1px',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{opt.icon}</span>
                      <div>
                        <p
                          className="text-xs font-semibold leading-tight"
                          style={{ color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}
                        >
                          {opt.shortLabel}
                        </p>
                        <p className="text-[10px]" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          +{opt.fee}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setShowAllMethods(v => !v)}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'hsl(var(--primary))' }}
        >
          {showAllMethods ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Sembunyikan</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Lihat semua metode</>
          )}
        </button>
      </div>

      {/* Order Summary */}
      {selectedMethod && (
        <div
          className="rounded-[20px] border p-4 space-y-2.5"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Ringkasan Pesanan
          </p>
          <div className="space-y-1.5 text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {selectedVariant && (
              <div className="flex justify-between text-[11px] pb-1" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <span style={{ color: 'hsl(var(--foreground-muted))' }}>Varian</span>
                <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{selectedVariant.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Harga produk</span>
              <span>{formatCurrency(activePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span>Biaya transaksi</span>
              <span>{formatCurrency(fee)}</span>
            </div>
            <div
              className="flex justify-between pt-2 border-t font-semibold text-sm"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              <span>Total</span>
              <span style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {apiError && (
        <div
          className="flex items-start gap-2 rounded-[12px] p-3 text-sm"
          style={{ background: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' }}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {apiError}
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        loading={loading}
        disabled={loading}
      >
        {!loading && <ShoppingCart className="h-4 w-4 mr-2" />}
        {loading ? 'Memproses...' : 'Beli Sekarang'}
      </Button>

      <p className="text-center text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
        Dengan menekan tombol di atas, kamu menyetujui{' '}
        <a href="/syarat-ketentuan" className="underline" style={{ color: 'hsl(var(--primary))' }}>
          Syarat & Ketentuan
        </a>
      </p>
    </div>
  )
}
