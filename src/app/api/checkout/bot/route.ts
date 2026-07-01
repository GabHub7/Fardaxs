/**
 * POST /api/checkout/bot
 * Endpoint khusus untuk order dari WhatsApp Bot.
 * Mirip dengan /api/checkout tapi autentikasi pakai x-bot-token, dan user
 * di-resolve dari nomor HP pengirim chat (tidak ada session Supabase Auth
 * karena request ini datang server-to-server dari proses bot, bukan
 * dari browser pengguna).
 *
 * Mengikuti pola insert yang sama persis dengan /api/checkout/route.ts
 * (order dibuat dulu → invoice dibuat & ditautkan ke order → baru payment),
 * supaya konsisten dengan skema database yang sebenarnya (lihat
 * supabase/migrations/001_initial_schema.sql): kolom orders memakai
 * price/cost/customer_input, bukan unit_price/total_price/source, dan
 * invoices.order_id wajib diisi — bukan sebaliknya.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import { createPayment } from '@/lib/providers/casaku'
import type { ApiResponse, CheckoutResponse } from '@/types'

const BOT_TOKEN = process.env.WHATSAPP_BOT_TOKEN ?? ''

function calculateGatewayFee(amount: number, method: string): number {
  const fees: Record<string, number | ((a: number) => number)> = {
    QRIS: (a: number) => Math.round(a * 0.007),
    VA_BCA: 4000, VA_BNI: 4000, VA_BRI: 4000, VA_MANDIRI: 4000,
    GOPAY: (a: number) => Math.round(a * 0.02),
    OVO: (a: number) => Math.round(a * 0.02),
    DANA: (a: number) => Math.round(a * 0.015),
    SHOPEEPAY: (a: number) => Math.round(a * 0.015),
  }
  const fee = fees[method]
  if (!fee) return 0
  return typeof fee === 'function' ? fee(amount) : fee
}

async function checkIsReseller(serviceClient: SupabaseServiceClient, userId: string): Promise<boolean> {
  const { data } = await serviceClient
    .from('reseller_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle()
  return !!data
}

export async function POST(request: NextRequest) {
  // Auth: token wajib cocok dengan WHATSAPP_BOT_TOKEN. Tidak ada jalur
  // "internal" tanpa token — endpoint ini membuat transaksi uang sungguhan,
  // jadi tidak boleh ada bypass auth.
  const token = request.headers.get('x-bot-token') ??
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!BOT_TOKEN || !token || token !== BOT_TOKEN) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json<ApiResponse>({ success: false, message: 'Body kosong' }, { status: 400 })

  const { product_id, variant_id, target, quantity = 1, payment_method, phone, customer_input } = body as {
    product_id?: string
    variant_id?: string
    target?: string
    quantity?: number
    payment_method?: string
    phone?: string
    customer_input?: Record<string, unknown>
  }

  if (!product_id || !target || !payment_method || !phone) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'product_id, target, payment_method, dan phone wajib diisi' },
      { status: 400 }
    )
  }

  const serviceClient = createServiceClient()

  // Cari user berdasarkan nomor HP yang chat ke bot
  const { data: userProfile } = await serviceClient
    .from('users')
    .select('id, email, full_name, phone, status, email_verified')
    .eq('phone', phone)
    .maybeSingle()

  if (!userProfile) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Nomor ${phone} belum terdaftar. Silakan daftar dulu di ${process.env.NEXT_PUBLIC_APP_URL ?? ''}` },
      { status: 404 }
    )
  }

  if (userProfile.status === 'BANNED' || userProfile.status === 'SUSPENDED') {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Akun Anda tidak dapat melakukan transaksi.' }, { status: 403 })
  }

  if (!userProfile.email_verified) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Email belum diverifikasi. Cek inbox Anda terlebih dahulu.' }, { status: 403 })
  }

  // Load produk
  const { data: product } = await serviceClient
    .from('products')
    .select('id, name, selling_price, reseller_price, status, provider_id, provider_product_code')
    .eq('id', product_id)
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)
    .single()

  if (!product) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Produk tidak ditemukan atau tidak tersedia' }, { status: 404 })
  }

  // Resolve varian (jika ada)
  let variantProviderCode: string | null = null
  let variantSellPrice: number | null = null
  let variantResellerPrice: number | null = null

  if (variant_id) {
    const { data: variant } = await serviceClient
      .from('product_variants')
      .select('id, selling_price, reseller_price, provider_product_code, status')
      .eq('id', variant_id)
      .eq('product_id', product_id)
      .eq('status', 'ACTIVE')
      .single()

    if (!variant) {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Varian tidak tersedia' }, { status: 404 })
    }
    variantSellPrice = variant.selling_price
    variantResellerPrice = variant.reseller_price
    variantProviderCode = variant.provider_product_code
  }

  const isReseller = await checkIsReseller(serviceClient, userProfile.id)
  const price = isReseller
    ? (variantResellerPrice ?? product.reseller_price)
    : (variantSellPrice ?? product.selling_price)

  const providerCode = variantProviderCode ?? product.provider_product_code
  const gatewayFee = calculateGatewayFee(price, payment_method)
  const totalAmount = price + gatewayFee

  const invoiceNumber = `INV${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  const expiryMinutes = 60 // pesanan via WA dikasih waktu lebih lama drpd checkout web
  const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()

  // 1) Buat order dulu (invoice_id diisi belakangan, sama seperti alur checkout web)
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .insert({
      user_id: userProfile.id,
      product_id: product.id,
      variant_id: variant_id ?? null,
      provider_id: product.provider_id,
      customer_input: {
        ...(customer_input ?? {}),
        ...(variantProviderCode ? { provider_product_code: providerCode } : {}),
        ordered_via: 'whatsapp_bot',
      },
      target,
      quantity,
      price,
      cost: 0,
      gateway_fee: gatewayFee,
      status: 'PENDING_PAYMENT',
      ip_address: request.headers.get('x-forwarded-for') ?? 'wabot',
      user_agent: 'fardax-wabot',
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Gagal membuat pesanan' }, { status: 500 })
  }

  // 2) Buat invoice, tautkan ke order
  const { data: invoice, error: invoiceError } = await serviceClient
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      order_id: order.id,
      amount: price,
      fee: gatewayFee,
      expired_at: expiredAt,
      status: 'PENDING',
    })
    .select('id')
    .single()

  if (invoiceError || !invoice) {
    await serviceClient.from('orders').delete().eq('id', order.id)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Gagal membuat invoice' }, { status: 500 })
  }

  await serviceClient.from('orders').update({ invoice_id: invoice.id }).eq('id', order.id)

  // 3) Minta payment ke Casaku
  const gatewayResult = await createPayment({
    invoiceNumber,
    amount: totalAmount,
    paymentMethod: payment_method,
    expiredAt,
    customerName: userProfile.full_name ?? undefined,
    customerEmail: userProfile.email ?? undefined,
  })

  if (!gatewayResult.success) {
    await serviceClient.from('invoices').delete().eq('id', invoice.id)
    await serviceClient.from('orders').delete().eq('id', order.id)
    return NextResponse.json<ApiResponse>(
      { success: false, message: gatewayResult.message ?? 'Gagal menghubungi payment gateway' },
      { status: 502 }
    )
  }

  // 4) Simpan payment
  const { data: payment, error: paymentError } = await serviceClient
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      gateway: 'casaku',
      gateway_transaction_id: gatewayResult.gatewayReference ?? null,
      payment_method,
      payment_code: gatewayResult.paymentCode ?? null,
      payment_url: gatewayResult.paymentUrl ?? null,
      qr_url: gatewayResult.qrUrl ?? null,
      amount: totalAmount,
      fee: gatewayFee,
      status: 'PENDING',
      expired_at: expiredAt,
    })
    .select('id, payment_url, qr_url, payment_code')
    .single()

  if (paymentError || !payment) {
    await serviceClient.from('invoices').delete().eq('id', invoice.id)
    await serviceClient.from('orders').delete().eq('id', order.id)
    return NextResponse.json<ApiResponse>({ success: false, message: 'Gagal membuat pembayaran' }, { status: 500 })
  }

  await serviceClient.from('order_status_logs').insert({
    order_id: order.id,
    old_status: null,
    new_status: 'PENDING_PAYMENT',
    reason: 'Order dibuat via WhatsApp Bot',
  })

  await serviceClient.from('audit_logs').insert({
    user_id: userProfile.id,
    action: 'ORDER_CREATED_VIA_WABOT',
    resource_type: 'order',
    resource_id: order.id,
    new_data: { order_number: order.order_number, product_id, amount: totalAmount, phone },
  })

  const response: CheckoutResponse = {
    order_id: order.id,
    invoice_id: invoice.id,
    order_number: order.order_number,
    payment_url: payment.payment_url ?? null,
    qr_url: payment.qr_url ?? null,
    va_number: payment.payment_code ?? null,
    amount: totalAmount,
    expired_at: expiredAt,
  }

  return NextResponse.json<ApiResponse<CheckoutResponse>>({
    success: true,
    message: 'Pesanan berhasil dibuat',
    data: response,
  })
}
