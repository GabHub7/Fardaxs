import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface Params {
  params: Promise<{ orderId: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { orderId } = await params
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile
  const { data: profile } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'User not found' }, { status: 404 })
  }

  const { data: order } = await serviceClient
    .from('orders')
    .select('id, status, order_number')
    .eq('id', orderId)
    .eq('user_id', profile.id)
    .single()

  if (!order) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<{ status: string; order_number: string }>>({
    success: true,
    message: 'OK',
    data: { status: order.status, order_number: order.order_number },
  })
}
