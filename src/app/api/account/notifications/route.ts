import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/supabase/server'

export async function GET() {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data } = await session.serviceClient
    .from('users')
    .select('notification_prefs')
    .eq('id', session.profile.id)
    .maybeSingle()

  const prefs = (data?.notification_prefs as { order?: boolean; promo?: boolean } | null) ?? { order: true, promo: false }
  return NextResponse.json({ success: true, data: { order: prefs.order ?? true, promo: prefs.promo ?? false } })
}

export async function PATCH(request: NextRequest) {
  const session = await getCurrentUserProfile()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { order?: boolean; promo?: boolean }

  // Merge with existing to allow partial updates
  const { data: current } = await session.serviceClient
    .from('users')
    .select('notification_prefs')
    .eq('id', session.profile.id)
    .maybeSingle()

  const existing = (current?.notification_prefs as { order?: boolean; promo?: boolean } | null) ?? {}
  const next = {
    order: body.order ?? existing.order ?? true,
    promo: body.promo ?? existing.promo ?? false,
  }

  const { error } = await session.serviceClient
    .from('users')
    .update({ notification_prefs: next })
    .eq('id', session.profile.id)

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: next })
}
