import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime, getStatusLabel } from '@/lib/utils'
import type { PaymentStatus, OrderStatus } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

interface PaymentDetail {
  id: string
  gateway: string
  gateway_transaction_id: string | null
  amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
  updated_at: string
  invoices: {
    id: string
    invoice_number: string
    amount: number
    expired_at: string | null
    status: string
    orders: {
      id: string
      order_number: string
      target: string
      quantity: number
      price: number
      status: OrderStatus
      payment_method: string | null
      provider_reference: string | null
      paid_at: string | null
      created_at: string
      products: { name: string; slug: string } | null
      users: { email: string; full_name: string | null; phone: string | null } | null
    } | null
  } | null
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
      <span className="text-xs font-medium flex-shrink-0" style={{ color: 'hsl(var(--foreground-muted))' }}>
        {label}
      </span>
      <span className="text-xs text-right font-mono" style={{ color: 'hsl(var(--foreground))' }}>
        {value}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isSuccess = ['PAID', 'SUCCESS'].includes(status)
  const isFailed = ['FAILED', 'EXPIRED', 'CANCELLED'].includes(status)
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: isSuccess
          ? 'hsl(var(--success) / 0.15)'
          : isFailed
          ? 'hsl(var(--destructive) / 0.15)'
          : 'hsl(var(--warning) / 0.15)',
        color: isSuccess
          ? 'hsl(var(--success))'
          : isFailed
          ? 'hsl(var(--destructive))'
          : 'hsl(var(--warning))',
      }}
    >
      {getStatusLabel(status as PaymentStatus)}
    </span>
  )
}

export const dynamic = 'force-dynamic'

export default async function PembayaranDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, gateway, gateway_transaction_id, amount, status, paid_at, created_at, updated_at,
      invoices(
        id, invoice_number, amount, expired_at, status,
        orders(
          id, order_number, target, quantity, price, status, payment_method, provider_reference,
          paid_at, created_at,
          products(name, slug),
          users(email, full_name, phone)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const payment = data as unknown as PaymentDetail
  const invoice = payment.invoices
  const order = invoice?.orders
  const user = order?.users
  const product = order?.products

  return (
    <div className="p-6 max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/pembayaran"
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
            Detail Pembayaran
          </h1>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {payment.id}
          </p>
        </div>
      </div>

      {/* Payment Info */}
      <div
        className="rounded-[20px] border p-5"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Informasi Pembayaran
          </h2>
          <StatusBadge status={payment.status} />
        </div>

        <InfoRow label="Gateway" value={payment.gateway} />
        <InfoRow label="Jumlah" value={formatCurrency(payment.amount)} />
        <InfoRow
          label="Referensi Gateway"
          value={payment.gateway_transaction_id ?? '—'}
        />
        <InfoRow
          label="Dibayar pada"
          value={payment.paid_at ? formatDateTime(payment.paid_at) : '—'}
        />
        <InfoRow label="Dibuat" value={formatDateTime(payment.created_at)} />
        <div className="pt-3">
          <InfoRow label="Diperbarui" value={formatDateTime(payment.updated_at)} />
        </div>
      </div>

      {/* Invoice Info */}
      {invoice && (
        <div
          className="rounded-[20px] border p-5"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
            Informasi Invoice
          </h2>
          <InfoRow label="No. Invoice" value={invoice.invoice_number} />
          <InfoRow label="Jumlah Invoice" value={formatCurrency(invoice.amount)} />
          <InfoRow label="Status Invoice" value={<StatusBadge status={invoice.status} />} />
          <div className="pt-3">
            <InfoRow
              label="Kedaluwarsa"
              value={invoice.expired_at ? formatDateTime(invoice.expired_at) : '—'}
            />
          </div>
        </div>
      )}

      {/* Order Info */}
      {order && (
        <div
          className="rounded-[20px] border p-5"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Informasi Pesanan
            </h2>
            <Link
              href={`/admin/pesanan/${order.id}`}
              className="px-3 py-1 rounded-[10px] text-xs font-medium"
              style={{
                background: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--primary))',
                border: '1px solid hsl(var(--primary) / 0.3)',
              }}
            >
              Lihat Pesanan →
            </Link>
          </div>
          <InfoRow label="No. Pesanan" value={order.order_number} />
          <InfoRow label="Produk" value={product?.name ?? '—'} />
          <InfoRow label="Target" value={order.target} />
          <InfoRow label="Jumlah" value={`${order.quantity}x`} />
          <InfoRow label="Harga" value={formatCurrency(order.price)} />
          <InfoRow label="Metode Bayar" value={order.payment_method ?? '—'} />
          <InfoRow
            label="Ref. Provider"
            value={order.provider_reference ?? '—'}
          />
          <div className="pt-3">
            <InfoRow label="Status Pesanan" value={<StatusBadge status={order.status} />} />
          </div>
        </div>
      )}

      {/* Customer Info */}
      {user && (
        <div
          className="rounded-[20px] border p-5"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
            Informasi Pelanggan
          </h2>
          <InfoRow label="Nama" value={user.full_name ?? '—'} />
          <InfoRow label="Email" value={user.email} />
          <div className="pt-3">
            <InfoRow label="Telepon" value={user.phone ?? '—'} />
          </div>
        </div>
      )}
    </div>
  )
}
