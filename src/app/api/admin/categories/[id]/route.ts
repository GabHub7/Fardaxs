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
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Kategori tidak ditemukan' }, { status: 404 })
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

  const allowed = ['name', 'slug', 'description', 'icon_url', 'banner_url', 'color', 'sort_order', 'status']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await ctx.serviceClient
    .from('categories')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'Kategori berhasil diperbarui' })
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
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Tidak bisa menghapus kategori yang memiliki produk' },
      { status: 409 }
    )
  }

  const { error } = await ctx.serviceClient.from('categories').delete().eq('id', id)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'Kategori berhasil dihapus' })
}
