import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { waHealthCheck } from '@/lib/whatsapp'

// Paksa selalu dieksekusi fresh, jangan pernah di-cache Vercel/Next.js —
// halaman ini dipakai buat diagnosa masalah real-time, cache basi di sini
// bikin admin ngira bot masih down padahal udah dibenerin.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ connected: false }, { status: 401 })

  const status = await waHealthCheck()
  // Cache-Control eksplisit di response — force-dynamic mencegah Next.js
  // nge-cache di server, tapi tidak otomatis mencegah BROWSER nyimpen
  // response ini di cache lokalnya sendiri.
  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
