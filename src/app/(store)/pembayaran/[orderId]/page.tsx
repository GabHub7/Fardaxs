import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PaymentCountdown } from './payment-countdown'
import { QrisCode } from '@/components/qris-code'
import { PaymentStatusPoller } from './payment-status-poller'
import { CopyButton } from './copy-button'
import { Clock, ShieldCheck, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderId } = await params
  return { title: `Pembayaran — ${orderId.slice(0, 8).toUpperCase()}` }
}

export default async function PaymentPage({ params }: PageProps) {
  const { orderId } = await params
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/pembayaran/${orderId}`)

  // Get order with invoice and payment
  const { data: order } = await serviceClient
    .from('orders')
    .select(`
      id, order_number, status, price, gateway_fee, created_at, paid_at,
      product:products(name, image_url),
      invoice:invoices(
        id, invoice_number, amount, fee, status, expired_at,
        payment:payments(id, gateway, payment_method, amount, status, payment_url, qr_url, payment_code, expired_at)
      )
    `)
    .eq('id', orderId)
    .single()

  if (!order) notFound()

  // Verify this order belongs to the logged-in user
  const { data: userProfile } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  const { data: ownerCheck } = await serviceClient
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('user_id', userProfile?.id ?? '')
    .single()

  if (!ownerCheck) notFound()

  const invoice = Array.isArray(order.invoice) ? order.invoice[0] : order.invoice
  const payment = invoice
    ? (Array.isArray(invoice.payment) ? invoice.payment[0] : invoice.payment)
    : null

  const total = (order.price ?? 0) + (order.gateway_fee ?? 0)
  const expiredAt = payment?.expired_at ?? invoice?.expired_at ?? null

  // Already completed — redirect to order detail
  if (['SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'].includes(order.status)) {
    redirect(`/pesanan/${orderId}`)
  }

  const methodLabel: Record<string, string> = {
    QRIS: 'QRIS',
    GOPAY: 'GoPay',
    OVO: 'OVO',
    DANA: 'DANA',
    SHOPEEPAY: 'ShopeePay',
  }

  const isVA = payment?.payment_method?.startsWith('VA_')
  const isEWallet = ['GOPAY', 'OVO', 'DANA', 'SHOPEEPAY'].includes(payment?.payment_method ?? '')
  const isQRIS = payment?.payment_method === 'QRIS'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'hsl(var(--foreground-muted))' }}>
        <Link href="/" className="hover:text-current transition-colors">Beranda</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/akun/pesanan" className="hover:text-current transition-colors">Pesanan</Link>
        <ChevronRight className="h-3 w-3" />
        <span style={{ color: 'hsl(var(--foreground))' }}>Pembayaran</span>
      </nav>

      {/* Status Poller — polls order status and redirects when paid/expired */}
      <PaymentStatusPoller orderId={orderId} currentStatus={order.status} />

      {/* Header Card */}
      <div
        className="rounded-[20px] border p-5 mb-4"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Nomor Pesanan
            </p>
            <p className="text-sm font-mono font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              {order.order_number}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Total Pembayaran
            </p>
            <p className="text-lg font-bold" style={{ color: 'hsl(var(--primary))' }}>
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* Product info */}
        <div
          className="flex items-center gap-3 rounded-[12px] p-3"
          style={{ background: 'hsl(var(--background-muted))' }}
        >
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}
          >
            {Array.isArray(order.product)
              ? order.product[0]?.name?.charAt(0)
              : (order.product as { name: string; image_url: string | null } | null)?.name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {Array.isArray(order.product)
                ? order.product[0]?.name
                : (order.product as { name: string } | null)?.name}
            </p>
            <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
              {payment?.payment_method ? methodLabel[payment.payment_method] ?? payment.payment_method : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {expiredAt && order.status === 'PENDING_PAYMENT' && (
        <div
          className="rounded-[20px] border p-4 mb-4 flex items-center gap-3"
          style={{ background: 'hsl(var(--warning)/0.08)', borderColor: 'hsl(var(--warning)/0.3)' }}
        >
          <Clock className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--warning))' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--warning))' }}>
              Selesaikan pembayaran sebelum:
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              {formatDateTime(expiredAt)}
            </p>
          </div>
          <PaymentCountdown expiredAt={expiredAt} />
        </div>
      )}

      {/* PROCESSING state */}
      {order.status === 'PROCESSING' && (
        <div
          className="rounded-[20px] border p-5 mb-4 text-center space-y-2"
          style={{ background: 'hsl(var(--primary)/0.08)', borderColor: 'hsl(var(--primary)/0.2)' }}
        >
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
              Pembayaran Diterima
            </p>
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Pesanan sedang diproses. Harap tunggu beberapa saat.
          </p>
        </div>
      )}

      {/* PAID state */}
      {order.status === 'PAID' && (
        <div
          className="rounded-[20px] border p-5 mb-4 text-center space-y-2"
          style={{ background: 'hsl(var(--success)/0.08)', borderColor: 'hsl(var(--success)/0.2)' }}
        >
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--success))' }}>
              Pembayaran Berhasil
            </p>
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Pesanan akan segera diproses.
          </p>
        </div>
      )}

      {/* EXPIRED state */}
      {order.status === 'EXPIRED' && (
        <div
          className="rounded-[20px] border p-5 mb-4 text-center"
          style={{ background: 'hsl(var(--destructive)/0.08)', borderColor: 'hsl(var(--destructive)/0.2)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
            Waktu Pembayaran Habis
          </p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Pesanan ini sudah kadaluarsa. Silakan buat pesanan baru.
          </p>
          <Link
            href="/"
            className="inline-block mt-3 rounded-[10px] px-4 py-2 text-xs font-semibold"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            Belanja Lagi
          </Link>
        </div>
      )}

      {/* Payment Instructions */}
      {payment && order.status === 'PENDING_PAYMENT' && (
        <div
          className="rounded-[20px] border p-5 space-y-4"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Cara Pembayaran
          </h2>

          {/* QRIS */}
          {isQRIS && payment.qr_url && (
            <div className="text-center space-y-3">
              <div
                className="inline-block rounded-[16px] p-3 border"
                style={{ background: '#ffffff', borderColor: 'hsl(var(--border))' }}
              >
                <QrisCode data={payment.qr_url} className="w-52 h-52 object-contain" />
              </div>
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Scan QR Code dengan aplikasi pembayaran apapun
              </p>
            </div>
          )}

          {/* Virtual Account */}
          {isVA && payment.payment_code && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Transfer ke nomor VA berikut:
              </p>
              <div
                className="flex items-center gap-3 rounded-[14px] p-4 border"
                style={{ background: 'hsl(var(--background-muted))', borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex-1">
                  <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    {methodLabel[payment.payment_method ?? ''] ?? 'Virtual Account'}
                  </p>
                  <p className="text-xl font-mono font-bold tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>
                    {payment.payment_code}
                  </p>
                </div>
                <CopyButton value={payment.payment_code} />
              </div>
              <div
                className="rounded-[12px] p-3 text-xs space-y-1.5"
                style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))' }}
              >
                <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Langkah pembayaran:</p>
                <p>1. Buka aplikasi/ATM/internet banking bank kamu</p>
                <p>2. Pilih menu Transfer atau Virtual Account</p>
                <p>3. Masukkan nomor VA di atas</p>
                <p>4. Konfirmasi nominal {formatCurrency(total)}</p>
                <p>5. Selesaikan transaksi</p>
              </div>
            </div>
          )}

          {/* E-Wallet */}
          {isEWallet && payment.payment_url && (
            <div className="space-y-3 text-center">
              <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Klik tombol di bawah untuk melanjutkan pembayaran melalui{' '}
                {methodLabel[payment.payment_method ?? '']}
              </p>
              <a
                href={payment.payment_url}
                className="block w-full rounded-[12px] py-3 text-sm font-semibold"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
              >
                Bayar via {methodLabel[payment.payment_method ?? '']}
              </a>
            </div>
          )}

          {/* Invoice detail */}
          <div
            className="border-t pt-4 space-y-1.5 text-xs"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground-muted))' }}
          >
            <div className="flex justify-between">
              <span>Harga produk</span>
              <span>{formatCurrency(order.price ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Biaya transaksi</span>
              <span>{formatCurrency(order.gateway_fee ?? 0)}</span>
            </div>
            <div
              className="flex justify-between font-semibold text-sm pt-1 border-t"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              <span>Total</span>
              <span style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Trust badges */}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'hsl(var(--success))' }} />
        <span>Transaksi aman & terenkripsi</span>
      </div>
    </div>
  )
}

