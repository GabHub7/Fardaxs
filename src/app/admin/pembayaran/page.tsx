import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { PaymentStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string
  gateway: string
  gateway_transaction_id: string | null
  amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
  invoices: {
    invoice_number: string
    order_id: string
    orders: {
      order_number: string
      user_id: string
    } | null
  } | null
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    page?: string
  }>
}

const LIMIT = 25

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'Semua', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Dibayar', value: 'PAID' },
  { label: 'Gagal', value: 'FAILED' },
  { label: 'Kedaluwarsa', value: 'EXPIRED' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function PembayaranPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * LIMIT

  const supabase = createServiceClient()

  let query = supabase
    .from('payments')
    .select(
      'id, gateway, gateway_transaction_id, amount, status, paid_at, created_at, invoices(invoice_number, order_id, orders(order_number, user_id))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + LIMIT - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: payments, count, error } = await query
  const rows = (payments as unknown as PaymentRow[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / LIMIT)

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Pembayaran
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {count ?? 0} total transaksi
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex gap-1 p-3 overflow-x-auto" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.value
            return (
              <Link
                key={tab.value}
                href={`/admin/pembayaran?status=${tab.value}&page=1`}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                style={{
                  background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))',
                  color: isActive
                    ? 'hsl(var(--primary-foreground, 0 0% 100%))'
                    : 'hsl(var(--foreground-muted))',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
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
            Tidak ada pembayaran ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {[
                    'Payment ID',
                    'No. Invoice',
                    'No. Pesanan',
                    'Metode',
                    'Jumlah',
                    'Status',
                    'Gateway Ref',
                    'Dibayar',
                    'Dibuat',
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                      style={{ color: 'hsl(var(--foreground-muted))' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((payment, i) => {
                  const statusColor = getStatusColor(payment.status)
                  return (
                    <tr
                      key={payment.id}
                      className="hover:opacity-80 transition-opacity"
                      style={{
                        borderBottom:
                          i < rows.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {payment.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/pembayaran/${payment.id}`}
                          className="font-mono text-xs font-semibold hover:underline"
                          style={{ color: 'hsl(var(--primary))' }}
                        >
                          {payment.invoices?.invoice_number ?? payment.id.slice(0, 8) + '…'}
                        </Link>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {payment.invoices?.orders?.order_number ?? '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {payment.gateway}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {payment.gateway_transaction_id
                          ? `${payment.gateway_transaction_id.slice(0, 12)}…`
                          : '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {payment.paid_at ? formatDateTime(payment.paid_at) : '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {formatDateTime(payment.created_at)}
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
                href={`/admin/pembayaran?status=${status}&page=${page - 1}`}
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
                href={`/admin/pembayaran?status=${status}&page=${page + 1}`}
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
