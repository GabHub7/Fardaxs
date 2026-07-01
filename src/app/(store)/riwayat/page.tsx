import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SlidersHorizontal, ShoppingBag } from 'lucide-react'
import { PageHeader, HeaderIconButton } from '@/components/store/page-header'
import { ProductLogo } from '@/components/store/product-logo'
import { MOCK } from '@/lib/mockup-colors'
import { formatCurrency } from '@/lib/utils'
import { getCurrentUserProfile } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'

export const metadata: Metadata = { title: 'Riwayat' }
export const dynamic = 'force-dynamic'

type FilterTab = 'semua' | 'sukses' | 'pending' | 'gagal'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'sukses', label: 'Sukses' },
  { key: 'pending', label: 'Pending' },
  { key: 'gagal', label: 'Gagal' },
]

const PENDING_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING']
const FAILED_STATUSES: OrderStatus[] = ['FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED']

function statusBadge(status: OrderStatus): { label: string; color: string; bg: string } {
  if (status === 'SUCCESS') return { label: 'Sukses', color: MOCK.success, bg: MOCK.successBg }
  if (PENDING_STATUSES.includes(status)) return { label: 'Pending', color: MOCK.warning, bg: MOCK.warningBg }
  return { label: 'Gagal', color: MOCK.destructive, bg: MOCK.destructiveBg }
}

function dateGroupLabel(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (isSameDay(date, today)) return 'Hari Ini'
  if (isSameDay(date, yesterday)) return 'Kemarin'

  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateString))
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function RiwayatPage({ searchParams }: PageProps) {
  const { status: rawTab } = await searchParams
  const activeTab: FilterTab = (['semua', 'sukses', 'pending', 'gagal'] as const).includes(
    rawTab as FilterTab
  )
    ? (rawTab as FilterTab)
    : 'semua'

  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/riwayat')

  let query = session.serviceClient
    .from('orders')
    .select('id, order_number, status, price, created_at, product:products(name, image_url)')
    .eq('user_id', session.profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (activeTab === 'sukses') query = query.eq('status', 'SUCCESS')
  if (activeTab === 'pending') query = query.in('status', PENDING_STATUSES)
  if (activeTab === 'gagal') query = query.in('status', FAILED_STATUSES)

  const { data: orderRows } = await query

  interface OrderRow {
    id: string
    order_number: string
    status: OrderStatus
    price: number
    created_at: string
    product: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null
  }

  const orders = (orderRows ?? []) as OrderRow[]

  // Group by date label, preserving the already-descending sort order.
  const groups: { label: string; items: OrderRow[] }[] = []
  for (const order of orders) {
    const label = dateGroupLabel(order.created_at)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(order)
    } else {
      groups.push({ label, items: [order] })
    }
  }

  return (
    <div className="pb-6">
      <PageHeader
        left={
          <h1 className="text-xl font-bold" style={{ color: MOCK.foreground }}>
            Riwayat
          </h1>
        }
        right={
          <HeaderIconButton ariaLabel="Filter">
            <SlidersHorizontal size={18} style={{ color: MOCK.foreground }} />
          </HeaderIconButton>
        }
      />

      <div className="px-4 pt-4 space-y-5">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {TABS.map((tab) => {
            const active = tab.key === activeTab
            return (
              <Link
                key={tab.key}
                href={tab.key === 'semua' ? '/riwayat' : `/riwayat?status=${tab.key}`}
                className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  background: active ? 'transparent' : 'transparent',
                  color: active ? MOCK.primaryLight : MOCK.foregroundMuted,
                  border: `1.5px solid ${active ? MOCK.primaryLight : MOCK.border}`,
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Order list */}
        {orders.length === 0 ? (
          <div
            className="rounded-[16px] p-8 text-center"
            style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
          >
            <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" style={{ color: MOCK.foregroundMuted }} />
            <p className="text-sm mb-3" style={{ color: MOCK.foregroundMuted }}>
              Belum ada riwayat transaksi
            </p>
            <Link
              href="/produk"
              className="inline-block px-4 py-2 rounded-[12px] text-xs font-semibold text-white"
              style={{ background: MOCK.primary }}
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label}>
              <h2 className="text-sm font-semibold mb-2.5" style={{ color: MOCK.foregroundMuted }}>
                {group.label}
              </h2>
              <div className="space-y-2.5">
                {group.items.map((order) => {
                  const product = Array.isArray(order.product) ? order.product[0] : order.product
                  const badge = statusBadge(order.status)
                  const detailHref =
                    order.status === 'PENDING_PAYMENT' ? `/pembayaran/${order.id}` : `/pesanan/${order.id}`

                  return (
                    <Link
                      key={order.id}
                      href={detailHref}
                      className="flex items-center gap-3 rounded-[16px] p-3"
                      style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
                    >
                      <ProductLogo imageUrl={product?.image_url} name={product?.name ?? 'Produk'} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold truncate" style={{ color: MOCK.foreground }}>
                            {product?.name ?? 'Produk'}
                          </p>
                          <span
                            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: badge.color, background: badge.bg }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: MOCK.foregroundFaint }}>
                          Order ID #{order.order_number}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px]" style={{ color: MOCK.foregroundFaint }}>
                            {formatTime(order.created_at)}
                          </span>
                          <span className="text-xs font-bold" style={{ color: MOCK.foreground }}>
                            {formatCurrency(order.price)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
