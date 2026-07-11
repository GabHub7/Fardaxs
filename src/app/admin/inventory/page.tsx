import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDateTime, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { InventoryStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryRow {
  id: string
  credential: string | null
  status: InventoryStatus
  assigned_order_id: string | null
  created_at: string
  products: { name: string } | null
}

interface PageProps {
  searchParams: Promise<{
    product_id?: string
    status?: string
    page?: string
  }>
}

const LIMIT = 30

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'Semua', value: '' },
  { label: 'Tersedia', value: 'AVAILABLE' },
  { label: 'Direservasi', value: 'RESERVED' },
  { label: 'Terjual', value: 'SOLD' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const productId = params.product_id ?? ''
  const status = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * LIMIT

  const supabase = createServiceClient()

  // Status counts summary
  const { data: countData } = await supabase
    .from('inventories')
    .select('status')

  const allItems = (countData ?? []) as { status: string }[]
  const available = allItems.filter((i) => i.status === 'AVAILABLE').length
  const reserved = allItems.filter((i) => i.status === 'RESERVED').length
  const sold = allItems.filter((i) => i.status === 'SOLD').length

  let query = supabase
    .from('inventories')
    .select('id, credential, status, assigned_order_id, created_at, products(name)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + LIMIT - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data: inventories, count, error } = await query
  const rows = (inventories as unknown as InventoryRow[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / LIMIT)

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Inventory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {count ?? 0} item ditampilkan
          </p>
        </div>
        <Link
          href="/admin/inventory/import"
          className="px-4 py-2 rounded-[12px] text-sm font-semibold"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground, 0 0% 100%))',
          }}
        >
          + Import Inventory
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tersedia', count: available, colorVar: '--success' },
          { label: 'Direservasi', count: reserved, colorVar: '--warning' },
          { label: 'Terjual', count: sold, colorVar: '--primary' },
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
            const isActive = status === tab.value
            return (
              <Link
                key={tab.value}
                href={`/admin/inventory?status=${tab.value}&product_id=${productId}&page=1`}
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
            Tidak ada item inventory ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['ID', 'Produk', 'Credential', 'Status', 'Order ID', 'Ditambahkan'].map((col) => (
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
                {rows.map((item, i) => {
                  const statusColor = getStatusColor(item.status)
                  const credentialPreview = item.credential
                    ? item.credential.slice(0, 10) + '...'
                    : '—'
                  return (
                    <tr
                      key={item.id}
                      className="hover:opacity-80 transition-opacity"
                      style={{
                        borderBottom:
                          i < rows.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {item.id.slice(0, 8)}…
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {item.products?.name ?? '—'}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {credentialPreview}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {item.assigned_order_id
                          ? item.assigned_order_id.slice(0, 8) + '…'
                          : '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {formatDateTime(item.created_at)}
                      </td>
                    </tr>
                  )
                })}
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
                href={`/admin/inventory?status=${status}&product_id=${productId}&page=${page - 1}`}
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
                href={`/admin/inventory?status=${status}&product_id=${productId}&page=${page + 1}`}
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
