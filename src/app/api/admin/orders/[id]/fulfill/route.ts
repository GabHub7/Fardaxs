import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { fulfillOrder } from '@/lib/fulfillment'
import type { ApiResponse } from '@/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { user, serviceClient } = auth

  const { id } = await params

  // Verify order is in PROCESSING state before attempting fulfillment
  const { data: order } = await serviceClient
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!order) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  if (!['PROCESSING', 'FAILED'].includes(order.status as string)) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Pesanan tidak bisa diproses ulang dari status ${order.status}` },
      { status: 400 }
    )
  }

  // Reset to PROCESSING if re-trying from FAILED
  if (order.status === 'FAILED') {
    await serviceClient
      .from('orders')
      .update({ status: 'PROCESSING' })
      .eq('id', id)

    await serviceClient.from('order_status_logs').insert({
      order_id: id,
      old_status: 'FAILED',
      new_status: 'PROCESSING',
      reason: 'Manual retry by admin',
    })
  }

  const outcome = await fulfillOrder(id)

  await serviceClient.from('audit_logs').insert({
    action: 'ORDER_MANUAL_FULFILL',
    resource_type: 'order',
    resource_id: id,
    new_data: { outcome, triggered_by: user.id },
  })

  return NextResponse.json({
    success: true,
    message: outcome === 'SUCCESS'
      ? 'Pesanan berhasil diproses'
      : outcome === 'PENDING'
      ? 'Pesanan menunggu konfirmasi provider'
      : 'Fulfillment gagal — cek log untuk detail',
    data: { outcome },
  })
}
