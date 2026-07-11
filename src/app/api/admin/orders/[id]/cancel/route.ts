import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: orderId } = await params

  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Akses ditolak — hanya Admin yang dapat melakukan aksi ini' },
      { status: 403 }
    )
  }
  const { serviceClient, profileId } = auth

  // 3. Fetch the order
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id, order_number, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Pesanan tidak ditemukan' },
      { status: 404 }
    )
  }

  // 4. Guard: only PENDING_PAYMENT can be cancelled
  if (order.status !== 'PENDING_PAYMENT') {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: `Pesanan tidak dapat dibatalkan — status saat ini: ${order.status}`,
      },
      { status: 422 }
    )
  }

  // 5. Update order status to CANCELLED
  const { error: updateError } = await serviceClient
    .from('orders')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal membatalkan pesanan' },
      { status: 500 }
    )
  }

  // 6. Insert order_status_log
  await serviceClient.from('order_status_logs').insert({
    order_id: orderId,
    old_status: 'PENDING_PAYMENT',
    new_status: 'CANCELLED',
    reason: 'Dibatalkan oleh admin',
    created_by: profileId,
  })

  // 7. Insert audit_log
  await serviceClient.from('audit_logs').insert({
    user_id: profileId,
    action: 'ORDER_CANCELLED',
    resource_type: 'order',
    resource_id: orderId,
    old_data: { status: 'PENDING_PAYMENT' },
    new_data: { status: 'CANCELLED' },
    ip_address: request.headers.get('x-forwarded-for') ?? 'unknown',
  })

  return NextResponse.json<ApiResponse>(
    {
      success: true,
      message: `Pesanan ${order.order_number} berhasil dibatalkan`,
    },
    { status: 200 }
  )
}
