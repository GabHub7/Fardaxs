/**
 * POST /api/wallet/topup/bot
 * Endpoint topup saldo via WhatsApp Bot.
 * Mengikuti pola yang sama dengan /api/wallet/topup/route.ts (invoice
 * number "TOPUP-" digenerate dulu sebelum minta payment ke Casaku, supaya
 * webhook bisa merutekan callback ke wallet crediting, bukan fulfillment
 * order) — hanya bedanya user di-resolve dari nomor HP, bukan session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createPayment, casakuQrImageUrl } from '@/lib/providers/casaku'
import { phoneVariants } from '@/lib/phone'
import type { ApiResponse } from '@/types'

const BOT_TOKEN = process.env.WHATSAPP_BOT_TOKEN ?? ''
const MIN_TOPUP = 10000
const MAX_TOPUP = 10000000
const ALLOWED_METHODS = ['QRIS', 'DANA', 'OVO', 'GOPAY', 'SHOPEEPAY']

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-bot-token') ??
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!BOT_TOKEN || !token || token !== BOT_TOKEN) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json<ApiResponse>({ success: false, message: 'Body kosong' }, { status: 400 })

  const { amount: rawAmount, payment_method, phone } = body as { amount?: number; payment_method?: string; phone?: string }
  const amount = Math.floor(Number(rawAmount))
  const method = payment_method && ALLOWED_METHODS.includes(payment_method) ? payment_method : 'QRIS'

  if (!phone) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'phone wajib diisi' }, { status: 400 })
  }
  if (!amount || isNaN(amount) || amount < MIN_TOPUP) {
    return NextResponse.json<ApiResponse>({ success: false, message: `Minimal top up Rp${MIN_TOPUP.toLocaleString('id-ID')}.` }, { status: 400 })
  }
  if (amount > MAX_TOPUP) {
    return NextResponse.json<ApiResponse>({ success: false, message: `Maksimal top up Rp${MAX_TOPUP.toLocaleString('id-ID')}.` }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: userProfiles } = await serviceClient
    .from('users')
    .select('id, email, full_name, status')
    .in('phone', phoneVariants(phone))
    .limit(1)
  const userProfile = userProfiles?.[0] ?? null

  if (!userProfile) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Nomor ${phone} belum terdaftar. Silakan daftar dulu di ${process.env.NEXT_PUBLIC_APP_URL ?? ''}` },
      { status: 404 }
    )
  }

  if (userProfile.status === 'BANNED' || userProfile.status === 'SUSPENDED') {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Akun Anda tidak dapat melakukan transaksi.' }, { status: 403 })
  }

  // Unique invoice number — prefix "TOPUP-" supaya webhook Casaku tahu ini
  // harus dikreditkan ke saldo wallet, bukan diproses sebagai fulfillment order.
  const invoiceNumber = `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const expiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 jam

  const gatewayResult = await createPayment({
    invoiceNumber,
    amount,
    paymentMethod: method,
    expiredAt,
    customerName: userProfile.full_name ?? undefined,
    customerEmail: userProfile.email ?? undefined,
  })

  if (!gatewayResult.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: gatewayResult.message ?? 'Gagal menghubungi payment gateway' },
      { status: 502 }
    )
  }

  const { error } = await serviceClient.from('wallet_topups').insert({
    user_id: userProfile.id,
    invoice_number: invoiceNumber,
    amount,
    payment_method: method,
    status: 'PENDING',
    gateway_reference: gatewayResult.gatewayReference ?? null,
    // qr_url holds the raw QRIS payload string (consistent with the web flow)
    qr_url: gatewayResult.qrString ?? null,
    payment_code: gatewayResult.paymentCode ?? null,
    expired_at: expiredAt,
  })

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Gagal menyimpan data top up.' }, { status: 500 })
  }

  await serviceClient.from('audit_logs').insert({
    user_id: userProfile.id,
    action: 'WALLET_TOPUP_CREATED_VIA_WABOT',
    resource_type: 'wallet_topup',
    resource_id: invoiceNumber,
    new_data: { amount, payment_method: method, phone },
  })

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Top up dibuat. Selesaikan pembayaran.',
    data: {
      invoiceNumber,
      amount,
      method,
      paymentUrl: null,
      // The WA bot sends this as a plain link in a chat message, so it needs
      // to be an actual image URL — not the raw qr_string used on the web.
      qrUrl: gatewayResult.qrString ? casakuQrImageUrl(gatewayResult.qrString) : null,
      paymentCode: gatewayResult.paymentCode ?? null,
      expiredAt,
    },
  })
}
