import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import { ProductLogo } from '@/components/store/product-logo'
import { formatCurrency, getStatusLabel, getStatusColor, getInitials } from '@/lib/utils'
import type { ProductStatus } from '@/types'
import { ToggleStatusButton } from './toggle-status-button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string
  name: string
  slug: string
  image_url: string | null
  thumbnail_url: string | null
  selling_price: number
  status: ProductStatus
  sort_order: number
  categories: { id: string; name: string } | null
}

interface CategoryOption {
  id: string
  name: string
}

interface PageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    status?: string
    page?: string
  }>
}

const LIMIT = 25

const PRODUCT_STATUSES: { label: string; value: string }[] = [
  { label: 'Semua Status', value: '' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Tidak Aktif', value: 'INACTIVE' },
  { label: 'Habis', value: 'OUT_OF_STOCK' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Diarsipkan', value: 'ARCHIVED' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function ProdukPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search ?? ''
  const category = params.category ?? ''
  const status = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * LIMIT

  const supabase = createServiceClient()

  // Fetch categories for filter dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  const categoryOptions = (categories as CategoryOption[]) ?? []

  // Build product query
  let query = supabase
    .from('products')
    .select('id, name, slug, image_url, thumbnail_url, selling_price, status, sort_order, categories(id, name)', {
      count: 'exact',
    })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .range(offset, offset + LIMIT - 1)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (category) {
    query = query.eq('category_id', category)
  }
  if (status) {
    query = query.eq('status', status as ProductStatus)
  }

  const { data: products, count, error } = await query
  const rows = (products as unknown as ProductRow[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / LIMIT)

  // ── Per-product sales aggregates (revenue & profit from real transactions) ──
  // Only for the products on this page, and only counting completed orders.
  const pageProductIds = rows.map((p) => p.id)
  const salesByProduct: Record<string, { units: number; revenue: number; profit: number }> = {}

  if (pageProductIds.length > 0) {
    const { data: orderRows } = await supabase
      .from('orders')
      .select('product_id, price, profit, status')
      .in('product_id', pageProductIds)
      .in('status', ['SUCCESS', 'PAID'])

    for (const o of (orderRows ?? []) as Array<{ product_id: string; price: number | null; profit: number | null }>) {
      const agg = (salesByProduct[o.product_id] ??= { units: 0, revenue: 0, profit: 0 })
      agg.units += 1
      agg.revenue += Number(o.price ?? 0)
      agg.profit += Number(o.profit ?? 0)
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Produk
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {count ?? 0} total produk
          </p>
        </div>
        <Link
          href="/admin/produk/baru"
          className="px-4 py-2 rounded-[12px] text-sm font-semibold press-effect hover-fade"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground, 0 0% 100%))',
          }}
        >
          + Tambah Produk
        </Link>
      </div>

      {/* Filter bar */}
      <form
        method="GET"
        action="/admin/produk"
        className="rounded-[20px] border p-4 flex flex-wrap gap-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <input
          name="search"
          type="text"
          defaultValue={search}
          placeholder="Cari nama produk..."
          className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        />

        <select
          name="category"
          defaultValue={category}
          className="px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          <option value="">Semua Kategori</option>
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={status}
          className="px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          {PRODUCT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="px-4 py-2 rounded-[12px] text-sm font-medium"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground, 0 0% 100%))',
          }}
        >
          Filter
        </button>

        {(search || category || status) && (
          <Link
            href="/admin/produk"
            className="px-4 py-2 rounded-[12px] text-sm font-medium"
            style={{
              background: 'hsl(var(--background-muted))',
              color: 'hsl(var(--foreground-muted))',
            }}
          >
            Reset
          </Link>
        )}
      </form>

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
            Tidak ada produk ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['', 'Nama Produk', 'Kategori', 'Harga', 'Terjual', 'Pendapatan', 'Keuntungan', 'Status', 'Urutan', 'Aksi'].map((col) => (
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
                {rows.map((product) => {
                  const thumbnail = product.thumbnail_url ?? product.image_url
                  const statusColor = getStatusColor(product.status)
                  const sales = salesByProduct[product.id] ?? { units: 0, revenue: 0, profit: 0 }
                  return (
                    <tr
                      key={product.id}
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      className="hover:bg-[hsl(var(--background-muted))] transition-colors"
                    >
                      {/* Thumbnail */}
                      <td className="px-4 py-3">
                        {thumbnail && thumbnail.startsWith('logo:') ? (
                          <div className="w-10 h-10 rounded-[12px] overflow-hidden flex-shrink-0">
                            <ProductLogo imageUrl={thumbnail} name={product.name} size={40} />
                          </div>
                        ) : thumbnail ? (
                          <div className="relative w-10 h-10 rounded-[12px] overflow-hidden flex-shrink-0">
                            <Image
                              src={thumbnail}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{
                              background: 'hsl(var(--primary) / 0.15)',
                              color: 'hsl(var(--primary))',
                            }}
                          >
                            {getInitials(product.name)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                          {product.name}
                        </p>
                        <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          {product.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: 'hsl(var(--background-muted))',
                            color: 'hsl(var(--foreground-muted))',
                          }}
                        >
                          {product.categories?.name ?? '-'}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {formatCurrency(product.selling_price)}
                      </td>
                      {/* Terjual */}
                      <td
                        className="px-4 py-3 text-center text-xs font-medium"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {sales.units > 0 ? `${sales.units}x` : '—'}
                      </td>
                      {/* Pendapatan (revenue) */}
                      <td
                        className="px-4 py-3 font-medium whitespace-nowrap"
                        style={{ color: sales.revenue > 0 ? 'hsl(var(--foreground))' : 'hsl(var(--foreground-muted))' }}
                      >
                        {sales.revenue > 0 ? formatCurrency(sales.revenue) : '—'}
                      </td>
                      {/* Keuntungan (profit) */}
                      <td
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                        style={{
                          color:
                            sales.profit > 0
                              ? 'hsl(var(--success))'
                              : sales.profit < 0
                              ? 'hsl(var(--destructive))'
                              : 'hsl(var(--foreground-muted))',
                        }}
                      >
                        {sales.units > 0 ? formatCurrency(sales.profit) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                          {getStatusLabel(product.status)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-center text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {product.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/produk/${product.id}/edit`}
                            className="px-3 py-1.5 rounded-[12px] text-xs font-medium press-effect hover-fade"
                            style={{
                              background: 'hsl(var(--background-muted))',
                              color: 'hsl(var(--foreground))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          >
                            Edit
                          </Link>
                          <ToggleStatusButton
                            productId={product.id}
                            currentStatus={product.status}
                          />
                        </div>
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
                href={`/admin/produk?search=${search}&category=${category}&status=${status}&page=${page - 1}`}
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
                href={`/admin/produk?search=${search}&category=${category}&status=${status}&page=${page + 1}`}
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

