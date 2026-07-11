import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-guard'
import { getEnvVars } from '@/lib/env-vars'
import { okeConnectAdapter } from '@/lib/providers/okeconnect'
import { waHealthCheck } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

function maskSecret(value: string | null | undefined): string {
  if (!value) return 'KOSONG'
  if (value.length <= 8) return `${value.length} karakter (terlalu pendek untuk ditampilkan sebagian)`
  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} karakter)`
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full mr-2"
      style={{ background: ok ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
    />
  )
}

export default async function DebugIntegrasiPage() {
  const auth = await requireAdmin()
  if (!auth) redirect('/login?redirect=/admin/debug-integrasi')

  // ─── 1. OKECONNECT: resolusi env + tes koneksi LIVE (baca saldo — aman,
  // read-only, tidak membuat transaksi apapun) ──────────────────────────
  const okeEnv = await getEnvVars([
    'OKECONNECT_API_URL',
    'OKECONNECT_MEMBER_ID',
    'OKECONNECT_PIN',
    'OKECONNECT_PASSWORD',
    'OKECONNECT_PROXY_URL',
    'OKECONNECT_PROXY_SECRET',
  ])

  const okeStart = Date.now()
  let okeResult: { success: boolean; balance?: number; message?: string; errorDetail?: string }
  try {
    const balanceResult = await okeConnectAdapter.checkBalance()
    okeResult = {
      success: balanceResult.success,
      balance: balanceResult.balance,
      message: balanceResult.message,
    }
  } catch (err) {
    okeResult = {
      success: false,
      errorDetail: err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error',
    }
  }
  const okeLatency = Date.now() - okeStart

  // ─── 2. WHATSAPP BOT: resolusi env + tes koneksi LIVE (pakai fungsi yang
  // sama persis dipakai Admin Panel -> WhatsApp) ────────────────────────
  const waResult = await waHealthCheck()

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Debug Integrasi — OkeConnect &amp; WhatsApp Bot
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Halaman ini menjalankan tes KONEKSI BENERAN (bukan cuma cek config) setiap kali
          dibuka. Refresh halaman ini untuk mengulang tes.
        </p>
      </div>

      {/* ═══ OKECONNECT ═══ */}
      <div
        className="rounded-[20px] border p-5 space-y-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))', boxShadow: 'var(--card-shadow)' }}
      >
        <p className="text-sm font-bold flex items-center" style={{ color: 'hsl(var(--foreground))' }}>
          <StatusDot ok={okeResult.success} />
          OkeConnect — {okeResult.success ? 'Tes koneksi BERHASIL' : 'Tes koneksi GAGAL'}
        </p>

        <div className="font-mono text-xs space-y-1 pl-4" style={{ color: 'hsl(var(--foreground-muted))' }}>
          <p>Mode: {okeEnv.OKECONNECT_PROXY_URL ? 'RELAY (via bot ber-IP tetap)' : 'LANGSUNG (app -> OkeConnect, TIDAK direkomendasikan di Vercel)'}</p>
          <p>OKECONNECT_API_URL: {okeEnv.OKECONNECT_API_URL || 'https://h2h.okeconnect.com (default)'}</p>
          <p>OKECONNECT_MEMBER_ID: {okeEnv.OKECONNECT_MEMBER_ID ? maskSecret(okeEnv.OKECONNECT_MEMBER_ID) : 'KOSONG'}</p>
          <p>OKECONNECT_PIN: {okeEnv.OKECONNECT_PIN ? 'terbaca' : 'KOSONG'}</p>
          <p>OKECONNECT_PASSWORD: {okeEnv.OKECONNECT_PASSWORD ? 'terbaca' : 'KOSONG'}</p>
          <p style={{ color: okeEnv.OKECONNECT_PROXY_URL ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            OKECONNECT_PROXY_URL: {okeEnv.OKECONNECT_PROXY_URL || 'KOSONG'}
          </p>
          <p style={{ color: okeEnv.OKECONNECT_PROXY_SECRET ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            OKECONNECT_PROXY_SECRET: {maskSecret(okeEnv.OKECONNECT_PROXY_SECRET)}
          </p>
          <p>Latency tes: {okeLatency}ms</p>
          {okeResult.balance !== undefined && <p>Saldo terbaca: Rp{okeResult.balance?.toLocaleString('id-ID')}</p>}
          {okeResult.message && <p style={{ color: 'hsl(var(--warning))' }}>Pesan dari OkeConnect: {okeResult.message}</p>}
          {okeResult.errorDetail && <p style={{ color: 'hsl(var(--destructive))' }}>Error: {okeResult.errorDetail}</p>}
        </div>

        <p className="text-xs font-sans" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Tes ini manggil endpoint <code>/trx/balance</code> OkeConnect (read-only, tidak membuat
          transaksi). Kalau GAGAL dan errornya menyebut &quot;Just a moment&quot; atau HTML, itu
          masih soal Cloudflare di depan relay bot — bukan kredensial OkeConnect.
        </p>
      </div>

      {/* ═══ WHATSAPP BOT ═══ */}
      <div
        className="rounded-[20px] border p-5 space-y-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))', boxShadow: 'var(--card-shadow)' }}
      >
        <p className="text-sm font-bold flex items-center" style={{ color: 'hsl(var(--foreground))' }}>
          <StatusDot ok={waResult.connected} />
          WhatsApp Bot — {waResult.connected ? `Terhubung (${waResult.bot ?? '-'})` : 'Tidak terhubung'}
        </p>

        <div className="font-mono text-xs space-y-1 pl-4" style={{ color: 'hsl(var(--foreground-muted))' }}>
          <p style={{ color: waResult.debug.urlConfigured ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            WHATSAPP_BOT_URL: {waResult.debug.urlPreview || 'KOSONG'}
          </p>
          <p style={{ color: waResult.debug.tokenConfigured ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            WHATSAPP_BOT_TOKEN: {waResult.debug.tokenConfigured ? 'terbaca' : 'KOSONG'}
          </p>
          {waResult.debug.httpStatus !== null && <p>HTTP status: {waResult.debug.httpStatus} (latency {waResult.debug.latencyMs}ms)</p>}
          {waResult.uptime !== null && <p>Uptime bot: {Math.floor((waResult.uptime ?? 0) / 60)} menit</p>}
          {waResult.debug.cfRay && <p style={{ color: 'hsl(var(--foreground))' }}>Cloudflare Ray ID: {waResult.debug.cfRay}</p>}
          {waResult.debug.responseBody && (
            <p className="break-all">Response mentah: {waResult.debug.responseBody}</p>
          )}
          {waResult.debug.errorMessage && (
            <p style={{ color: 'hsl(var(--warning))' }}>→ {waResult.debug.errorMessage}</p>
          )}
        </div>
      </div>

      <div
        className="rounded-[16px] border p-4"
        style={{ background: 'hsl(220 10% 50% / 0.08)', borderColor: 'hsl(var(--border))' }}
      >
        <p className="text-xs font-sans" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Kalau kedua tes di atas gagal dengan pola yang sama (403 / &quot;Just a moment&quot; /
          Cloudflare Ray ID muncul), itu tanda proteksi Cloudflare di depan server bot belum
          sepenuhnya di-bypass untuk salah satu path. Cek lagi rule bypass mencakup{' '}
          <code>/health</code>, <code>/api/*</code>, DAN <code>/relay/*</code> sekaligus.
        </p>
      </div>
    </div>
  )
}
