import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime, getStatusLabel, getStatusColor, sanitizeSearchTerm } from '@/lib/utils'
import type { OrderStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string
  order_number: string
  target: string
  price: number
  gateway_fee: number | null
  status: OrderStatus
  payment_method: string | null
  created_at: string
  users: { email: string; full_name: string | null } | null
  products: { name: string } | null
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

const LIMIT = 20

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'Semua', value: '' },
  { label: 'Pending', value: 'PENDING_PAYMENT' },
  { label: 'Dibayar', value: 'PAID' },
  { label: 'Diproses', value: 'PROCESSING' },
  { label: 'Sukses', value: 'SUCCESS' },
  { label: 'Gagal', value: 'FAILED' },
  { label: 'Kedaluwarsa', value: 'EXPIRED' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function PesananPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = params.status ?? ''
  const search = params.search ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * LIMIT

  const supabase = createServiceClient()

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, target, price, gateway_fee, status, payment_method, created_at, users(email, full_name), products(name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + LIMIT - 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    const safeSearch = sanitizeSearchTerm(search)
    if (safeSearch) query = query.or(`order_number.ilike.%${safeSearch}%,users.email.ilike.%${safeSearch}%`)
  }

  const { data: orders, count, error } = await query

  const totalPages = Math.ceil((count ?? 0) / LIMIT)
  const rows = (orders as unknown as OrderRow[]) ?? []

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Pesanan
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {count ?? 0} total pesanan
          </p>
        </div>
        <a
          href={`/api/admin/orders?format=csv${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
          className="px-4 py-2 rounded-[12px] text-sm font-semibold"
          style={{
            background: 'hsl(var(--background-muted))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          ↓ Export CSV
        </a>
      </div>

      {/* Filter tabs */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div
          className="flex gap-1 p-3 overflow-x-auto"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.value
            return (
              <Link
                key={tab.value}
                href={`/admin/pesanan?status=${tab.value}&search=${search}&page=1`}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                style={{
                  background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))',
                  color: isActive ? 'hsl(var(--primary-foreground, 0 0% 100%))' : 'hsl(var(--foreground-muted))',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Search bar */}
        <form method="GET" action="/admin/pesanan" className="p-3">
          <div className="flex gap-2">
            <input
              type="hidden"
              name="status"
              value={status}
            />
            <input
              name="search"
              type="text"
              defaultValue={search}
              placeholder="Cari nomor pesanan atau email customer..."
              className="flex-1 px-3 py-2 text-sm rounded-[12px] border outline-none"
              style={{
                background: 'hsl(var(--background-muted))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-[12px] text-sm font-medium"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground, 0 0% 100%))',
              }}
            >
              Cari
            </button>
            {search && (
              <Link
                href={`/admin/pesanan?status=${status}&page=1`}
                className="px-4 py-2 rounded-[12px] text-sm font-medium"
                style={{
                  background: 'hsl(var(--background-muted))',
                  color: 'hsl(var(--foreground-muted))',
                }}
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        {error ? (
          <div className="p-8 text-center text-sm" style={{ color: 'hsl(var(--destructive))' }}>
            Gagal memuat data: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Tidak ada pesanan ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['No.', 'Nomor Pesanan', 'Produk', 'Customer', 'Metode', 'Total', 'Status', 'Tanggal', 'Aksi'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((order, idx) => {
                  const statusColor = getStatusColor(order.status)
                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      className="hover:bg-[hsl(var(--background-muted))] transition-colors"
                    >
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {offset + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-xs font-semibold"
                          style={{ color: 'hsl(var(--primary))' }}
                        >
                          {order.order_number}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 max-w-[160px]"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        <span className="truncate block">{order.products?.name ?? '-'}</span>
                        <span
                          className="text-xs block truncate"
                          style={{ color: 'hsl(var(--foreground-muted))' }}
                        >
                          {order.target}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="block text-sm"
                          style={{ color: 'hsl(var(--foreground))' }}
                        >
                          {order.users?.full_name ?? '-'}
                        </span>
                        <span
                          className="text-xs block"
                          style={{ color: 'hsl(var(--foreground-muted))' }}
                        >
                          {order.users?.email ?? '-'}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {order.payment_method ?? '-'}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold text-sm whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {formatCurrency(order.price + (order.gateway_fee ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/pesanan/${order.id}`}
                          className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                          style={{
                            background: 'hsl(var(--background-muted))',
                            color: 'hsl(var(--foreground))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/pesanan?status=${status}&search=${search}&page=${page - 1}`}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                style={{
                  background: 'hsl(var(--background-card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/pesanan?status=${status}&search=${search}&page=${page + 1}`}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground, 0 0% 100%))',
                }}
              >
                Berikutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
