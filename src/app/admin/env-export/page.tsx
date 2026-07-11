import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-guard'

// ══════════════════════════════════════════════════════════════════════════
//  HALAMAN SEMENTARA — HAPUS FOLDER INI SETELAH SELESAI MIGRASI KE RENDER.
//
//  Halaman ini menampilkan VALUE ASLI env var (termasuk secret key/service
//  role key) dalam format siap-paste ke Render. Ini sengaja tidak disensor
//  karena tujuannya memang supaya bisa langsung di-copy — TAPI itu artinya
//  siapapun yang punya akses admin panel bisa lihat semua secret produksi.
//
//  Setelah kamu selesai copy-paste ke Render:
//  1. Hapus folder src/app/admin/env-export/ ini
//  2. Commit & push, deploy ulang
// ══════════════════════════════════════════════════════════════════════════

// Daftar key yang mau ditampilkan — sesuai dengan yang ada di render.yaml /
// .env.example, supaya konsisten dan gampang di-cross-check.
const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_APP_NAME',
  'CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'WHATSAPP_BOT_URL',
  'WHATSAPP_BOT_TOKEN',
  'CS_PHONE',
  'OKECONNECT_PROXY_URL',
  'OKECONNECT_PROXY_SECRET',
  'OKECONNECT_API_URL',
  'OKECONNECT_MEMBER_ID',
  'OKECONNECT_PIN',
  'OKECONNECT_PASSWORD',
  'OKECONNECT_SECRET_KEY',
  'OKECONNECT_CALLBACK_SECRET',
  'CASAKU_BASE_URL',
  'CASAKU_LICENSE_KEY',
  'CASAKU_QR_ID',
  'CASAKU_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'RESEND_FROM_NAME',
  'SMM_PANEL_API_URL',
  'SMM_PANEL_API_KEY',
  'ENCRYPTION_KEY',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const

export const dynamic = 'force-dynamic'

export default async function EnvExportPage() {
  const auth = await requireAdmin()
  if (!auth) redirect('/login?redirect=/admin/env-export')

  const dotenvText = ENV_KEYS.map((key) => {
    const value = process.env[key]
    return value !== undefined ? `${key}=${value}` : `# ${key}=`
  }).join('\n')

  return (
    <div className="p-6 space-y-4">
      <div
        className="rounded-[16px] border p-4"
        style={{ background: 'hsl(0 84% 60% / 0.08)', borderColor: 'hsl(0 84% 60% / 0.3)' }}
      >
        <p className="text-sm font-bold" style={{ color: 'hsl(0 84% 60%)' }}>
          Halaman sementara — hapus setelah dipakai
        </p>
        <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Halaman ini menampilkan value ASLI semua secret production (Supabase Service Role
          Key, dsb) dalam bentuk teks polos. Setelah selesai copy-paste ke Render, HAPUS folder{' '}
          <code>src/app/admin/env-export/</code> dan deploy ulang. Jangan biarkan halaman ini
          hidup lama di production.
        </p>
      </div>

      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Export Environment Variables
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Baris yang diawali <code>#</code> artinya env var itu kosong/tidak diset di sini.
          Format sudah siap paste langsung ke input &quot;Add from .env&quot; di Render.
        </p>
      </div>

      <textarea
        readOnly
        value={dotenvText}
        rows={ENV_KEYS.length + 2}
        className="w-full font-mono text-xs p-4 rounded-[14px] border"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
          color: 'hsl(var(--foreground))',
        }}
      />
      <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
        Klik di dalam kotak, tekan Ctrl+A (atau Cmd+A di Mac) lalu Ctrl+C untuk copy semuanya.
      </p>
    </div>
  )
}
