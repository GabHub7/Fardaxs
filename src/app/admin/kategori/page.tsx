import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { getStatusLabel, getStatusColor } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  icon_url: string | null
  color: string | null
  status: string
  sort_order: number
  created_at: string
  updated_at: string
  product_count: number
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function KategoriPage() {
  const supabase = createServiceClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*, products(count)')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const rows: CategoryRow[] = (categories ?? []).map((cat) => ({
    id: cat.id as string,
    name: cat.name as string,
    slug: cat.slug as string,
    description: cat.description as string | null,
    icon_url: cat.icon_url as string | null,
    color: (cat as Record<string, unknown>).color as string | null,
    status: cat.status as string,
    sort_order: cat.sort_order as number,
    created_at: cat.created_at as string,
    updated_at: cat.updated_at as string,
    product_count: Array.isArray((cat as Record<string, unknown>).products)
      ? ((cat as Record<string, unknown>).products as { count: number }[])[0]?.count ?? 0
      : 0,
  }))

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Kategori
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {rows.length} kategori terdaftar
          </p>
        </div>
        <Link
          href="/admin/kategori/baru"
          className="px-4 py-2 rounded-[12px] text-sm font-semibold"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground, 0 0% 100%))',
          }}
        >
          + Tambah Kategori
        </Link>
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
            Belum ada kategori.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Urutan', 'Nama', 'Slug', 'Warna', 'Produk', 'Status', 'Aksi'].map((col) => (
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
                {rows.map((cat, i) => {
                  const statusColor = getStatusColor(cat.status)
                  return (
                    <tr
                      key={cat.id}
                      className="hover:opacity-80 transition-opacity"
                      style={{
                        borderBottom: i < rows.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 text-center font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {cat.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {cat.icon_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cat.icon_url}
                              alt=""
                              className="w-6 h-6 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                              {cat.name}
                            </p>
                            {cat.description && (
                              <p
                                className="text-xs truncate max-w-[200px]"
                                style={{ color: 'hsl(var(--foreground-muted))' }}
                              >
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {cat.slug}
                      </td>
                      <td className="px-4 py-3">
                        {cat.color ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full border flex-shrink-0"
                              style={{
                                backgroundColor: cat.color,
                                borderColor: 'hsl(var(--border))',
                              }}
                            />
                            <span
                              className="text-xs font-mono"
                              style={{ color: 'hsl(var(--foreground-muted))' }}
                            >
                              {cat.color}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'hsl(var(--foreground-muted))' }}>—</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-center font-semibold text-sm"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {cat.product_count}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}
                        >
                          {getStatusLabel(cat.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/kategori/${cat.id}/edit`}
                          className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                          style={{
                            background: 'hsl(var(--background-muted))',
                            color: 'hsl(var(--foreground))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
