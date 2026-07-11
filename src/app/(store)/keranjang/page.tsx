'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ShoppingBag, ArrowLeft, ShoppingCart } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { formatCurrency } from '@/lib/utils'

interface CartItem {
  id: string
  name: string
  slug: string
  image_url?: string
  price: number
  quantity: number
  variant?: string
}

const CART_KEY = 'fardax_cart'

function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('fardax_cart_update'))
}

export default function KeranjangPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setItems(getCart())
    setMounted(true)

    const onUpdate = () => setItems(getCart())
    window.addEventListener('fardax_cart_update', onUpdate)
    return () => window.removeEventListener('fardax_cart_update', onUpdate)
  }, [])

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    saveCart(updated)
  }

  const updateQty = (id: string, delta: number) => {
    const updated = items.map(i =>
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    )
    setItems(updated)
    saveCart(updated)
  }

  const clearCart = () => {
    setItems([])
    saveCart([])
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  if (!mounted) return null

  return (
    <div className="min-h-screen" style={{ background: MOCK.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3"
        style={{ background: MOCK.bg, borderBottom: `1px solid ${MOCK.borderSubtle}` }}
      >
        <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 rounded-full" style={{ background: MOCK.bgCard }}>
          <ArrowLeft size={18} style={{ color: MOCK.foreground }} />
        </button>
        <h1 className="flex-1 text-base font-bold" style={{ color: MOCK.foreground }}>Keranjang</h1>
        {items.length > 0 && (
          <button onClick={clearCart} className="text-xs font-medium" style={{ color: MOCK.destructive }}>
            Kosongkan
          </button>
        )}
      </header>

      <div className="px-4 py-4 space-y-3 pb-40">
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: MOCK.bgMuted }}>
              <ShoppingCart size={36} style={{ color: MOCK.foregroundFaint }} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold mb-1" style={{ color: MOCK.foreground }}>Keranjang Kosong</p>
              <p className="text-sm" style={{ color: MOCK.foregroundMuted }}>Belum ada produk yang ditambahkan</p>
            </div>
            <Link
              href="/produk"
              className="mt-2 px-6 py-3 rounded-[14px] text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
            >
              Lihat Produk
            </Link>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[16px] p-3"
              style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
            >
              {/* Image */}
              <div
                className="w-14 h-14 rounded-[12px] overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: MOCK.bgCard }}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag size={22} style={{ color: MOCK.foregroundFaint }} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: MOCK.foreground }}>{item.name}</p>
                {item.variant && (
                  <p className="text-xs mt-0.5" style={{ color: MOCK.foregroundMuted }}>{item.variant}</p>
                )}
                <p className="text-sm font-bold mt-1" style={{ color: MOCK.primaryLight }}>
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>

              {/* Qty + Remove */}
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => removeItem(item.id)}>
                  <Trash2 size={15} style={{ color: MOCK.destructive }} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: MOCK.bgCard, color: MOCK.foreground }}
                  >−</button>
                  <span className="text-sm font-bold w-4 text-center" style={{ color: MOCK.foreground }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: MOCK.primary, color: '#fff' }}
                  >+</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout bar */}
      {items.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 md:left-60 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4"
          style={{ background: MOCK.bgCard, borderTop: `1px solid ${MOCK.border}` }}
        >
          <div className="px-4 md:max-w-4xl md:mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: MOCK.foregroundMuted }}>
                Total ({items.reduce((s, i) => s + i.quantity, 0)} item)
              </span>
              <span className="text-lg font-bold" style={{ color: MOCK.foreground }}>
                {formatCurrency(total)}
              </span>
            </div>
            <Link
              href={items[0]?.slug ? `/produk/${items[0].slug}` : '/produk'}
              className="block text-center py-3.5 rounded-[14px] text-sm font-semibold text-white md:max-w-xs"
              style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
            >
              Lanjut ke Produk
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
