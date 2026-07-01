import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { OrderActions } from './order-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusLog {
  id: string
  old_status: OrderStatus | null
  new_status: OrderStatus
  reason: string | null
  created_by: string | null
  created_at: string
}

interface OrderDetail {
  id: string
  order_number: string
  target: string
  quantity: number
  price: number
  gateway_fee: number | null
  profit: number | null
  status: OrderStatus
  payment_method: string | null
  provider_reference: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  users: { email: string; full_name: string | null } | null
  products: { name: string; slug: string } | null
  invoices: { invoice_number: string; amount: number; fee: number; expired_at: string; status: string } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function PesananDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceClient()

  const [orderResult, logsResult] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, order_number, target, quantity, price, gateway_fee, profit, status, payment_method, provider_reference, paid_at, created_at, updated_at, users(email, full_name), products(name, slug), invoices(invoice_number, amount, fee, expired_at, status)'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('order_status_logs')
      .select('id, old_status, new_status, reason, created_by, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (orderResult.error || !orderResult.data) {
    notFound()
  }

  const order = orderResult.data as unknown as OrderDetail
  const logs = (logsResult.data as unknown as StatusLog[]) ?? []

  const statusColor = getStatusColor(order.status)
  const total = order.price + (order.gateway_fee ?? 0)
  const profit = order.profit ?? 0

  const canCancel = order.status === 'PENDING_PAYMENT'
  const canFulfill = order.status === 'PROCESSING' || order.status === 'FAILED'
  const canRefund = ['SUCCESS', 'FAILED', 'PROCESSING', 'PAID'].includes(order.status)
  const hasAdminActions = canCancel || canFulfill || canRefund

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pesanan"
            className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
            style={{
              background: 'hsl(var(--background-muted))',
              color: 'hsl(var(--foreground-muted))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            ← Kembali
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              Detail Pesanan
            </h1>
            <p className="text-sm font-mono mt-0.5" style={{ color: 'hsl(var(--primary))' }}>
              {order.order_number}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusColor}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info — left 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order Info */}
          <div
            className="rounded-[20px] border p-5"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Informasi Pesanan
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Nomor Pesanan" value={order.order_number} mono />
              <InfoRow
                label="Invoice"
                value={order.invoices?.invoice_number ?? '-'}
                mono
              />
              <InfoRow label="Produk" value={order.products?.name ?? '-'} />
              <InfoRow label="Target" value={order.target} />
              <InfoRow label="Metode Bayar" value={order.payment_method ?? '-'} />
              <InfoRow
                label="Dibuat"
                value={formatDateTime(order.created_at)}
              />
              {order.paid_at && (
                <InfoRow label="Dibayar" value={formatDateTime(order.paid_at)} />
              )}
              {order.provider_reference && (
                <InfoRow
                  label="Ref. Gateway"
                  value={order.provider_reference}
                  mono
                />
              )}
            </div>
          </div>

          {/* Price Breakdown */}
          <div
            className="rounded-[20px] border p-5"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Rincian Harga
            </h2>
            <div className="space-y-3">
              <PriceRow label="Harga Produk" value={formatCurrency(order.price)} />
              <PriceRow label="Biaya Gateway" value={formatCurrency(order.gateway_fee ?? 0)} />
              <div
                className="pt-3"
                style={{ borderTop: '1px solid hsl(var(--border))' }}
              >
                <PriceRow
                  label="Total Pembayaran"
                  value={formatCurrency(total)}
                  bold
                />
              </div>
              <PriceRow
                label="Profit"
                value={formatCurrency(profit)}
                highlight
              />
            </div>
          </div>

          {/* Timeline */}
          <div
            className="rounded-[20px] border p-5"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Timeline Status
            </h2>
            {logs.length === 0 ? (
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Belum ada log status.
              </p>
            ) : (
              <div className="relative pl-5 space-y-4">
                <div
                  className="absolute left-1.5 top-0 bottom-0 w-px"
                  style={{ background: 'hsl(var(--border))' }}
                />
                {logs.map((log) => {
                  const newStatusColor = getStatusColor(log.new_status)
                  return (
                    <div key={log.id} className="relative">
                      <div
                        className="absolute -left-5 top-0.5 w-3 h-3 rounded-full border-2"
                        style={{
                          background: 'hsl(var(--background-card))',
                          borderColor: 'hsl(var(--primary))',
                        }}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            {log.old_status && (
                              <>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(log.old_status)}`}
                                >
                                  {getStatusLabel(log.old_status)}
                                </span>
                                <span
                                  className="text-xs"
                                  style={{ color: 'hsl(var(--foreground-muted))' }}
                                >
                                  →
                                </span>
                              </>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${newStatusColor}`}
                            >
                              {getStatusLabel(log.new_status)}
                            </span>
                          </div>
                          {log.reason && (
                            <p
                              className="text-xs mt-1"
                              style={{ color: 'hsl(var(--foreground-muted))' }}
                            >
                              {log.reason}
                            </p>
                          )}
                        </div>
                        <p
                          className="text-xs whitespace-nowrap flex-shrink-0"
                          style={{ color: 'hsl(var(--foreground-muted))' }}
                        >
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Customer Info */}
          <div
            className="rounded-[20px] border p-5"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Customer
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  Nama
                </p>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {order.users?.full_name ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  Email
                </p>
                <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                  {order.users?.email ?? '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Info */}
          {order.invoices && (
            <div
              className="rounded-[20px] border p-5"
              style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
            >
              <h2
                className="text-sm font-semibold mb-4"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                Invoice
              </h2>
              <div className="space-y-3">
                <InfoRow
                  label="Nomor Invoice"
                  value={order.invoices.invoice_number}
                  mono
                />
                <InfoRow
                  label="Status Invoice"
                  value={order.invoices.status}
                />
                <InfoRow
                  label="Kadaluarsa"
                  value={formatDateTime(order.invoices.expired_at)}
                />
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {hasAdminActions && (
            <div
              className="rounded-[20px] border p-5 space-y-3"
              style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
            >
              <h2
                className="text-sm font-semibold"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                Aksi Admin
              </h2>
              <OrderActions
                orderId={order.id}
                canFulfill={canFulfill}
                canCancel={canCancel}
                canRefund={canRefund}
                isFailed={order.status === 'FAILED'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
        {label}
      </p>
      <p
        className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}
        style={{ color: 'hsl(var(--foreground))' }}
      >
        {value}
      </p>
    </div>
  )
}

function PriceRow({
  label,
  value,
  bold = false,
  highlight = false,
}: {
  label: string
  value: string
  bold?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <p
        className="text-sm"
        style={{ color: 'hsl(var(--foreground-muted))' }}
      >
        {label}
      </p>
      <p
        className={`text-sm ${bold ? 'font-bold' : 'font-medium'}`}
        style={{
          color: highlight
            ? 'hsl(var(--success))'
            : bold
              ? 'hsl(var(--foreground))'
              : 'hsl(var(--foreground))',
        }}
      >
        {value}
      </p>
    </div>
  )
}

