import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

// GET: fetch current user's profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('users')
    .select('id, email, username, full_name, phone, avatar_url, role_id, status, created_at')
    .eq('auth_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Profil tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data })
}

// PATCH: update current user's profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const allowed = ['full_name', 'phone', 'username', 'avatar_url']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (updates.full_name && typeof updates.full_name === 'string' && !updates.full_name.trim()) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Nama tidak boleh kosong.' }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('users')
    .update(updates)
    .eq('auth_id', user.id)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Profil berhasil diperbarui.' })
}
