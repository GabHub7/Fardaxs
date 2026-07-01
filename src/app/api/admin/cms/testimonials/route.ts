import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await auth.serviceClient
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.customer_name?.trim() || !body.message?.trim()) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Nama dan pesan wajib diisi.' }, { status: 400 })
  }

  if (body.rating < 1 || body.rating > 5) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Rating harus antara 1-5.' }, { status: 400 })
  }

  const { data, error } = await auth.serviceClient
    .from('testimonials')
    .insert({
      customer_name: body.customer_name.trim(),
      avatar_url: body.avatar_url?.trim() || null,
      message: body.message.trim(),
      rating: body.rating ?? 5,
      product_name: body.product_name?.trim() || null,
      sort_order: body.sort_order ?? 1,
      status: body.status ?? 'ACTIVE',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data }, { status: 201 })
}
