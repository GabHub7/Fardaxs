import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { waSend } from '@/lib/whatsapp'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { phone } = await request.json()
  if (!phone) return NextResponse.json<ApiResponse>({ success: false, message: 'phone wajib diisi.' }, { status: 400 })

  const sent = await waSend(phone, `🧪 *Test Notifikasi — Fardax Store*\n\nIni adalah pesan test dari admin panel.\nWaktu: ${new Date().toLocaleString('id-ID')}\n\n✅ WA Bot berjalan dengan baik!`)
  if (!sent) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Gagal kirim pesan. Pastikan WA Bot berjalan dan WHATSAPP_BOT_URL sudah diset.' }, { status: 503 })
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'Pesan test terkirim.' })
}
