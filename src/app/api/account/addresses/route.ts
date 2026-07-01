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

function validate(body: AddressInput): string | null {
  if (!body.label?.trim()) return 'Label alamat wajib diisi.'
  if (!body.recipient_name?.trim()) return 'Nama penerima wajib diisi.'
  if (!body.phone?.trim()) return 'Nomor telepon wajib diisi.'
  if (!body.full_address?.trim()) return 'Alamat lengkap wajib diisi.'
  return null
}

export async function GET() {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await session.serviceClient
    .from('user_addresses')
    .select('id, label, recipient_name, phone, full_address, city, postal_code, notes, is_default, created_at')
    .eq('user_id', session.profile.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as AddressInput
  const err = validate(body)
  if (err) return NextResponse.json({ success: false, message: err }, { status: 400 })

  const { serviceClient, profile } = session

  // First address is default automatically.
  const { count } = await serviceClient
    .from('user_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)

  const makeDefault = body.is_default || (count ?? 0) === 0

  if (makeDefault) {
    await serviceClient.from('user_addresses').update({ is_default: false }).eq('user_id', profile.id)
  }

  const { data, error } = await serviceClient
    .from('user_addresses')
    .insert({
      user_id: profile.id,
      label: body.label!.trim(),
      recipient_name: body.recipient_name!.trim(),
      phone: body.phone!.trim(),
      full_address: body.full_address!.trim(),
      city: body.city?.trim() || null,
      postal_code: body.postal_code?.trim() || null,
      notes: body.notes?.trim() || null,
      is_default: makeDefault,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Alamat ditambahkan.', data })
}
