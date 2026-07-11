import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

// GET /api/orders — list current user's orders
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10')))
  const offset = (page - 1) * limit

  let query = serviceClient
    .from('orders')
    .select(
      'id, order_number, target, price, gateway_fee, status, created_at, products(name, image_url)',
      { count: 'exact' }
    )
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count } = await query

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  })
}
