import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { data, error } = await auth.serviceClient
    .from('providers')
    .select('id, name, slug, api_url, merchant_id, api_key, status, priority, balance, metadata, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Provider tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const allowed = ['name', 'slug', 'api_url', 'merchant_id', 'secret_key', 'api_key', 'status', 'priority', 'balance', 'metadata']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await auth.serviceClient
    .from('providers')
    .update(updates)
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({ success: false, message: 'Slug sudah digunakan.' }, { status: 409 })
    }
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Provider tidak ditemukan.' }, { status: 404 })
  }

  await auth.serviceClient.from('audit_logs').insert({
    action: 'PROVIDER_UPDATED',
    resource_type: 'provider',
    resource_id: id,
    new_data: updates,
  })

  return NextResponse.json({ success: true, data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Check for products using this provider
  const { count } = await auth.serviceClient
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Provider masih digunakan oleh ${count} produk. Hapus atau pindahkan produk terlebih dahulu.` },
      { status: 409 }
    )
  }

  const { error } = await auth.serviceClient
    .from('providers')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  await auth.serviceClient.from('audit_logs').insert({
    action: 'PROVIDER_DELETED',
    resource_type: 'provider',
    resource_id: id,
    new_data: null,
  })

  return NextResponse.json({ success: true, message: 'Provider berhasil dihapus.' })
}
