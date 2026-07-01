/**
 * GET /api/orders/by-number/[orderNumber]
 * Cek status pesanan by order_number — dipakai bot WA untuk fitur tracking
 * ("cek pesanan FRDX-xxxx").
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

const BOT_TOKEN = process.env.WHATSAPP_BOT_TOKEN ?? ''

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const token = request.headers.get('x-bot-token') ??
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!BOT_TOKEN || !token || token !== BOT_TOKEN) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { orderNumber } = await params
  if (!orderNumber) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Order number wajib diisi' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: order } = await serviceClient
    .from('orders')
    .select(`
      id, order_number, status, target, price, gateway_fee, created_at, paid_at, completed_at,
      products(name, slug),
      users(full_name, phone)
    `)
    .eq('order_number', orderNumber.toUpperCase())
    .is('deleted_at', null)
    .single()

  if (!order) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pesanan tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'OK', data: order })
}
