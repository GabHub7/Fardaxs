import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import { fulfillOrder } from '@/lib/fulfillment'
import { getEnvVars } from '@/lib/env-vars'

// Casaku.id (formerly "Cashify") callback payload type
interface CasakuCallback {
  merchant_id: string
  invoice_number: string
  gateway_transaction_id: string
  amount: number
  status: string
  timestamp: string
  signature: string
  payment_method?: string
  reference?: string
}

function validateCasakuSignature(payload: CasakuCallback, secret: string): boolean {
  const dataString = [
    payload.merchant_id,
    payload.invoice_number,
    payload.gateway_transaction_id,
    payload.amount.toString(),
    payload.status,
    payload.timestamp,
  ].join('')

  const expected = crypto
    .createHmac('sha256', secret)
    .update(dataString)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(payload.signature, 'hex')
  )
}

export async function POST(request: NextRequest) {
  const serviceClient = createServiceClient()
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

  let rawPayload: CasakuCallback
  try {
    rawPayload = await request.json() as CasakuCallback
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
  }

  // Store raw callback immediately (before validation — for audit purposes)
  const { data: callbackRecord } = await serviceClient
    .from('payment_callbacks')
    .insert({
      gateway: 'casaku',
      payload: rawPayload as unknown as Record<string, unknown>,
      headers: Object.fromEntries(request.headers.entries()),
      ip_address: ip,
      signature: rawPayload.signature,
      is_valid: false,
      processed: false,
    })
    .select('id')
    .single()

  // --- VALIDATION ---

  const env = await getEnvVars(['CASAKU_MERCHANT_ID', 'CASAKU_WEBHOOK_SECRET', 'CASAKU_SECRET_KEY'])

  // 1. Validate merchant ID
  if (rawPayload.merchant_id !== env.CASAKU_MERCHANT_ID) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Invalid merchant ID')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // 2. Validate signature (uses webhook secret, bukan API key)
  const secret = env.CASAKU_WEBHOOK_SECRET || env.CASAKU_SECRET_KEY || ''
  let signatureValid = false
  try {
    signatureValid = validateCasakuSignature(rawPayload, secret)
  } catch {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Signature validation error')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  if (!signatureValid) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Invalid signature')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // 3. Validate timestamp (prevent replay attacks — reject if > 5 minutes old)
  const callbackTime = new Date(rawPayload.timestamp).getTime()
  const now = Date.now()
  if (Math.abs(now - callbackTime) > 5 * 60 * 1000) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Timestamp expired')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // 3.5 Wallet top-ups are routed by the "TOPUP-" invoice prefix — they have no
  // order/invoice/payment rows, so handle and return before the order lookup.
  if (rawPayload.invoice_number.startsWith('TOPUP-')) {
    return handleTopupCallback(serviceClient, callbackRecord?.id, rawPayload)
  }

  // 4. Find invoice by invoice_number
  const { data: invoice } = await serviceClient
    .from('invoices')
    .select('id, order_id, amount, fee, status')
    .eq('invoice_number', rawPayload.invoice_number)
    .single()

  if (!invoice) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Invoice not found')
    return NextResponse.json({ success: false }, { status: 404 })
  }

  // 5. Validate amount — gateway sends back totalAmount (amount + fee), so compare totals
  const invoiceTotal = (invoice.amount as number) + ((invoice.fee as number) ?? 0)
  if (Math.abs(invoiceTotal - rawPayload.amount) > 1) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Amount mismatch')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // 6. Find corresponding payment record
  const { data: payment } = await serviceClient
    .from('payments')
    .select('id, status, invoice_id')
    .eq('invoice_id', invoice.id)
    .single()

  if (!payment) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Payment not found')
    return NextResponse.json({ success: false }, { status: 404 })
  }

  // 7. Duplicate callback protection — only process first PAID callback
  if (payment.status === 'PAID') {
    // Already processed — idempotent response
    await serviceClient
      .from('payment_callbacks')
      .update({ is_valid: true, processed: false })
      .eq('id', callbackRecord?.id)
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  // 8. Update payment callback record as valid
  await serviceClient
    .from('payment_callbacks')
    .update({
      payment_id: payment.id,
      is_valid: true,
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('id', callbackRecord?.id)

  // --- PROCESS PAYMENT ---

  if (rawPayload.status === 'SUCCESS' || rawPayload.status === 'PAID') {
    await processSuccessfulPayment(serviceClient, payment.id, invoice, rawPayload)
  } else if (rawPayload.status === 'FAILED' || rawPayload.status === 'EXPIRED') {
    await processFailedPayment(serviceClient, payment.id, invoice.order_id, rawPayload.status)
  }

  return NextResponse.json({ success: true })
}

async function processSuccessfulPayment(
  serviceClient: SupabaseServiceClient,
  paymentId: string,
  invoice: { id: string; order_id: string; amount: number },
  payload: CasakuCallback
) {
  const now = new Date().toISOString()

  // Update payment status
  await serviceClient
    .from('payments')
    .update({
      status: 'PAID',
      gateway_transaction_id: payload.gateway_transaction_id,
      paid_at: now,
    })
    .eq('id', paymentId)

  // Update invoice status
  await serviceClient
    .from('invoices')
    .update({ status: 'PAID' })
    .eq('id', invoice.id)

  // Update order status to PAID
  await serviceClient
    .from('orders')
    .update({ status: 'PAID', paid_at: now })
    .eq('id', invoice.order_id)
    .eq('status', 'PENDING_PAYMENT') // Only update if still pending

  // Log order status change
  await serviceClient.from('order_status_logs').insert({
    order_id: invoice.order_id,
    old_status: 'PENDING_PAYMENT',
    new_status: 'PAID',
    reason: 'Payment callback received',
    metadata: { gateway: payload.gateway_transaction_id },
  })

  // Log audit
  await serviceClient.from('audit_logs').insert({
    action: 'PAYMENT_RECEIVED',
    resource_type: 'payment',
    resource_id: paymentId,
    new_data: {
      order_id: invoice.order_id,
      amount: payload.amount,
      gateway_transaction_id: payload.gateway_transaction_id,
    },
  })

  // Queue fulfillment (mark order as PROCESSING — fulfillment worker picks it up)
  await serviceClient
    .from('orders')
    .update({ status: 'PROCESSING' })
    .eq('id', invoice.order_id)
    .eq('status', 'PAID')

  await serviceClient.from('order_status_logs').insert({
    order_id: invoice.order_id,
    old_status: 'PAID',
    new_status: 'PROCESSING',
    reason: 'Queued for fulfillment',
  })

  // Run fulfillment inline (for PROVIDER and INVENTORY types)
  // MANUAL orders remain PROCESSING for admin to handle
  void fulfillOrder(invoice.order_id)
}

async function processFailedPayment(
  serviceClient: SupabaseServiceClient,
  paymentId: string,
  orderId: string,
  status: string
) {
  const finalStatus = status === 'EXPIRED' ? 'EXPIRED' : 'FAILED'

  await serviceClient
    .from('payments')
    .update({ status: finalStatus as 'EXPIRED' | 'FAILED' })
    .eq('id', paymentId)

  await serviceClient
    .from('invoices')
    .update({ status: finalStatus as 'EXPIRED' | 'FAILED' })
    .eq('order_id', orderId)

  await serviceClient
    .from('orders')
    .update({ status: finalStatus as 'EXPIRED' | 'FAILED' })
    .eq('id', orderId)
    .in('status', ['PENDING_PAYMENT'])

  await serviceClient.from('order_status_logs').insert({
    order_id: orderId,
    old_status: 'PENDING_PAYMENT',
    new_status: finalStatus,
    reason: `Payment ${finalStatus.toLowerCase()}`,
  })
}

async function handleTopupCallback(
  serviceClient: SupabaseServiceClient,
  callbackId: string | undefined,
  payload: CasakuCallback
) {
  // Find the pending top-up
  const { data: topup } = await serviceClient
    .from('wallet_topups')
    .select('id, user_id, amount, fee, status')
    .eq('invoice_number', payload.invoice_number)
    .single()

  if (!topup) {
    await markCallbackInvalid(serviceClient, callbackId, 'Top-up not found')
    return NextResponse.json({ success: false }, { status: 404 })
  }

  // Validate amount (gateway returns amount + fee)
  const expectedTotal = (topup.amount as number) + ((topup.fee as number) ?? 0)
  if (Math.abs(expectedTotal - payload.amount) > 1) {
    await markCallbackInvalid(serviceClient, callbackId, 'Top-up amount mismatch')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // Idempotency — only the first PAID callback credits the wallet
  if (topup.status === 'PAID') {
    await serviceClient.from('payment_callbacks').update({ is_valid: true, processed: false }).eq('id', callbackId)
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  await serviceClient
    .from('payment_callbacks')
    .update({ is_valid: true, processed: true, processed_at: new Date().toISOString() })
    .eq('id', callbackId)

  if (payload.status === 'SUCCESS' || payload.status === 'PAID') {
    // Atomically credit the wallet (handles wallet creation + mutation log)
    await serviceClient.rpc('apply_wallet_mutation', {
      p_user_id: topup.user_id,
      p_type: 'TOP_UP',
      p_amount: topup.amount,
      p_reference_type: 'topup',
      p_reference_id: payload.invoice_number,
      p_description: 'Top up saldo via Casaku',
    })

    await serviceClient
      .from('wallet_topups')
      .update({
        status: 'PAID',
        gateway_reference: payload.gateway_transaction_id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', topup.id)
      .eq('status', 'PENDING')

    await serviceClient.from('audit_logs').insert({
      action: 'WALLET_TOPUP',
      resource_type: 'wallet_topup',
      resource_id: topup.id as string,
      new_data: { amount: topup.amount, gateway_transaction_id: payload.gateway_transaction_id },
    })
  } else if (payload.status === 'FAILED' || payload.status === 'EXPIRED') {
    await serviceClient
      .from('wallet_topups')
      .update({ status: payload.status === 'EXPIRED' ? 'EXPIRED' : 'FAILED' })
      .eq('id', topup.id)
      .eq('status', 'PENDING')
  }

  return NextResponse.json({ success: true })
}

async function markCallbackInvalid(
  serviceClient: SupabaseServiceClient,
  callbackId: string | undefined,
  reason: string
) {
  if (!callbackId) return
  await serviceClient
    .from('payment_callbacks')
    .update({ is_valid: false, error_message: reason })
    .eq('id', callbackId)
}
