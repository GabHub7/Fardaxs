import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { okeConnectAdapter } from '@/lib/providers/okeconnect'
import { checkCasakuEnvVars } from '@/lib/providers/casaku'
import { getEnvVars } from '@/lib/env-vars'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { provider?: string }
  const { provider } = body

  // ── OkeConnect ──────────────────────────────────────────────────────────────
  if (provider === 'okeconnect') {
    const env = await getEnvVars(['OKECONNECT_MEMBER_ID', 'OKECONNECT_PIN', 'OKECONNECT_PASSWORD'])
    if (!env.OKECONNECT_MEMBER_ID || !env.OKECONNECT_PIN || !env.OKECONNECT_PASSWORD) {
      return NextResponse.json({
        success: false,
        message: 'OkeConnect belum dikonfigurasi. Set OKECONNECT_MEMBER_ID, OKECONNECT_PIN, dan OKECONNECT_PASSWORD di Pengaturan → Env Pembayaran.',
      })
    }

    const result = await okeConnectAdapter.checkBalance()
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Terhubung! Saldo OkeConnect: Rp${(result.balance ?? 0).toLocaleString('id-ID')}`,
        data: { balance: result.balance, currency: result.currency },
      })
    }
    return NextResponse.json({
      success: false,
      message: result.message ?? 'Gagal terhubung ke OkeConnect.',
    })
  }

  // ── Casaku ──────────────────────────────────────────────────────────────────
  if (provider === 'casaku') {
    const env = await getEnvVars(['CASAKU_BASE_URL', 'CASAKU_LICENSE_KEY', 'CASAKU_QR_ID'])
    const envError = checkCasakuEnvVars(env)
    if (envError) {
      return NextResponse.json({ success: false, message: envError })
    }

    const baseUrl = env.CASAKU_BASE_URL.replace(/\/$/, '')

    try {
      // GET /api/profile is a real, read-only, documented endpoint — safe to
      // call for a connectivity check (unlike hitting the payment-creation
      // endpoint with fake data, which risks leaving a stray test transaction).
      const res = await fetch(`${baseUrl}/api/profile`, {
        method: 'GET',
        headers: { 'x-license-key': env.CASAKU_LICENSE_KEY },
        signal: AbortSignal.timeout(10000),
      })

      if (res.status === 404) {
        return NextResponse.json({
          success: false,
          message: `Endpoint tidak ditemukan (HTTP 404). CASAKU_BASE_URL mungkin salah — isi hanya URL dasar tanpa suffix apapun, contoh: https://api.casaku.id. URL yang digunakan: ${baseUrl}`,
        })
      }

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({
          success: false,
          message: `License Key ditolak Casaku (HTTP ${res.status}). Periksa CASAKU_LICENSE_KEY di dashboard Casaku.id → API Keys.`,
        })
      }

      if (res.ok) {
        const data = (await res.json()) as { data?: { storeName?: string; name?: string } }
        const store = data.data?.storeName ?? data.data?.name ?? 'akun Anda'
        return NextResponse.json({
          success: true,
          message: `Casaku API terhubung. License Key valid untuk ${store}.`,
        })
      }

      return NextResponse.json({
        success: false,
        message: `Casaku API merespons dengan status ${res.status}.`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Timeout atau koneksi gagal'
      return NextResponse.json({
        success: false,
        message: `Tidak dapat terhubung ke Casaku: ${msg}. Periksa CASAKU_BASE_URL (${baseUrl}).`,
      })
    }
  }

  return NextResponse.json({ success: false, message: 'Provider tidak dikenali.' }, { status: 400 })
}
