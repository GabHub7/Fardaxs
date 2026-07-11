import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function GET() {
  const ctx = await requireAdmin()
  if (!ctx) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await ctx.serviceClient
    .from('categories')
    .select('id, name, slug, status, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'OK', data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    name: string
    slug: string
    description?: string
    icon_url?: string
    banner_url?: string
    color?: string
    sort_order?: number
    status?: string
  }

  if (!body.name?.trim() || !body.slug?.trim()) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Nama dan slug wajib diisi' },
      { status: 400 }
    )
  }

  const { data, error } = await ctx.serviceClient
    .from('categories')
    .insert({
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      description: body.description ?? null,
      icon_url: body.icon_url ?? null,
      banner_url: body.banner_url ?? null,
      color: body.color ?? null,
      sort_order: body.sort_order ?? 0,
      status: body.status ?? 'ACTIVE',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>(
        { success: false, message: 'Slug sudah digunakan' },
        { status: 409 }
      )
    }
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Kategori berhasil dibuat', data }, { status: 201 })
}
