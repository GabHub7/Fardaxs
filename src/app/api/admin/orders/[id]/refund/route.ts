import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { user, serviceClient } = auth

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = (body.reason ?? 'Manual refund by admin') as string

  // Verify order exists and is in a refundable state
  const { data: order } = await serviceClient
    .from('orders')
    .select('id, status, price, gateway_fee, user_id')
    .eq('id', id)
    .single()

  if (!order) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pesanan tidak ditemukan.' }, { status: 404 })
  }

  const refundableStatuses = ['SUCCESS', 'FAILED', 'PROCESSING', 'PAID']
  if (!refundableStatuses.includes(order.status as string)) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Pesanan dengan status ${order.status} tidak bisa direfund.` },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const refundAmount = order.price + (order.gateway_fee ?? 0)

  // Update order status to REFUNDED
  await serviceClient
    .from('orders')
    .update({ status: 'REFUNDED', updated_at: now })
    .eq('id', id)

  // Log the status change
  await serviceClient.from('order_status_logs').insert({
    order_id: id,
    old_status: order.status,
    new_status: 'REFUNDED',
    reason,
    created_by: user.id,
  })

  // Create refund record (non-fatal if table doesn't exist)
  try {
    await serviceClient.from('refunds').insert({
      order_id: id,
      amount: refundAmount,
      reason,
      status: 'PENDING',
      processed_by: user.id,
    })
  } catch {
    // refunds table might not exist yet
  }

  // Release inventory if it was assigned
  await serviceClient
    .from('inventories')
    .update({ status: 'AVAILABLE', assigned_order_id: null })
    .eq('assigned_order_id', id)

  // Notify user
  await serviceClient.from('notifications').insert({
    user_id: order.user_id,
    title: 'Refund Diproses',
    message: `Refund untuk pesanan Anda sedang diproses. Dana sebesar ${refundAmount.toLocaleString('id-ID')} akan dikembalikan dalam 1-3 hari kerja.`,
    channel: 'SYSTEM',
    status: 'SENT',
  })

  await serviceClient.from('audit_logs').insert({
    action: 'ORDER_REFUNDED',
    resource_type: 'order',
    resource_id: id,
    new_data: { reason, refund_amount: refundAmount, processed_by: user.id },
  })

  return NextResponse.json({
    success: true,
    message: `Refund sebesar Rp${refundAmount.toLocaleString('id-ID')} berhasil diproses.`,
    data: { refund_amount: refundAmount },
  })
}
