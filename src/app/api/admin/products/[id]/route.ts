import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin()
  if (!ctx) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { data, error } = await ctx.serviceClient
    .from('products')
    .select('*, categories(id, name)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'OK', data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin()
  if (!ctx) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as Record<string, unknown>

  const allowed = [
    'name', 'slug', 'short_description', 'description', 'image_url', 'thumbnail_url',
    'selling_price', 'reseller_price', 'base_cost',
    'category_id', 'provider_id', 'provider_product_code',
    'fulfillment_type', 'target_type', 'target_label', 'target_placeholder', 'target_validation',
    'is_featured', 'sort_order', 'status',
  ]

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await ctx.serviceClient
    .from('products')
    .update(updates)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Slug sudah digunakan produk lain' },
        { status: 409 }
      )
    }
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'Produk berhasil diperbarui' })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin()
  if (!ctx) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { count } = await ctx.serviceClient
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .not('status', 'in', '("CANCELLED","EXPIRED","REFUNDED")')

  if ((count ?? 0) > 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Tidak bisa menghapus produk dengan pesanan aktif' },
      { status: 409 }
    )
  }

  const { error } = await ctx.serviceClient.from('products').delete().eq('id', id)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'Produk berhasil dihapus' })
}
