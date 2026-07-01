import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, PaginatedResponse, Notification } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'User not found' }, { status: 404 })
  }

  const { data, error, count } = await serviceClient
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Gagal memuat notifikasi' }, { status: 500 })
  }

  const total = count ?? 0
  return NextResponse.json<PaginatedResponse<Notification>>({
    success: true,
    message: 'OK',
    data: (data ?? []) as Notification[],
    meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'User not found' }, { status: 404 })
  }

  const body = await request.json() as { id?: string; mark_all?: boolean }

  if (body.mark_all) {
    await serviceClient
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('is_read', false)
  } else if (body.id) {
    await serviceClient
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', profile.id)
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'OK' })
}
