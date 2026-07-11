import type { SupabaseServiceClient } from '@/lib/supabase/server'
import { fulfillOrder } from '@/lib/fulfillment'

/**
 * Tandai pembayaran sebagai PAID, lanjutkan order ke PROCESSING, dan
 * trigger fulfillment. Dipakai oleh webhook Casaku (saat callback masuk)
 * dan cron expire-payments (kalau ternyata polling nemu status paid).
 */
export async function processSuccessfulPayment(
  serviceClient: SupabaseServiceClient,
  paymentId: string,
  invoice: { id: string; order_id: string; amount: number },
  payload: { transactionId: string; amount: number }
) {
  const now = new Date().toISOString()

  await serviceClient
    .from('payments')
    .update({
      status: 'PAID',
      gateway_transaction_id: payload.transactionId,
      paid_at: now,
    })
    .eq('id', paymentId)

  await serviceClient
    .from('invoices')
    .update({ status: 'PAID' })
    .eq('id', invoice.id)

  await serviceClient
    .from('orders')
    .update({ status: 'PAID', paid_at: now })
    .eq('id', invoice.order_id)
    .eq('status', 'PENDING_PAYMENT')

  await serviceClient.from('order_status_logs').insert({
    order_id: invoice.order_id,
    old_status: 'PENDING_PAYMENT',
    new_status: 'PAID',
    reason: 'Payment callback received',
    metadata: { gateway: payload.transactionId },
  })

  await serviceClient.from('audit_logs').insert({
    action: 'PAYMENT_RECEIVED',
    resource_type: 'payment',
    resource_id: paymentId,
    new_data: {
      order_id: invoice.order_id,
      amount: payload.amount,
      gateway_transaction_id: payload.transactionId,
    },
  })

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

  void fulfillOrder(invoice.order_id)
}

/** Tandai pembayaran+invoice+order sebagai EXPIRED/FAILED sekaligus. */
export async function markPaymentExpiredOrFailed(
  serviceClient: SupabaseServiceClient,
  paymentId: string,
  orderId: string,
  finalStatus: 'EXPIRED' | 'FAILED'
) {
  await serviceClient.from('payments').update({ status: finalStatus }).eq('id', paymentId)
  await serviceClient
    .from('invoices')
    .update({ status: finalStatus })
    .eq('order_id', orderId)
  await serviceClient
    .from('orders')
    .update({ status: finalStatus })
    .eq('id', orderId)
    .eq('status', 'PENDING_PAYMENT')
  await serviceClient.from('order_status_logs').insert({
    order_id: orderId,
    old_status: 'PENDING_PAYMENT',
    new_status: finalStatus,
    reason: `Payment ${finalStatus.toLowerCase()} (expiry poll — Casaku doesn't webhook this)`,
  })
}
