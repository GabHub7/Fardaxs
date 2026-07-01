import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from '@/lib/utils'
import { ShoppingBag, ChevronRight, ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'
import type { OrderStatus } from '@/types'

export const metadata: Metadata = { title: 'Pesanan Saya' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface FilterTab {
  label: string
  value: string
  statuses: OrderStatus[]
}

const FILTER_TABS: FilterTab[] = [
  { label: 'Semua', value: 'semua', statuses: [] },
  { label: 'Pending', value: 'pending', statuses: ['PENDING_PAYMENT', 'PAID'] },
  { label: 'Diproses', value: 'diproses', statuses: ['PROCESSING'] },
  { label: 'Selesai', value: 'selesai', statuses: ['SUCCESS', 'REFUNDED'] },
  { label: 'Gagal', value: 'gagal', statuses: ['FAILED', 'EXPIRED', 'CANCELLED'] },
]

interface PageProps {
  searchParams: Promise<{
    status?: string
    page?: string
  }>
}

export default async function PesananPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/akun/pesanan')

  const { status: statusParam = 'semua', page: pageParam = '1' } =
    await searchParams

  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)
  const activeTab = FILTER_TABS.find((t) => t.value === statusParam) ?? FILTER_TABS[0]

  const serviceClient = createServiceClient()

  // Get user internal id
  const { data: profile } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  const userId = profile?.id ?? ''

  // Build query
  let query = serviceClient
    .from('orders')
    .select(
      'id, order_number, status, price, created_at, product:products(name)',
      { count: 'exact' },
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)

  if (activeTab.statuses.length > 0) {
    query = query.in('status', activeTab.statuses)
  }

  const { data: orders, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Build URL helper
  const buildUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams()
    if (statusParam !== 'semua') p.set('status', statusParam)
    if (currentPage !== 1) p.set('page', String(currentPage))
    Object.entries(params).forEach(([k, v]) => {
      if (v === '' || (k === 'page' && v === '1') || (k === 'status' && v === 'semua')) {
        p.delete(k)
      } else {
        p.set(k, v)
      }
    })
    const qs = p.toString()
    return `/akun/pesanan${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div
        className="rounded-[20px] border p-1.5 flex gap-1 overflow-x-auto scrollbar-none"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        {FILTER_TABS.map((tab) => {
          const active = tab.value === activeTab.value
          return (
            <Link
              key={tab.value}
              href={buildUrl({ status: tab.value, page: '1' })}
              className="px-4 py-2 rounded-[14px] text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150"
              style={
                active
                  ? {
                      background: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                    }
                  : {
                      color: 'hsl(var(--foreground-muted))',
                    }
              }
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Orders list */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        {!orders || orders.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <ShoppingBag
              size={44}
              className="mx-auto mb-3 opacity-25"
              style={{ color: 'hsl(var(--foreground-muted))' }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Tidak ada pesanan
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: 'hsl(var(--foreground-muted))' }}
            >
              {activeTab.value === 'semua'
                ? 'Kamu belum pernah melakukan pemesanan.'
                : `Tidak ada pesanan dengan status "${activeTab.label}".`}
            </p>
            {activeTab.value === 'semua' && (
              <Link
                href="/"
                className="inline-block mt-4 px-5 py-2 rounded-[12px] text-xs font-semibold"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                }}
              >
                Mulai Belanja
              </Link>
            )}
          </div>
        ) : (
          <ul>
            {orders.map((order, idx) => {
              const productName =
                Array.isArray(order.product)
                  ? (order.product[0] as { name: string } | null)?.name
                  : (order.product as { name: string } | null)?.name

              const statusColorClass = getStatusColor(order.status as OrderStatus)
              const isLast = idx === orders.length - 1

              return (
                <li
                  key={order.id}
                  className={!isLast ? 'border-b' : ''}
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <Link
                    href={
                      order.status === 'PENDING_PAYMENT'
                        ? `/pembayaran/${order.id}`
                        : `/pesanan/${order.id}`
                    }
                    className="flex items-center gap-3 sm:gap-4 px-5 py-4 transition-colors group"
                    style={{ color: 'inherit' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'hsl(var(--background-muted))'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = ''
                    }}
                  >
                    {/* Product icon */}
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background: 'hsl(var(--primary)/0.12)',
                        color: 'hsl(var(--primary))',
                      }}
                    >
                      {(productName ?? '?').charAt(0).toUpperCase()}
                    </div>

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-mono font-semibold"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {order.order_number}
                      </p>
                      <p
                        className="text-xs truncate mt-0.5"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {productName ?? '—'}
                      </p>
                      <p
                        className="text-[10px] mt-1"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusColorClass}`}
                      >
                        {getStatusLabel(order.status as OrderStatus)}
                      </span>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {formatCurrency(order.price ?? 0)}
                      </p>
                    </div>

                    <ChevronRight
                      size={14}
                      className="shrink-0"
                      style={{ color: 'hsl(var(--foreground-muted))' }}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Link
            href={buildUrl({ page: String(currentPage - 1) })}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-sm font-medium border transition-colors ${
              currentPage <= 1 ? 'pointer-events-none opacity-40' : ''
            }`}
            style={{
              background: 'hsl(var(--background-card))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
            aria-disabled={currentPage <= 1}
          >
            <ChevronLeft size={16} />
            Sebelumnya
          </Link>

          <span
            className="text-xs font-medium"
            style={{ color: 'hsl(var(--foreground-muted))' }}
          >
            Halaman {currentPage} dari {totalPages}
          </span>

          <Link
            href={buildUrl({ page: String(currentPage + 1) })}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-sm font-medium border transition-colors ${
              currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''
            }`}
            style={{
              background: 'hsl(var(--background-card))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
            aria-disabled={currentPage >= totalPages}
          >
            Berikutnya
            <ChevronRight size={16} />
          </Link>
        </div>
      )}
    </div>
  )
}
