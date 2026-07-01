import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await auth.serviceClient
    .from('providers')
    .select('id, name, slug, api_url, merchant_id, status, priority, balance, metadata, created_at, updated_at')
    .order('priority', { ascending: true })

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, slug, api_url, merchant_id, secret_key, api_key, status, priority, balance, metadata } = body

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Nama dan slug wajib diisi.' }, { status: 400 })
  }

  const { data, error } = await auth.serviceClient
    .from('providers')
    .insert({
      name: name.trim(),
      slug: slug.trim(),
      api_url: api_url ?? null,
      merchant_id: merchant_id ?? null,
      secret_key: secret_key ?? null,
      api_key: api_key ?? null,
      status: status ?? 'ACTIVE',
      priority: priority ?? 10,
      balance: balance ?? 0,
      metadata: metadata ?? {},
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Slug sudah digunakan.' }, { status: 409 })
    }
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  await auth.serviceClient.from('audit_logs').insert({
    action: 'PROVIDER_CREATED',
    resource_type: 'provider',
    resource_id: data.id,
    new_data: { name, slug, status },
  })

  return NextResponse.json({ success: true, data }, { status: 201 })
}
