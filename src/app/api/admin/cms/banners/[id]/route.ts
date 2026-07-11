import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await auth.serviceClient.from('banners').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json<ApiResponse>({ success: false, message: 'Banner tidak ditemukan.' }, { status: 404 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['title', 'subtitle', 'image_url', 'link_url', 'link_label', 'sort_order', 'status', 'target_blank']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (!updates.title && body.title === '') {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Judul wajib diisi.' }, { status: 400 })
  }

  const { data, error } = await auth.serviceClient.from('banners').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { error } = await auth.serviceClient.from('banners').delete().eq('id', id)
  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Banner dihapus.' })
}
