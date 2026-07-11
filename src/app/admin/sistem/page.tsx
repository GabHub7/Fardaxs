import { createServiceClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils'
import { ProviderConnectionTest } from './provider-test'
import { getEnvVar, getEnvVars } from '@/lib/env-vars'

export const dynamic = 'force-dynamic'

export default async function SistemPage() {
  const supabase = createServiceClient()

  // Diagnostic: project Supabase MANA yang beneran aktif dipakai server ini
  // sekarang, dibaca langsung dari environment variable — bukan dari
  // ingatan/log lama yang bisa aja nunjuk ke project yang salah/basi.
  const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseProjectRef = supabaseUrlRaw.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null
  const supabaseDashboardUrl = supabaseProjectRef
    ? `https://supabase.com/dashboard/project/${supabaseProjectRef}`
    : null
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Diagnostic: pakai FUNGSI YANG SAMA PERSIS dipakai src/lib/providers/
  // okeconnect.ts (Supabase-first, fallback process.env) — supaya hasil ini
  // 100% mencerminkan apa yang beneran dipakai kode saat checkout/test,
  // bukan cuma ngecek process.env mentah yang bisa menyesatkan kalau
  // ternyata ada row lain di Supabase yang menang duluan.
  const okeConnectProxyCheck = await getEnvVars(['OKECONNECT_PROXY_URL', 'OKECONNECT_PROXY_SECRET'])
  const proxyUrlResolved = okeConnectProxyCheck.OKECONNECT_PROXY_URL
  const proxySecretResolved = okeConnectProxyCheck.OKECONNECT_PROXY_SECRET

  // Health checks — run in parallel
  const [orderCount, userCount, inventoryCount, failedOrderCount, callbackCount] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('inventories').select('id', { count: 'exact', head: true }).eq('status', 'AVAILABLE'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'FAILED'),
    supabase.from('payment_callbacks').select('id', { count: 'exact', head: true }).eq('is_valid', false),
  ])

  // Recent FAILED orders
  const { data: failedOrders } = await supabase
    .from('orders')
    .select('id, order_number, target, created_at, products(name)')
    .eq('status', 'FAILED')
    .order('created_at', { ascending: false })
    .limit(10)

  // Recent invalid callbacks
  const { data: invalidCallbacks } = await supabase
    .from('payment_callbacks')
    .select('id, gateway, ip_address, error_message, created_at')
    .eq('is_valid', false)
    .order('created_at', { ascending: false })
    .limit(10)

  // Orders stuck in PROCESSING (older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: stuckOrders, count: stuckCount } = await supabase
    .from('orders')
    .select('id, order_number, target, updated_at, products(name)', { count: 'exact' })
    .eq('status', 'PROCESSING')
    .lt('updated_at', oneHourAgo)
    .order('updated_at', { ascending: true })
    .limit(10)

  const dbReachable = userCount.error === null
  const now = new Date().toISOString()

  type HealthStatus = 'OK' | 'WARN' | 'ERROR'

  const healthItems: Array<{ label: string; value: string; status: HealthStatus }> = [
    {
      label: 'Database',
      value: dbReachable ? 'Terhubung' : 'Tidak dapat terhubung',
      status: dbReachable ? 'OK' : 'ERROR',
    },
    {
      label: 'Total Pesanan',
      value: (orderCount.count ?? 0).toLocaleString('id-ID'),
      status: 'OK',
    },
    {
      label: 'Total Pengguna',
      value: (userCount.count ?? 0).toLocaleString('id-ID'),
      status: 'OK',
    },
    {
      label: 'Stok Inventory',
      value: (inventoryCount.count ?? 0).toLocaleString('id-ID') + ' tersedia',
      status: (inventoryCount.count ?? 0) > 0 ? 'OK' : 'WARN',
    },
    {
      label: 'Pesanan Gagal',
      value: (failedOrderCount.count ?? 0).toLocaleString('id-ID'),
      status: (failedOrderCount.count ?? 0) === 0 ? 'OK' : 'WARN',
    },
    {
      label: 'Callback Invalid',
      value: (callbackCount.count ?? 0).toLocaleString('id-ID'),
      status: (callbackCount.count ?? 0) === 0 ? 'OK' : 'WARN',
    },
    {
      label: 'Pesanan Stuck PROCESSING',
      value: (stuckCount ?? 0).toLocaleString('id-ID'),
      status: (stuckCount ?? 0) === 0 ? 'OK' : 'ERROR',
    },
  ]

  const [casakuBaseUrl, casakuLicenseKey, casakuQrId, okeApiUrl, okeMemberId, okePin, okePassword, okeProxyUrl] = await Promise.all([
    getEnvVar('CASAKU_BASE_URL'),
    getEnvVar('CASAKU_LICENSE_KEY'),
    getEnvVar('CASAKU_QR_ID'),
    getEnvVar('OKECONNECT_API_URL'),
    getEnvVar('OKECONNECT_MEMBER_ID'),
    getEnvVar('OKECONNECT_PIN'),
    getEnvVar('OKECONNECT_PASSWORD'),
    getEnvVar('OKECONNECT_PROXY_URL'),
  ])

  const envChecks = [
    ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['CASAKU_BASE_URL', casakuBaseUrl],
    ['CASAKU_LICENSE_KEY', casakuLicenseKey],
    ['CASAKU_QR_ID', casakuQrId],
    ['OKECONNECT_API_URL', okeApiUrl],
    ['OKECONNECT_MEMBER_ID', okeMemberId],
    ['OKECONNECT_PIN', okePin],
    ['OKECONNECT_PASSWORD', okePassword],
    ['OKECONNECT_PROXY_URL (opsional)', okeProxyUrl],
    ['ENCRYPTION_KEY', process.env.ENCRYPTION_KEY],
    ['RESEND_API_KEY', process.env.RESEND_API_KEY],
    ['WHATSAPP_BOT_URL', process.env.WHATSAPP_BOT_URL],
    ['WHATSAPP_BOT_TOKEN', process.env.WHATSAPP_BOT_TOKEN],
    ['NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL],
  ]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Status Sistem
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Terakhir diperbarui: {formatDateTime(now)}
        </p>
      </div>

      {/* Diagnostic: project Supabase yang beneran aktif dipakai sekarang */}
      <div
        className="rounded-[20px] border p-5 font-mono text-xs space-y-1.5"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <p className="font-sans text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Project Supabase Aktif
        </p>
        {supabaseProjectRef ? (
          <>
            <p style={{ color: 'hsl(var(--success))' }}>Project Ref: {supabaseProjectRef}</p>
            {supabaseDashboardUrl && (
              <p>
                <a
                  href={supabaseDashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                  style={{ color: 'hsl(var(--foreground-muted))' }}
                >
                  {supabaseDashboardUrl}
                </a>
              </p>
            )}
          </>
        ) : (
          <p style={{ color: 'hsl(var(--destructive))' }}>
            NEXT_PUBLIC_SUPABASE_URL kosong/tidak terbaca — cek Environment Variables di Vercel &
            pastikan sudah redeploy setelah mengisinya.
          </p>
        )}
        <p style={{ color: hasServiceRoleKey ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
          SUPABASE_SERVICE_ROLE_KEY: {hasServiceRoleKey ? 'terbaca' : 'KOSONG / tidak terbaca'}
        </p>
        <p className="font-sans" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Ini dibaca langsung dari environment variable server, bukan dari cache/ingatan —
          jadi ini yang PASTI dipakai aplikasi kamu sekarang, bukan project lama yang mungkin
          masih nyantol di log/percakapan sebelumnya.
        </p>
      </div>

      {/* Diagnostic: apakah relay OkeConnect BENERAN keresolve pas checkout */}
      <div
        className="rounded-[20px] border p-5 font-mono text-xs space-y-1.5"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <p className="font-sans text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Relay OkeConnect — resolusi env yang beneran dipakai kode
        </p>
        <p style={{ color: proxyUrlResolved ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
          OKECONNECT_PROXY_URL: {proxyUrlResolved || 'KOSONG — kode akan manggil OkeConnect langsung dari Vercel (bakal gagal, IP tidak tetap)'}
        </p>
        <p style={{ color: proxySecretResolved ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
          OKECONNECT_PROXY_SECRET: {proxySecretResolved ? `terbaca (${proxySecretResolved.length} karakter)` : 'KOSONG'}
        </p>
        <p className="font-sans" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Nilai ini hasil resolusi Supabase (payment_env_vars) -&gt; fallback Vercel — persis
          logika yang dipakai src/lib/providers/okeconnect.ts pas checkout beneran. Kalau
          KOSONG di sini padahal sudah diisi di Vercel, berarti ada row lain yang menang duluan
          di Supabase, atau Vercel belum di-redeploy setelah env-nya diisi.
        </p>
      </div>

      {/* Health grid — claymorphic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthItems.map((item) => (
          <div
            key={item.label}
            className="rounded-[20px] border p-4"
            style={{
              background: 'hsl(var(--background-card))',
              borderColor: 'hsl(var(--border))',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground-muted))' }}>
                {item.label}
              </span>
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{
                  background:
                    item.status === 'OK'
                      ? 'hsl(var(--success))'
                      : item.status === 'WARN'
                      ? 'hsl(var(--warning))'
                      : 'hsl(var(--destructive))',
                  boxShadow:
                    item.status === 'OK'
                      ? '0 0 8px hsl(var(--success) / 0.4)'
                      : item.status === 'WARN'
                      ? '0 0 8px hsl(var(--warning) / 0.4)'
                      : '0 0 8px hsl(var(--destructive) / 0.4)',
                }}
              />
            </div>
            <p
              className="text-sm font-bold"
              style={{
                color:
                  item.status === 'OK'
                    ? 'hsl(var(--foreground))'
                    : item.status === 'WARN'
                    ? 'hsl(var(--warning))'
                    : 'hsl(var(--destructive))',
              }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stuck orders */}
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{
            background: 'hsl(var(--background-card))',
            borderColor: 'hsl(var(--border))',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Pesanan Stuck PROCESSING
            </h2>
            {(stuckCount ?? 0) > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }}
              >
                {stuckCount}
              </span>
            )}
          </div>
          {(stuckOrders ?? []).length === 0 ? (
            <div className="p-8 text-center text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Tidak ada pesanan yang stuck.
            </div>
          ) : (
            <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
              {(stuckOrders ?? []).map((o: Record<string, unknown>) => (
                <div key={o.id as string} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--primary))' }}>
                      {o.order_number as string}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      {((o.products as Record<string, unknown> | null)?.name as string) ?? '—'} → {o.target as string}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs whitespace-nowrap" style={{ color: 'hsl(var(--destructive))' }}>
                      Sejak {formatDateTime(o.updated_at as string)}
                    </p>
                    <a
                      href={`/admin/pesanan/${o.id as string}`}
                      className="text-xs underline"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      Detail
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invalid callbacks */}
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{
            background: 'hsl(var(--background-card))',
            borderColor: 'hsl(var(--border))',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Callback Pembayaran Invalid
            </h2>
            {(callbackCount.count ?? 0) > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' }}
              >
                {callbackCount.count}
              </span>
            )}
          </div>
          {(invalidCallbacks ?? []).length === 0 ? (
            <div className="p-8 text-center text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Tidak ada callback invalid.
            </div>
          ) : (
            <div className="divide-y">
              {(invalidCallbacks ?? []).map((cb: Record<string, unknown>) => (
                <div key={cb.id as string} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {cb.gateway as string}
                      </p>
                      <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>
                        {cb.error_message as string ?? 'Unknown error'}
                      </p>
                      <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        IP: {cb.ip_address as string}
                      </p>
                    </div>
                    <p className="text-xs whitespace-nowrap" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      {formatDateTime(cb.created_at as string)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ENV checks */}
      <div
        className="rounded-[20px] border p-5"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Konfigurasi Environment
          </h2>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Status variabel lingkungan yang diperlukan aplikasi
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {envChecks.map(([key, val]) => {
            const configured = !!val
            return (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-[12px]"
                style={{ background: 'hsl(var(--background-muted))' }}
              >
                <span className="text-xs font-mono" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  {key}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: configured ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
                >
                  {configured ? '✓ Set' : '✗ Missing'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Provider connection tests */}
      <ProviderConnectionTest />

      {/* App info */}
      <div
        className="rounded-[20px] border p-5"
        style={{
          background: 'hsl(var(--background-card))',
          borderColor: 'hsl(var(--border))',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Informasi Aplikasi
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Versi', value: '1.0.0' },
            { label: 'Framework', value: 'Next.js 16' },
            { label: 'Database', value: 'Supabase (PostgreSQL)' },
            { label: 'Platform', value: 'Vercel / Node.js' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                {item.label}
              </p>
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
