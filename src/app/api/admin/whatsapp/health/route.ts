import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { waHealthCheck } from '@/lib/whatsapp'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ connected: false }, { status: 401 })

  const status = await waHealthCheck()
  return NextResponse.json(status)
}
