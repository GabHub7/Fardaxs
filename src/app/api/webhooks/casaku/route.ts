import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import { getEnvVars } from '@/lib/env-vars'
import { processSuccessfulPayment } from '@/lib/payment-status'

// Casaku.id webhook payload — dikirim HANYA saat transaksi berubah jadi
// "paid" (lihat docs: "Webhook Overview" — tidak ada callback terpisah untuk
// failed/expired/cancel). Signature dikirim di header X-Casaku-Signature,
// dihitung dari HMAC-SHA256(rawBody, webhookSecret) — BUKAN dari field di
// dalam payload, jadi kita wajib baca raw body sebelum di-parse.
interface CasakuWebhookPayload {
  transactionId: string
  amount: number
  packageName?: string
  appName?: string
  status: string // "paid" per docs
  paidAt?: string
}

function validateCasakuSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const expectedBuf = Buffer.from(expected, 'hex')
  const givenBuf = Buffer.from(signatureHeader, 'hex')
  if (expectedBuf.length !== givenBuf.length) return false

  return crypto.timingSafeEqual(expectedBuf, givenBuf)
}

export async function POST(request: NextRequest) {
  const serviceClient = createServiceClient()
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const signatureHeader = request.headers.get('x-casaku-signature') ?? ''

  // MUST read raw text first — JSON.parse re-serialization can reorder keys
  // and would break the HMAC comparison (per Casaku's own signature docs).
  const rawBody = await request.text()

  let payload: CasakuWebhookPayload
  try {
    payload = JSON.parse(rawBody) as CasakuWebhookPayload
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
  }

  // Store raw callback immediately (before validation — for audit purposes)
  const { data: callbackRecord } = await serviceClient
    .from('payment_callbacks')
    .insert({
      gateway: 'casaku',
      payload: payload as unknown as Record<string, unknown>,
      headers: Object.fromEntries(request.headers.entries()),
      ip_address: ip,
      signature: signatureHeader,
      is_valid: false,
      processed: false,
    })
    .select('id')
    .single()

  // --- VALIDATION ---

  const env = await getEnvVars(['CASAKU_WEBHOOK_SECRET'])

  if (!signatureHeader || !env.CASAKU_WEBHOOK_SECRET) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Missing signature or webhook secret not configured')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  let signatureValid = false
  try {
    signatureValid = validateCasakuSignature(rawBody, signatureHeader, env.CASAKU_WEBHOOK_SECRET)
  } catch {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Signature validation error')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  if (!signatureValid) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Invalid signature')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  if (!payload.transactionId) {
    await markCallbackInvalid(serviceClient, callbackRecord?.id, 'Missing transactionId')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // Casaku's webhook has no invoice_number of ours — matching is done via
  // gateway_reference, which we stored ourselves at payment-creation time
  // (= the transactionId Casaku returned from /api/generate/v2/qris).
  // Wallet top-ups and order payments live in different tables, so try
  // orders first, then top-ups.

  const { data: payment } = await serviceClient
    .from('payments')
    .select('id, status, invoice_id, invoices(id, order_id, amount, fee)')
    .eq('gateway_transaction_id', payload.transactionId)
    .single()

  if (payment) {
    return handleOrderCallback(serviceClient, callbackRecord?.id, payment, payload)
  }

  const { data: topup } = await serviceClient
    .from('wallet_topups')
    .select('id, user_id, amount, fee, status')
    .eq('gateway_reference', payload.transactionId)
    .single()

  if (topup) {
    return handleTopupCallback(serviceClient, callbackRecord?.id, topup, payload)
  }

  await markCallbackInvalid(serviceClient, callbackRecord?.id, 'No matching payment or top-up for transactionId')
  return NextResponse.json({ success: false }, { status: 404 })
}

async function handleOrderCallback(
  serviceClient: SupabaseServiceClient,
  callbackId: string | undefined,
  payment: {
    id: string
    status: string
    invoice_id: string
    invoices: { id: string; order_id: string; amount: number; fee: number } | { id: string; order_id: string; amount: number; fee: number }[]
  },
  payload: CasakuWebhookPayload
) {
  const invoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices
  if (!invoice) {
    await markCallbackInvalid(serviceClient, callbackId, 'Invoice not found for payment')
    return NextResponse.json({ success: false }, { status: 404 })
  }

  // Amount check — payload.amount is the total actually paid (incl. unique code)
  const invoiceTotal = invoice.amount + (invoice.fee ?? 0)
  if (Math.abs(invoiceTotal - payload.amount) > 1) {
    await markCallbackInvalid(serviceClient, callbackId, 'Amount mismatch')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // Duplicate callback protection
  if (payment.status === 'PAID') {
    await serviceClient.from('payment_callbacks').update({ is_valid: true, processed: false, payment_id: payment.id }).eq('id', callbackId)
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  await serviceClient
    .from('payment_callbacks')
    .update({ payment_id: payment.id, is_valid: true, processed: true, processed_at: new Date().toISOString() })
    .eq('id', callbackId)

  // Casaku only calls the webhook for "paid" — expiry/cancel must be
  // reconciled separately (poll /api/generate/check-status or /api/generate/list),
  // this handler does not attempt to guess a failure from a missing callback.
  if (payload.status === 'paid') {
    await processSuccessfulPayment(serviceClient, payment.id, invoice, payload)
  }

  return NextResponse.json({ success: true })
}

async function handleTopupCallback(
  serviceClient: SupabaseServiceClient,
  callbackId: string | undefined,
  topup: { id: string; user_id: string; amount: number; fee: number; status: string },
  payload: CasakuWebhookPayload
) {
  const expectedTotal = topup.amount + (topup.fee ?? 0)
  if (Math.abs(expectedTotal - payload.amount) > 1) {
    await markCallbackInvalid(serviceClient, callbackId, 'Top-up amount mismatch')
    return NextResponse.json({ success: false }, { status: 400 })
  }

  if (topup.status === 'PAID') {
    await serviceClient.from('payment_callbacks').update({ is_valid: true, processed: false }).eq('id', callbackId)
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  await serviceClient
    .from('payment_callbacks')
    .update({ is_valid: true, processed: true, processed_at: new Date().toISOString() })
    .eq('id', callbackId)

  if (payload.status === 'paid') {
    await serviceClient.rpc('apply_wallet_mutation', {
      p_user_id: topup.user_id,
      p_type: 'TOP_UP',
      p_amount: topup.amount,
      p_reference_type: 'topup',
      p_reference_id: payload.transactionId,
      p_description: 'Top up saldo via Casaku',
    })

    await serviceClient
      .from('wallet_topups')
      .update({
        status: 'PAID',
        gateway_reference: payload.transactionId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', topup.id)
      .eq('status', 'PENDING')

    await serviceClient.from('audit_logs').insert({
      action: 'WALLET_TOPUP',
      resource_type: 'wallet_topup',
      resource_id: topup.id,
      new_data: { amount: topup.amount, gateway_transaction_id: payload.transactionId },
    })
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
