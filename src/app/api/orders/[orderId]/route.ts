import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface Params {
  params: Promise<{ orderId: string }>
}

// GET /api/orders/[orderId] — get a single order for the authenticated customer
export async function GET(_req: NextRequest, { params }: Params) {
  const { orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'User not found' }, { status: 404 })
  }

  const { data: order, error } = await serviceClient
    .from('orders')
    .select(`
      id, order_number, target, quantity, price, gateway_fee, profit,
      status, provider_reference, paid_at, created_at, updated_at,
      products(name, slug, image_url),
      invoices(invoice_number, amount, expired_at, status)
    `)
    .eq('id', orderId)
    .eq('user_id', profile.id)
    .single()

  if (error || !order) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pesanan tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: order })
}
