import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

// Settings are stored as key-value rows in a site_settings table.
// Schema: { key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ }

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await auth.serviceClient
    .from('site_settings')
    .select('key, value')

  if (error) {
    // Table might not exist yet — return empty defaults
    return NextResponse.json({ success: true, data: {} })
  }

  const settings: Record<string, unknown> = {}
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    settings[row.key] = row.value
  }

  return NextResponse.json({ success: true, data: settings })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const now = new Date().toISOString()

  // Upsert each setting key
  const entries = Object.entries(body as Record<string, unknown>)
  if (entries.length === 0) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ada pengaturan untuk disimpan.' }, { status: 400 })
  }

  const allowedKeys = [
    'site_name', 'site_description', 'site_url', 'logo_url', 'favicon_url',
    'support_email', 'support_phone', 'whatsapp_number', 'address',
    'facebook_url', 'instagram_url', 'twitter_url', 'youtube_url',
    'primary_color', 'theme', 'maintenance_mode', 'maintenance_message',
    'verification_method',
  ]

  const rows = entries
    .filter(([key]) => allowedKeys.includes(key))
    .filter(([key, value]) => key !== 'verification_method' || ['NONE', 'EMAIL', 'WA_OTP', 'EMAIL_AND_OTP'].includes(value as string))
    .map(([key, value]) => ({ key, value, updated_at: now }))

  if (rows.length === 0) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Tidak ada pengaturan yang valid.' }, { status: 400 })
  }

  const { error } = await auth.serviceClient
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  await auth.serviceClient.from('audit_logs').insert({
    action: 'SETTINGS_UPDATED',
    resource_type: 'settings',
    resource_id: 'site_settings',
    new_data: { keys: rows.map((r) => r.key), updated_by: auth.user.id },
  })

  return NextResponse.json({ success: true, message: 'Pengaturan berhasil disimpan.' })
}
