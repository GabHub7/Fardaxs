import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/supabase/server'

interface AddressInput {
  label?: string
  recipient_name?: string
  phone?: string
  full_address?: string
  city?: string
  postal_code?: string
  notes?: string
  is_default?: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = (await request.json()) as AddressInput
  const { serviceClient, profile } = session

  // Ownership check
  const { data: existing } = await serviceClient
    .from('user_addresses')
    .select('id')
    .eq('id', id)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ success: false, message: 'Alamat tidak ditemukan.' }, { status: 404 })

  if (body.is_default) {
    await serviceClient.from('user_addresses').update({ is_default: false }).eq('user_id', profile.id)
  }

  const patch: Record<string, unknown> = {}
  if (body.label !== undefined) patch.label = body.label.trim()
  if (body.recipient_name !== undefined) patch.recipient_name = body.recipient_name.trim()
  if (body.phone !== undefined) patch.phone = body.phone.trim()
  if (body.full_address !== undefined) patch.full_address = body.full_address.trim()
  if (body.city !== undefined) patch.city = body.city?.trim() || null
  if (body.postal_code !== undefined) patch.postal_code = body.postal_code?.trim() || null
  if (body.notes !== undefined) patch.notes = body.notes?.trim() || null
  if (body.is_default !== undefined) patch.is_default = body.is_default

  const { error } = await serviceClient
    .from('user_addresses')
    .update(patch)
    .eq('id', id)
    .eq('user_id', profile.id)

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Alamat diperbarui.' })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { serviceClient, profile } = session

  const { error } = await serviceClient
    .from('user_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', profile.id)

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Alamat dihapus.' })
}
