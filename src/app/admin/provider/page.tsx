import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface ProviderRow {
  id: string
  name: string
  slug: string
  api_url: string
  status: string
  priority: number
  balance: number
  created_at: string
  updated_at: string
}

export const dynamic = 'force-dynamic'

export default async function ProviderPage() {
  const supabase = createServiceClient()

  const { data: providers, error } = await supabase
    .from('providers')
    .select('*')
    .order('priority', { ascending: true })

  const rows = (providers ?? []) as ProviderRow[]

  // Fetch total products per provider
  const { data: productCounts } = await supabase
    .from('products')
    .select('provider_id')
    .not('provider_id', 'is', null)

  const providerProductCount = new Map<string, number>()
  for (const p of (productCounts ?? []) as { provider_id: string }[]) {
    providerProductCount.set(p.provider_id, (providerProductCount.get(p.provider_id) ?? 0) + 1)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Provider
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {rows.length} provider terdaftar
          </p>
        </div>
        <Link
          href="/admin/provider/baru"
          className="px-4 py-2 rounded-[12px] text-sm font-semibold"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground, 0 0% 100%))',
          }}
        >
          + Tambah Provider
        </Link>
      </div>

      {/* Provider cards */}
      {error ? (
        <div className="p-8 text-center text-sm" style={{ color: 'hsl(var(--destructive))' }}>
          Gagal memuat data: {error.message}
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded-[20px] border p-12 text-center text-sm"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground-muted))' }}
        >
          Belum ada provider terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((provider) => {
            const isActive = provider.status === 'ACTIVE'
            const isMaintenance = provider.status === 'MAINTENANCE'
            const productCount = providerProductCount.get(provider.id) ?? 0

            return (
              <div
                key={provider.id}
                className="rounded-[20px] border p-5"
                style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                        {provider.name}
                      </h2>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: isActive
                            ? 'hsl(var(--success) / 0.15)'
                            : isMaintenance
                            ? 'hsl(var(--warning) / 0.15)'
                            : 'hsl(var(--destructive) / 0.15)',
                          color: isActive
                            ? 'hsl(var(--success))'
                            : isMaintenance
                            ? 'hsl(var(--warning))'
                            : 'hsl(var(--destructive))',
                        }}
                      >
                        {isActive ? 'Aktif' : isMaintenance ? 'Maintenance' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      {provider.slug}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-[8px]"
                    style={{
                      background: 'hsl(var(--background-muted))',
                      color: 'hsl(var(--foreground-muted))',
                    }}
                  >
                    Prioritas #{provider.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div
                    className="rounded-[14px] p-3"
                    style={{ background: 'hsl(var(--background-muted))' }}
                  >
                    <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      Saldo
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'hsl(var(--success))' }}>
                      {formatCurrency(provider.balance)}
                    </p>
                  </div>
                  <div
                    className="rounded-[14px] p-3"
                    style={{ background: 'hsl(var(--background-muted))' }}
                  >
                    <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      Produk
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>
                      {productCount}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    API URL
                  </p>
                  <p className="text-xs font-mono truncate" style={{ color: 'hsl(var(--foreground))' }}>
                    {provider.api_url || '—'}
                  </p>
                </div>

                <div
                  className="flex items-center justify-between text-xs pt-3"
                  style={{ borderTop: '1px solid hsl(var(--border-subtle))' }}
                >
                  <span style={{ color: 'hsl(var(--foreground-muted))' }}>
                    Update: {formatDateTime(provider.updated_at)}
                  </span>
                  <Link
                    href={`/admin/provider/${provider.id}/edit`}
                    className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                    style={{
                      background: 'hsl(var(--background-muted))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Provider info */}
      <div
        className="rounded-[20px] border p-5"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          Konfigurasi Default (ENV)
        </h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ['OKECONNECT_API_URL', process.env.OKECONNECT_API_URL ?? 'Belum dikonfigurasi'],
            ['OKECONNECT_MEMBER_ID', process.env.OKECONNECT_MEMBER_ID ? '••••••' : 'Belum dikonfigurasi'],
            ['OKECONNECT_PIN', process.env.OKECONNECT_PIN ? '••••••' : 'Belum dikonfigurasi'],
            ['OKECONNECT_PASSWORD', process.env.OKECONNECT_PASSWORD ? '••••••' : 'Belum dikonfigurasi'],
          ].map(([key, val]) => (
            <div key={key}>
              <p style={{ color: 'hsl(var(--foreground-muted))' }}>{key}</p>
              <p className="font-mono mt-0.5" style={{ color: val === 'Belum dikonfigurasi' ? 'hsl(var(--destructive))' : 'hsl(var(--success))' }}>
                {val}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
