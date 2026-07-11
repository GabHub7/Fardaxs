import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkCheckoutRateLimit } from '@/lib/rate-limit'
import { waNotifyOrderCreated } from '@/lib/whatsapp'
import { createPayment } from '@/lib/providers/casaku'
import type { ApiResponse, CheckoutResponse } from '@/types'

const checkoutSchema = z.object({
  product_id: z.string().uuid('ID produk tidak valid'),
  variant_id: z.string().uuid('ID varian tidak valid').optional(),
  target: z.string().min(1, 'Target wajib diisi').max(500),
  quantity: z.number().int().min(1).max(1),
  // Casaku hanya menyediakan QRIS + e-wallet deep-link — VA bank tidak didukung.
  payment_method: z.union([
    z.literal('QRIS'),
    z.literal('GOPAY'),
    z.literal('OVO'),
    z.literal('DANA'),
    z.literal('SHOPEEPAY'),
  ]),
  customer_input: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await checkCheckoutRateLimit(ip)
  if (!rl.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
    )
  }

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Anda harus masuk terlebih dahulu' },
      { status: 401 }
    )
  }

  // Parse and validate request body
  let body: z.infer<typeof checkoutSchema>
  try {
    const raw = await request.json()
    body = checkoutSchema.parse(raw)
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: 'Data tidak valid',
        errors: err instanceof z.ZodError ? err.issues.map((e: z.ZodIssue) => e.message) : ['Invalid request'],
      },
      { status: 400 }
    )
  }

  // Get user profile
  const { data: userProfile } = await serviceClient
    .from('users')
    .select('id, email_verified, status, role_id, phone, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!userProfile) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Profil pengguna tidak ditemukan' },
      { status: 404 }
    )
  }

  // Check email verification
  if (!userProfile.email_verified) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Email belum diverifikasi. Cek inbox Anda.' },
      { status: 403 }
    )
  }

  // Check user status
  if (userProfile.status === 'BANNED' || userProfile.status === 'SUSPENDED') {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Akun Anda tidak dapat melakukan transaksi.' },
      { status: 403 }
    )
  }

  // Get product with provider info
  const { data: product } = await serviceClient
    .from('products')
    .select('id, name, selling_price, reseller_price, status, provider_id, provider_product_code, fulfillment_type')
    .eq('id', body.product_id)
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)
    .single()

  if (!product) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Produk tidak ditemukan atau tidak tersedia' },
      { status: 404 }
    )
  }

  // Resolve variant (if provided)
  let variantProviderCode: string | null = null
  let variantSellPrice: number | null = null
  let variantResellerPrice: number | null = null

  if (body.variant_id) {
    const { data: variant } = await serviceClient
      .from('product_variants')
      .select('id, selling_price, reseller_price, provider_product_code, status')
      .eq('id', body.variant_id)
      .eq('product_id', body.product_id)
      .eq('status', 'ACTIVE')
      .single()

    if (!variant) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Varian tidak tersedia' },
        { status: 404 }
      )
    }
    variantSellPrice = variant.selling_price
    variantResellerPrice = variant.reseller_price
    variantProviderCode = variant.provider_product_code
  }

  // Determine price (check if user is reseller)
  const isReseller = await checkIsReseller(serviceClient, userProfile.id)
  const price = isReseller
    ? (variantResellerPrice ?? product.reseller_price)
    : (variantSellPrice ?? product.selling_price)

  const providerCode = variantProviderCode ?? product.provider_product_code

  // Calculate gateway fee (simplified — normally comes from gateway config)
  const gatewayFee = calculateGatewayFee(price, body.payment_method)
  const totalAmount = price + gatewayFee

  // Generate invoice number
  const invoiceNumber = `INV${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  const expiryMinutes = 30
  const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()

  // Create order
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .insert({
      user_id: userProfile.id,
      product_id: body.product_id,
      variant_id: body.variant_id ?? null,
      provider_id: product.provider_id,
      customer_input: {
        ...(body.customer_input ?? {}),
        ...(variantProviderCode ? { provider_product_code: providerCode } : {}),
      },
      target: body.target,
      quantity: body.quantity,
      price: price,
      cost: 0, // Will be updated after provider fulfillment
      gateway_fee: gatewayFee,
      status: 'PENDING_PAYMENT',
      ip_address: request.headers.get('x-forwarded-for') ?? 'unknown',
      user_agent: request.headers.get('user-agent') ?? '',
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal membuat pesanan' },
      { status: 500 }
    )
  }

  // Create invoice
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
    // Rollback order
    await serviceClient.from('orders').delete().eq('id', order.id)
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal membuat invoice' },
      { status: 500 }
    )
  }

  // Update order with invoice_id
  await serviceClient
    .from('orders')
    .update({ invoice_id: invoice.id })
    .eq('id', order.id)

  // Call payment gateway to actually generate a QRIS / VA / e-wallet payment
  const gatewayResult = await createPayment({
    invoiceNumber,
    amount: totalAmount,
    paymentMethod: body.payment_method,
    expiredAt,
    customerName: (userProfile as unknown as { full_name?: string }).full_name ?? undefined,
    customerEmail: user.email ?? undefined,
  })

  if (!gatewayResult.success) {
    // Rollback invoice + order — no point leaving an unpayable order behind
    await serviceClient.from('invoices').delete().eq('id', invoice.id)
    await serviceClient.from('orders').delete().eq('id', order.id)
    return NextResponse.json<ApiResponse>(
      { success: false, message: gatewayResult.message ?? 'Gagal menghubungi payment gateway' },
      { status: 502 }
    )
  }

  // Create payment record
  const { data: payment, error: paymentError } = await serviceClient
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      gateway: 'casaku',
      gateway_transaction_id: gatewayResult.gatewayReference ?? null,
      payment_method: body.payment_method,
      payment_code: gatewayResult.paymentCode ?? null,
      // Casaku returns a raw QRIS payload string (qr_string), not a hosted
      // image URL — store it in qr_url and render it as a QR code client-side.
      qr_url: gatewayResult.qrString ?? null,
      amount: totalAmount,
      fee: gatewayFee,
      status: 'PENDING',
      expired_at: expiredAt,
    })
    .select('id, payment_url, qr_url, payment_code')
    .single()

  if (paymentError || !payment) {
    // Rollback invoice + order — a QRIS was already generated at Casaku but
    // we have no payment row to track it, so don't leave a dangling order.
    await serviceClient.from('invoices').delete().eq('id', invoice.id)
    await serviceClient.from('orders').delete().eq('id', order.id)
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal membuat pembayaran' },
      { status: 500 }
    )
  }

  // Log order creation
  await serviceClient.from('order_status_logs').insert({
    order_id: order.id,
    old_status: null,
    new_status: 'PENDING_PAYMENT',
    reason: 'Order created',
  })

  await serviceClient.from('audit_logs').insert({
    user_id: userProfile.id,
    action: 'ORDER_CREATED',
    resource_type: 'order',
    resource_id: order.id,
    new_data: { order_number: order.order_number, product_id: body.product_id, amount: totalAmount },
    ip_address: request.headers.get('x-forwarded-for') ?? 'unknown',
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

  // Kirim notifikasi WhatsApp (fire and forget — tidak block response)
  if (userProfile.phone) {
    waNotifyOrderCreated({
      phone: userProfile.phone,
      name: (userProfile as unknown as { full_name?: string }).full_name ?? 'Pelanggan',
      order_number: order.order_number,
      amount: totalAmount,
      expired_at: expiredAt,
    }).catch(() => {})
  }

  return NextResponse.json<ApiResponse<CheckoutResponse>>({
    success: true,
    message: 'Pesanan berhasil dibuat',
    data: response,
  })
}

async function checkIsReseller(
  serviceClient: SupabaseServiceClient,
  userId: string
): Promise<boolean> {
  const { data } = await serviceClient
    .from('reseller_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle()
  return !!data
}

function calculateGatewayFee(amount: number, method: string): number {
  // Simplified fee calculation
  const fees: Record<string, number | ((a: number) => number)> = {
    QRIS: (a: number) => Math.round(a * 0.007), // 0.7%
    GOPAY: (a: number) => Math.round(a * 0.02),
    OVO: (a: number) => Math.round(a * 0.02),
    DANA: (a: number) => Math.round(a * 0.015),
    SHOPEEPAY: (a: number) => Math.round(a * 0.015),
  }

  const fee = fees[method]
  if (!fee) return 0
  return typeof fee === 'function' ? fee(amount) : fee
}
