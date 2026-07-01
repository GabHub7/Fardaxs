import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await auth.serviceClient
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.title?.trim()) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Judul wajib diisi.' }, { status: 400 })
  }

  const { data, error } = await auth.serviceClient
    .from('banners')
    .insert({
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() || null,
      image_url: body.image_url?.trim() || null,
      link_url: body.link_url?.trim() || null,
      link_label: body.link_label?.trim() || null,
      sort_order: body.sort_order ?? 1,
      status: body.status ?? 'ACTIVE',
      target_blank: body.target_blank ?? false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data }, { status: 201 })
}
