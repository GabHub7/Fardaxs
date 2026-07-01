import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

// GET/POST for the wa_notif_enabled flag in site_settings — this is the
// single on/off switch that actually controls whether lib/whatsapp.ts
// sends order/payment notifications (see waPost()'s isWaNotifEnabled()
// check). It's deliberately separate from /api/admin/whatsapp/health
// (bot process connectivity) and /api/admin/whatsapp/test (send a test
// message), since "is the bot online" and "are notifications turned on"
// are independent states.

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data } = await auth.serviceClient
    .from('site_settings')
    .select('value')
    .eq('key', 'wa_notif_enabled')
    .maybeSingle()

  return NextResponse.json({
    success: true,
    data: { enabled: data?.value !== false },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.enabled !== 'boolean') {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Field "enabled" (boolean) wajib diisi.' }, { status: 400 })
  }

  const { error } = await auth.serviceClient
    .from('site_settings')
    .upsert({ key: 'wa_notif_enabled', value: body.enabled, updated_at: new Date().toISOString() })

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Gagal menyimpan pengaturan.' }, { status: 500 })
  }

  await auth.serviceClient.from('audit_logs').insert({
    action: body.enabled ? 'WA_NOTIF_ENABLED' : 'WA_NOTIF_DISABLED',
    resource_type: 'site_settings',
    resource_id: 'wa_notif_enabled',
    new_data: { enabled: body.enabled },
  })

  return NextResponse.json<ApiResponse>({
    success: true,
    message: body.enabled ? 'Notifikasi WhatsApp diaktifkan.' : 'Notifikasi WhatsApp dinonaktifkan.',
  })
}
