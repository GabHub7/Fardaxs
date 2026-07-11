import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { okeConnectAdapter } from '@/lib/providers/okeconnect'
import { smmPanelAdapter } from '@/lib/providers/smm-panel'

// Vercel Cron — configured in vercel.json:
// { "path": "/api/cron/check-provider-status", "schedule": "*/5 * * * *" }
// Auth: CRON_SECRET env var (add to vercel.json headers check)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Enforce in production — reject if secret not set OR header mismatch
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
  }

  const serviceClient = createServiceClient()

  // Find PROCESSING orders older than 5 minutes that have a provider_reference (sent to OkeConnect)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: pendingOrders } = await serviceClient
    .from('orders')
    .select('id, order_number, provider_reference, user_id, products(name, fulfillment_type)')
    .eq('status', 'PROCESSING')
    .not('provider_reference', 'is', null)
    .lt('updated_at', fiveMinutesAgo)
    .gt('updated_at', twoHoursAgo) // Don't re-check very old ones — they'll be reviewed manually
    .limit(20)

  if (!pendingOrders || pendingOrders.length === 0) {
    return NextResponse.json({ success: true, checked: 0 })
  }

  let resolved = 0
  let failed = 0

  for (const order of pendingOrders) {
    const productsRel = order.products
    const products = (Array.isArray(productsRel) ? productsRel[0] : productsRel) as
      | { name: string; fulfillment_type: string }
      | null
    const ft = products?.fulfillment_type
    if (ft !== 'PROVIDER' && ft !== 'AUTO_PPOB' && ft !== 'SMM') {
      continue
    }

    if (!order.provider_reference) continue

    // Route status checks to the matching provider adapter.
    const adapter = ft === 'SMM' ? smmPanelAdapter : okeConnectAdapter

    try {
      const statusResult = await adapter.checkStatus(order.provider_reference)
      const now = new Date().toISOString()

      const isPending = !statusResult.success &&
        (statusResult.message?.toLowerCase().includes('proses') ||
         statusResult.message?.toLowerCase().includes('pending'))

      if (statusResult.success) {
        await serviceClient
          .from('orders')
          .update({
            status: 'SUCCESS',
            completed_at: now,
            provider_status: 'SUCCESS',
          })
          .eq('id', order.id)

        await serviceClient.from('order_status_logs').insert({
          order_id: order.id,
          old_status: 'PROCESSING',
          new_status: 'SUCCESS',
          reason: 'Cron: provider status check — SUCCESS',
          metadata: { provider_reference: order.provider_reference },
        })

        await serviceClient.from('notifications').insert({
          user_id: order.user_id,
          title: 'Pesanan Selesai!',
          message: `Pesanan ${products?.name ?? 'produk'} berhasil diproses.`,
          channel: 'SYSTEM',
          status: 'SENT',
        })

        resolved++
      } else if (!statusResult.success && !isPending) {
        await serviceClient
          .from('orders')
          .update({ status: 'FAILED', provider_status: 'FAILED' })
          .eq('id', order.id)

        await serviceClient.from('order_status_logs').insert({
          order_id: order.id,
          old_status: 'PROCESSING',
          new_status: 'FAILED',
          reason: `Cron: provider status check — FAILED (${statusResult.message ?? 'unknown'})`,
        })

        await serviceClient.from('notifications').insert({
          user_id: order.user_id,
          title: 'Pesanan Gagal',
          message: `Pesanan ${products?.name ?? 'produk'} gagal diproses. Tim kami akan segera menangani.`,
          channel: 'SYSTEM',
          status: 'SENT',
        })

        failed++
      }
      // PENDING — still processing, do nothing
    } catch {
      // Log but continue
      await serviceClient.from('audit_logs').insert({
        action: 'CRON_STATUS_CHECK_ERROR',
        resource_type: 'order',
        resource_id: order.id,
        new_data: { provider_reference: order.provider_reference },
      })
    }
  }

  return NextResponse.json({
    success: true,
    checked: pendingOrders.length,
    resolved,
    failed,
    remaining: pendingOrders.length - resolved - failed,
  })
}
