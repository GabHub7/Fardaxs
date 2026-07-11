import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface ResellerRow {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  status: string
  created_at: string
  reseller_profiles: {
    store_name: string | null
    balance: number
    status: string
  } | null
  order_count: number
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

const LIMIT = 25

const STATUS_TABS = [
  { label: 'Semua', value: '' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Tidak Aktif', value: 'INACTIVE' },
  { label: 'Banned', value: 'BANNED' },
]

export const dynamic = 'force-dynamic'

export default async function ResellerPage({ searchParams }: PageProps) {
  const params = await searchParams
  const statusFilter = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * LIMIT

  const supabase = createServiceClient()

  // Resolve the RESELLER role id once — `users` has no `role` column,
  // roles live in a separate table referenced via `role_id`.
  const { data: resellerRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'RESELLER')
    .single()

  const resellerRoleId = resellerRole?.id ?? null

  let query = supabase
    .from('users')
    .select('id, full_name, email, phone, status, created_at, reseller_profiles(store_name, balance, status)', {
      count: 'exact',
    })
    .eq('role_id', resellerRoleId)
    .order('created_at', { ascending: false })
    .range(offset, offset + LIMIT - 1)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: resellers, count, error } = await query

  const rows = (resellers ?? []).map((r) => {
    const profile = Array.isArray((r as Record<string, unknown>).reseller_profiles)
      ? ((r as Record<string, unknown>).reseller_profiles as ResellerRow['reseller_profiles'][])[0]
      : (r as Record<string, unknown>).reseller_profiles as ResellerRow['reseller_profiles']
    return {
      id: r.id as string,
      full_name: r.full_name as string | null,
      email: r.email as string,
      phone: r.phone as string | null,
      status: r.status as string,
      created_at: r.created_at as string,
      reseller_profiles: profile ?? null,
      order_count: 0,
    } as ResellerRow
  })

  const totalPages = Math.ceil((count ?? 0) / LIMIT)

  // Summary stats
  const { data: stats } = await supabase
    .from('users')
    .select('status')
    .eq('role_id', resellerRoleId)

  const allStats = (stats ?? []) as { status: string }[]
  const activeCount = allStats.filter((s) => s.status === 'ACTIVE').length
  const inactiveCount = allStats.filter((s) => s.status !== 'ACTIVE').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Reseller
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {count ?? 0} reseller terdaftar
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Reseller', count: allStats.length, colorVar: '--primary' },
          { label: 'Aktif', count: activeCount, colorVar: '--success' },
          { label: 'Tidak Aktif / Banned', count: inactiveCount, colorVar: '--warning' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[20px] border p-4 flex items-center gap-3"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{
                background: `hsl(var(${stat.colorVar}) / 0.15)`,
                color: `hsl(var(${stat.colorVar}))`,
              }}
            >
              {stat.count}
            </div>
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex gap-1 p-3 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <Link
                key={tab.value}
                href={`/admin/reseller?status=${tab.value}&page=1`}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                style={{
                  background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))',
                  color: isActive
                    ? 'hsl(var(--primary-foreground, 0 0% 100%))'
                    : 'hsl(var(--foreground-muted))',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        {error ? (
          <div className="p-8 text-center text-sm" style={{ color: 'hsl(var(--destructive))' }}>
            Gagal memuat data: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Tidak ada reseller ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Reseller', 'Toko', 'Saldo', 'Status Akun', 'Status Reseller', 'Bergabung'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                      style={{ color: 'hsl(var(--foreground-muted))' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom:
                        i < rows.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined,
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {r.full_name ?? 'Tanpa Nama'}
                      </p>
                      <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {r.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--foreground))' }}>
                      {r.reseller_profiles?.store_name ?? (
                        <span style={{ color: 'hsl(var(--foreground-muted))' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: 'hsl(var(--foreground))' }}>
                      {r.reseller_profiles ? formatCurrency(r.reseller_profiles.balance) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      {r.reseller_profiles ? (
                        <StatusDot status={r.reseller_profiles.status} />
                      ) : (
                        <span className="text-xs italic" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          Belum ada profil
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      {formatDateTime(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/reseller?status=${statusFilter}&page=${page - 1}`}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                style={{
                  background: 'hsl(var(--background-card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/reseller?status=${statusFilter}&page=${page + 1}`}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground, 0 0% 100%))',
                }}
              >
                Berikutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  const isBanned = status === 'BANNED' || status === 'SUSPENDED'
  const color = isActive ? 'hsl(var(--success))' : isBanned ? 'hsl(var(--destructive))' : 'hsl(var(--foreground-muted))'
  const label = isActive ? 'Aktif' : isBanned ? status : 'Tidak Aktif'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
