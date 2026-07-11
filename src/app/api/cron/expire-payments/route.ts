import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkPaymentStatus } from '@/lib/providers/casaku'
import { processSuccessfulPayment, markPaymentExpiredOrFailed } from '@/lib/payment-status'

// Vercel Cron — add to vercel.json:
// { "path": "/api/cron/expire-payments", "schedule": "*/5 * * * *" }
//
// Why this exists: Casaku's webhook only fires when a transaction becomes
// "paid" (see docs — no callback for expired/cancel). Without this poll,
// any order or wallet top-up whose QR expires unpaid would stay PENDING
// forever. This job double-checks with Casaku directly before giving up,
// in case the webhook was missed (network blip, etc.) rather than trusting
// our local expired_at alone.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
  }

  const serviceClient = createServiceClient()
  const nowIso = new Date().toISOString()

  let confirmedPaid = 0
  let expired = 0

  // --- Orders ---
  const { data: pendingPayments } = await serviceClient
    .from('payments')
    .select('id, gateway_transaction_id, status, invoices(id, order_id, amount, fee)')
    .eq('status', 'PENDING')
    .eq('gateway', 'casaku')
    .lt('expired_at', nowIso)
    .not('gateway_transaction_id', 'is', null)
    .limit(50)

  for (const payment of pendingPayments ?? []) {
    const invoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices
    if (!invoice || !payment.gateway_transaction_id) continue

    const result = await checkPaymentStatus(payment.gateway_transaction_id)

    if (result.success && result.status === 'paid') {
      await processSuccessfulPayment(serviceClient, payment.id, invoice, {
        transactionId: payment.gateway_transaction_id,
        amount: invoice.amount + (invoice.fee ?? 0),
      })
      confirmedPaid++
    } else {
      // Not paid at Casaku either (or check itself failed) and locally expired — close it out.
      await markPaymentExpiredOrFailed(serviceClient, payment.id, invoice.order_id, 'EXPIRED')
      expired++
    }
  }

  // --- Wallet top-ups ---
  const { data: pendingTopups } = await serviceClient
    .from('wallet_topups')
    .select('id, user_id, amount, fee, status, gateway_reference')
    .eq('status', 'PENDING')
    .lt('expired_at', nowIso)
    .not('gateway_reference', 'is', null)
    .limit(50)

  for (const topup of pendingTopups ?? []) {
    if (!topup.gateway_reference) continue
    const result = await checkPaymentStatus(topup.gateway_reference)

    if (result.success && result.status === 'paid') {
      await serviceClient.rpc('apply_wallet_mutation', {
        p_user_id: topup.user_id,
        p_type: 'TOP_UP',
        p_amount: topup.amount,
        p_reference_type: 'topup',
        p_reference_id: topup.gateway_reference,
        p_description: 'Top up saldo via Casaku (expiry-poll reconciliation)',
      })
      await serviceClient
        .from('wallet_topups')
        .update({ status: 'PAID', paid_at: new Date().toISOString() })
        .eq('id', topup.id)
        .eq('status', 'PENDING')
      confirmedPaid++
    } else {
      await serviceClient
        .from('wallet_topups')
        .update({ status: 'EXPIRED' })
        .eq('id', topup.id)
        .eq('status', 'PENDING')
      expired++
    }
  }

  return NextResponse.json({ success: true, confirmedPaid, expired })
}
