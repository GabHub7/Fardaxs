import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ProductLogo } from '@/components/store/product-logo'
import { formatCurrency } from '@/lib/utils'
import { Search, X } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cari Produk — Fardax Store',
}

interface PageProps {
  searchParams: Promise<{ q?: string; kategori?: string; sort?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q: query, kategori, sort } = await searchParams
  const supabase = await createClient()

  // Get categories for filter
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('status', 'ACTIVE')
    .order('sort_order', { ascending: true })

  let products: {
    id: string
    name: string
    slug: string
    short_description: string | null
    selling_price: number
    image_url: string | null
    is_featured: boolean
    category: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
  }[] = []
  let total = 0

  if (query && query.trim().length > 0) {
    let dbQuery = supabase
      .from('products')
      .select(`
        id, name, slug, short_description, selling_price, image_url, is_featured,
        category:categories(id, name, slug)
      `, { count: 'exact' })
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .ilike('name', `%${query.trim()}%`)

    if (kategori) {
      dbQuery = dbQuery.eq('categories.slug', kategori)
    }

    switch (sort) {
      case 'price_asc':
        dbQuery = dbQuery.order('selling_price', { ascending: true })
        break
      case 'price_desc':
        dbQuery = dbQuery.order('selling_price', { ascending: false })
        break
      default:
        dbQuery = dbQuery.order('is_featured', { ascending: false }).order('sort_order', { ascending: true })
    }

    dbQuery = dbQuery.limit(48)

    const { data, count } = await dbQuery
    products = (data ?? []) as typeof products
    total = count ?? 0
  }

  const sortOptions = [
    { value: 'popular', label: 'Terpopuler' },
    { value: 'price_asc', label: 'Harga Terendah' },
    { value: 'price_desc', label: 'Harga Tertinggi' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search bar */}
      <form method="GET" action="/cari" className="mb-5">
        <div
          className="flex items-center gap-3 rounded-[16px] border px-4 py-3"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--foreground-muted))' }} />
          <input
            name="q"
            defaultValue={query ?? ''}
            type="search"
            placeholder="Cari produk..."
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'hsl(var(--foreground))' }}
          />
          {query && (
            <Link href="/cari" className="shrink-0">
              <X className="h-4 w-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
            </Link>
          )}
          <button
            type="submit"
            className="rounded-[10px] px-4 py-1.5 text-xs font-semibold shrink-0"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            Cari
          </button>
        </div>
      </form>

      {/* Filters */}
      {query && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Category filter */}
          {(categories ?? []).map(cat => {
            const isActive = kategori === cat.slug
            const href = new URL('/cari', 'http://x')
            if (query) href.searchParams.set('q', query)
            if (!isActive) href.searchParams.set('kategori', cat.slug)
            if (sort) href.searchParams.set('sort', sort)
            return (
              <Link
                key={cat.id}
                href={isActive ? `/cari?q=${encodeURIComponent(query ?? '')}` : `${href.pathname}${href.search}`}
                className="rounded-full px-3 py-1 text-xs font-medium border transition-all"
                style={{
                  background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--background-card))',
                  borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground-muted))',
                }}
              >
                {cat.name}
              </Link>
            )
          })}
        </div>
      )}

      {/* Results header */}
      {query ? (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {total > 0 ? (
              <>
                <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{total}</span> produk untuk{' '}
                <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>&quot;{query}&quot;</span>
              </>
            ) : (
              <>Tidak ada produk untuk <span className="font-semibold">&quot;{query}&quot;</span></>
            )}
          </p>

          {/* Sort */}
          <form method="GET" action="/cari" className="flex items-center">
            {query && <input type="hidden" name="q" value={query} />}
            {kategori && <input type="hidden" name="kategori" value={kategori} />}
            <select
              name="sort"
              defaultValue={sort ?? 'popular'}
              onChange={(e) => {
                const form = e.currentTarget.closest('form') as HTMLFormElement | null
                form?.submit()
              }}
              className="text-xs rounded-[10px] px-3 py-1.5 outline-none border"
              style={{
                background: 'hsl(var(--background-card))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            >
              {sortOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </form>
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="h-12 w-12 mx-auto mb-4" style={{ color: 'hsl(var(--foreground-muted))' }} />
          <p className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Cari produk apa?
          </p>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Ketik nama produk, kategori, atau layanan yang kamu butuhkan
          </p>
        </div>
      )}

      {/* Product grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map(product => {
            const cat = Array.isArray(product.category) ? product.category[0] : product.category
            return (
              <Link
                key={product.id}
                href={`/produk/${product.slug}`}
                className="rounded-[16px] border overflow-hidden transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-lg"
                style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
              >
                {/* Image */}
                <div
                  className="relative aspect-video w-full"
                  style={{ background: 'hsl(var(--background-muted))' }}
                >
                  {product.image_url && !product.image_url.startsWith('logo:') ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ) : product.image_url?.startsWith('logo:') ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <ProductLogo imageUrl={product.image_url} name={product.name} size={56} />
                    </div>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-3xl font-black"
                      style={{ color: 'hsl(var(--primary)/0.4)' }}
                    >
                      {product.name.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  {cat && (
                    <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--primary))' }}>
                      {cat.name}
                    </span>
                  )}
                  <p className="text-xs font-semibold line-clamp-2 mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>
                    {product.name}
                  </p>
                  <p className="text-sm font-bold mt-1.5" style={{ color: 'hsl(var(--primary))' }}>
                    {formatCurrency(product.selling_price)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* No results */}
      {query && products.length === 0 && total === 0 && (
        <div
          className="rounded-[20px] border p-10 text-center"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <Search className="h-10 w-10 mx-auto mb-3" style={{ color: 'hsl(var(--foreground-muted))' }} />
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Produk tidak ditemukan
          </p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Coba kata kunci lain atau hapus filter kategori
          </p>
          <Link
            href="/cari"
            className="inline-block mt-4 rounded-[10px] px-4 py-2 text-xs font-semibold"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            Reset Pencarian
          </Link>
        </div>
      )}
    </div>
  )
}
