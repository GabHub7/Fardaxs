import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  formatCurrency,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
} from '@/lib/utils'
import { CheckCircle2, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import type { OrderStatus } from '@/types'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderId } = await params
  return { title: `Pesanan ${orderId.slice(0, 8).toUpperCase()}` }
}

// Status timeline steps
const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING_PAYMENT', label: 'Menunggu Pembayaran' },
  { status: 'PAID', label: 'Pembayaran Diterima' },
  { status: 'PROCESSING', label: 'Diproses' },
  { status: 'SUCCESS', label: 'Selesai' },
]

function getTimelineProgress(status: OrderStatus): number {
  const failedStatuses: OrderStatus[] = ['FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED']
  if (failedStatuses.includes(status)) return -1 // special: failure
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status)
  return idx
}

export default async function PesananDetailPage({ params }: PageProps) {
  const { orderId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirect=/pesanan/${orderId}`)

  const serviceClient = createServiceClient()

  // Get user profile id
  const { data: profile } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  // Verify ownership and fetch order
  const { data: order } = await serviceClient
    .from('orders')
    .select(`
      id, order_number, status, price, gateway_fee, target,
      created_at, paid_at, completed_at,
      product:products(name, image_url),
      fulfillment_result
    `)
    .eq('id', orderId)
    .eq('user_id', profile?.id ?? '')
    .single()

  if (!order) notFound()

  const productName =
    Array.isArray(order.product)
      ? (order.product[0] as { name: string } | null)?.name
      : (order.product as { name: string } | null)?.name

  const total = (order.price ?? 0) + (order.gateway_fee ?? 0)
  const status = order.status as OrderStatus
  const statusColorClass = getStatusColor(status)
  const timelineProgress = getTimelineProgress(status)
  const isFailure = timelineProgress === -1
  const isSuccess = status === 'SUCCESS'
  const isPendingPayment = status === 'PENDING_PAYMENT'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-xs mb-6"
        style={{ color: 'hsl(var(--foreground-muted))' }}
      >
        <Link href="/" className="hover:text-current transition-colors">
          Beranda
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/akun/pesanan" className="hover:text-current transition-colors">
          Pesanan
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span style={{ color: 'hsl(var(--foreground))' }}>Detail</span>
      </nav>

      {/* Success banner */}
      {isSuccess && (
        <div
          className="rounded-[20px] border p-5 mb-5 flex flex-col items-center text-center gap-3"
          style={{
            background: 'hsl(var(--success)/0.08)',
            borderColor: 'hsl(var(--success)/0.3)',
          }}
        >
          <CheckCircle2
            size={40}
            style={{ color: 'hsl(var(--success))' }}
          />
          <div>
            <p className="text-base font-bold" style={{ color: 'hsl(var(--success))' }}>
              Pesanan Berhasil!
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Terima kasih telah berbelanja di Fardax Store.
            </p>
          </div>

          {/* Fulfillment result */}
          {order.fulfillment_result && (
            <div
              className="w-full rounded-[14px] border p-4 text-left mt-1"
              style={{
                background: 'hsl(var(--background-muted))',
                borderColor: 'hsl(var(--success)/0.2)',
              }}
            >
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                Hasil Fulfillment
              </p>
              <pre
                className="text-xs overflow-x-auto whitespace-pre-wrap break-all"
                style={{ color: 'hsl(var(--foreground-muted))' }}
              >
                {typeof order.fulfillment_result === 'string'
                  ? order.fulfillment_result
                  : JSON.stringify(order.fulfillment_result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Failure banner */}
      {isFailure && (
        <div
          className="rounded-[20px] border p-5 mb-5 flex items-start gap-3"
          style={{
            background: 'hsl(var(--destructive)/0.08)',
            borderColor: 'hsl(var(--destructive)/0.3)',
          }}
        >
          <AlertCircle size={20} style={{ color: 'hsl(var(--destructive))' }} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
              {getStatusLabel(status)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Pesanan ini tidak dapat diselesaikan. Hubungi support jika perlu bantuan.
            </p>
          </div>
        </div>
      )}

      {/* Pending payment CTA */}
      {isPendingPayment && (
        <div
          className="rounded-[20px] border p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            background: 'hsl(var(--warning)/0.08)',
            borderColor: 'hsl(var(--warning)/0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <Clock size={20} style={{ color: 'hsl(var(--warning))' }} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--warning))' }}>
                Pembayaran Belum Selesai
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Segera selesaikan pembayaran Anda.
              </p>
            </div>
          </div>
          <Link href={`/pembayaran/${orderId}`}>
            <Button variant="primary" size="sm" className="shrink-0">
              Lanjutkan Pembayaran
            </Button>
          </Link>
        </div>
      )}

      {/* Order detail card */}
      <div
        className="rounded-[20px] border p-5 space-y-5"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Nomor Pesanan
            </p>
            <p
              className="text-sm font-mono font-bold mt-0.5"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {order.order_number}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${statusColorClass}`}
          >
            {getStatusLabel(status)}
          </span>
        </div>

        {/* Product */}
        <div
          className="rounded-[14px] p-4 flex items-center gap-3"
          style={{ background: 'hsl(var(--background-muted))' }}
        >
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-base font-bold shrink-0"
            style={{
              background: 'hsl(var(--primary)/0.15)',
              color: 'hsl(var(--primary))',
            }}
          >
            {(productName ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
              {productName ?? '—'}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Target: {order.target ?? '—'}
            </p>
          </div>
        </div>

        {/* Price breakdown */}
        <div
          className="rounded-[14px] p-4 space-y-2"
          style={{ background: 'hsl(var(--background-muted))' }}
        >
          <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            <span>Harga produk</span>
            <span>{formatCurrency(order.price ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            <span>Biaya gateway</span>
            <span>{formatCurrency(order.gateway_fee ?? 0)}</span>
          </div>
          <div
            className="flex justify-between text-sm font-bold pt-2 border-t"
            style={{
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          >
            <span>Total</span>
            <span style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: 'hsl(var(--foreground-muted))' }}>Dibuat pada</span>
            <span style={{ color: 'hsl(var(--foreground))' }}>
              {formatDateTime(order.created_at)}
            </span>
          </div>
          {order.paid_at && (
            <div className="flex justify-between text-xs">
              <span style={{ color: 'hsl(var(--foreground-muted))' }}>Dibayar pada</span>
              <span style={{ color: 'hsl(var(--foreground))' }}>
                {formatDateTime(order.paid_at)}
              </span>
            </div>
          )}
          {order.completed_at && (
            <div className="flex justify-between text-xs">
              <span style={{ color: 'hsl(var(--foreground-muted))' }}>Selesai pada</span>
              <span style={{ color: 'hsl(var(--foreground))' }}>
                {formatDateTime(order.completed_at)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {!isFailure && (
        <div
          className="rounded-[20px] border p-5 mt-5"
          style={{
            background: 'hsl(var(--background-card))',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <h2 className="text-sm font-bold mb-5" style={{ color: 'hsl(var(--foreground))' }}>
            Status Pesanan
          </h2>
          <ol className="relative" aria-label="Timeline status pesanan">
            {TIMELINE_STEPS.map((step, idx) => {
              const isDone = timelineProgress >= idx
              const isCurrent = timelineProgress === idx

              return (
                <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Vertical line */}
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div
                      className="absolute left-[11px] top-6 w-0.5 h-full"
                      style={{
                        background: isDone
                          ? 'hsl(var(--success))'
                          : 'hsl(var(--border))',
                      }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Dot */}
                  <div
                    className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={
                      isDone
                        ? {
                            background: 'hsl(var(--success))',
                            boxShadow: isCurrent
                              ? '0 0 0 4px hsl(var(--success)/0.2)'
                              : undefined,
                          }
                        : {
                            background: 'hsl(var(--background-muted))',
                            border: '2px solid hsl(var(--border))',
                          }
                    }
                    aria-hidden="true"
                  >
                    {isDone && (
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        className="w-3 h-3"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium leading-6"
                      style={{
                        color: isDone
                          ? 'hsl(var(--foreground))'
                          : 'hsl(var(--foreground-muted))',
                      }}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        Status saat ini
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Back to orders */}
      <div className="mt-6 text-center">
        <Link
          href="/akun/pesanan"
          className="text-sm font-medium"
          style={{ color: 'hsl(var(--primary))' }}
        >
          ← Kembali ke daftar pesanan
        </Link>
      </div>
    </div>
  )
}
