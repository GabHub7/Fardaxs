import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/supabase/server'
import { createPayment } from '@/lib/providers/casaku'
import { checkAuthRateLimit } from '@/lib/rate-limit'

const MIN_TOPUP = 10000
const MAX_TOPUP = 10000000
const ALLOWED_METHODS = ['QRIS', 'VA_BCA', 'VA_BRI', 'VA_BNI', 'VA_MANDIRI', 'DANA', 'OVO', 'GOPAY', 'SHOPEEPAY']

export async function POST(request: NextRequest) {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { profile, serviceClient } = session

  // Throttle to prevent spamming the gateway with topup requests.
  const rl = await checkAuthRateLimit(`topup:${profile.id}`)
  if (!rl.success) {
    return NextResponse.json({ success: false, message: 'Terlalu banyak permintaan. Coba lagi sebentar.' }, { status: 429 })
  }

  const body = (await request.json()) as { amount?: number; method?: string }
  const amount = Math.floor(Number(body.amount))
  const method = body.method && ALLOWED_METHODS.includes(body.method) ? body.method : 'QRIS'

  if (!amount || isNaN(amount) || amount < MIN_TOPUP) {
    return NextResponse.json({ success: false, message: `Minimal top up Rp${MIN_TOPUP.toLocaleString('id-ID')}.` }, { status: 400 })
  }
  if (amount > MAX_TOPUP) {
    return NextResponse.json({ success: false, message: `Maksimal top up Rp${MAX_TOPUP.toLocaleString('id-ID')}.` }, { status: 400 })
  }

  // Unique invoice number — "TOPUP-" prefix lets the Casaku webhook route it
  // to wallet crediting instead of order fulfillment.
  const invoiceNumber = `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const expiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  const payment = await createPayment({
    invoiceNumber,
    amount,
    paymentMethod: method,
    expiredAt,
    customerName: profile.fullName ?? undefined,
    customerEmail: profile.email,
  })

  if (!payment.success) {
    return NextResponse.json(
      { success: false, message: payment.message ?? 'Gagal membuat pembayaran top up.' },
      { status: 502 }
    )
  }

  // Record the pending top-up so the webhook can credit the wallet on success.
  const { error } = await serviceClient.from('wallet_topups').insert({
    user_id: profile.id,
    invoice_number: invoiceNumber,
    amount,
    payment_method: method,
    status: 'PENDING',
    gateway_reference: payment.gatewayReference ?? null,
    payment_url: payment.paymentUrl ?? null,
    qr_url: payment.qrUrl ?? null,
    payment_code: payment.paymentCode ?? null,
    expired_at: expiredAt,
  })

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Top up dibuat. Selesaikan pembayaran.',
    data: {
      invoiceNumber,
      amount,
      method,
      paymentUrl: payment.paymentUrl ?? null,
      qrUrl: payment.qrUrl ?? null,
      paymentCode: payment.paymentCode ?? null,
      expiredAt,
    },
  })
}
