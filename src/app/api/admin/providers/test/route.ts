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
    const env = await getEnvVars(['CASAKU_API_URL', 'CASAKU_MERCHANT_ID', 'CASAKU_SECRET_KEY'])
    const envError = checkCasakuEnvVars(env)
    if (envError) {
      return NextResponse.json({ success: false, message: envError })
    }

    const baseUrl = env.CASAKU_API_URL
    try {
      const res = await fetch(`${baseUrl}/v1/payments`, {
        method: 'GET',
        headers: {
          'x-license-key': env.CASAKU_SECRET_KEY,
          'x-merchant-id': env.CASAKU_MERCHANT_ID,
          'x-signature': 'ping',
        },
        signal: AbortSignal.timeout(10000),
      })

      // Any non-5xx response proves the API endpoint is reachable.
      // 401/403 = credentials issue (reachable but rejected).
      // 200 = fully authenticated.
      if (res.status < 500) {
        const credOk = res.status < 400
        return NextResponse.json({
          success: credOk,
          message: credOk
            ? `Terhubung ke Casaku API. Kredensial valid (HTTP ${res.status}).`
            : `Casaku API terjangkau namun kredensial ditolak (HTTP ${res.status}). Periksa CASAKU_MERCHANT_ID & CASAKU_SECRET_KEY.`,
        })
      }

      return NextResponse.json({
        success: false,
        message: `Casaku API merespons dengan server error ${res.status}.`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Timeout atau koneksi gagal'
      return NextResponse.json({
        success: false,
        message: `Gagal terhubung ke Casaku: ${msg}. Periksa apakah CASAKU_API_URL (${baseUrl}) benar dan dapat diakses.`,
      })
    }
  }

  return NextResponse.json({ success: false, message: 'Provider tidak dikenali.' }, { status: 400 })
}
