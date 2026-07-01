import Link from 'next/link'
import type { Metadata } from 'next'
import { Search, ChevronRight, ShoppingCart, Star } from 'lucide-react'
import { PageHeader, HeaderIconButton } from '@/components/store/page-header'
import { CategoryIcon } from '@/components/store/category-icon'
import { ProductLogo } from '@/components/store/product-logo'
import { formatCurrency } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'
import type { Category, Product } from '@/types'

export const metadata: Metadata = { title: 'Produk' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; kategori?: string; layanan?: string }>
}

/** Human-readable titles for PPOB sub-services (slug → label). */
const PPOB_SERVICE_LABELS: Record<string, string> = {
  'pulsa': 'Pulsa', 'paket-data': 'Paket Data', 'pln-token': 'PLN Token',
  'pdam': 'PDAM', 'bpjs': 'BPJS', 'telkom': 'Telkom', 'tv-kabel': 'TV Kabel',
  'internet': 'Internet', 'e-wallet': 'e-Wallet', 'voucher-game': 'Voucher Game',
  'angsuran': 'Angsuran', 'pajak': 'Pajak', 'asuransi': 'Asuransi', 'hotel': 'Hotel',
  'tiket-kereta': 'Tiket Kereta', 'tiket-pesawat': 'Tiket Pesawat',
  'pascabayar': 'Pascabayar', 'lainnya': 'Lainnya',
}

export default async function ProdukPage({ searchParams }: PageProps) {
  const { q: query, kategori, layanan } = await searchParams
  const serviceClient = createServiceClient()

  const [{ data: categories }, { data: allCategories }, cartCount] = await Promise.all([
    serviceClient
      .from('categories')
      .select('id, name, slug, color, sort_order')
      .eq('status', 'ACTIVE')
      .neq('slug', 'ppob')
      .order('sort_order', { ascending: true }),
    serviceClient
      .from('categories')
      .select('id, slug')
      .eq('status', 'ACTIVE'),
    getCartCount(),
  ])

  let categoryId: string | null = null
  if (kategori && kategori !== 'semua') {
    const matchedCategory = ((allCategories ?? []) as Pick<Category, 'id' | 'slug'>[]).find(
      (c) => c.slug === kategori
    )
    categoryId = matchedCategory?.id ?? null
  }

  let productsQuery = serviceClient
    .from('products')
    .select('id, name, slug, short_description, image_url, selling_price, base_cost, status')
    .eq('status', 'ACTIVE')
    .order('sort_order', { ascending: true })
    .limit(40)

  if (query && query.trim()) {
    productsQuery = productsQuery.ilike('name', `%${query.trim()}%`)
  }
  if (categoryId) {
    productsQuery = productsQuery.eq('category_id', categoryId)
  }
  // PPOB sub-service filter (e.g. ?kategori=ppob&layanan=pulsa)
  if (layanan) {
    productsQuery = productsQuery.eq('metadata->>ppob_service', layanan)
  }

  const { data: productRows } = await productsQuery
  const filteredProducts = (productRows ?? []) as unknown as Product[]

  const tabs = [{ slug: 'semua', name: 'Semua' }, ...((categories ?? []) as Category[])]
  const activeTab = kategori ?? 'semua'
  const serviceLabel = layanan ? (PPOB_SERVICE_LABELS[layanan] ?? layanan) : null

  return (
    <div className="pb-6">
      <PageHeader
        left={
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {serviceLabel ?? 'Produk'}
          </h1>
        }
        right={
          <HeaderIconButton
            ariaLabel="Keranjang"
            href="/keranjang"
            badge={
              cartCount > 0 ? (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: '#2563eb', border: '2px solid var(--bg-secondary)' }}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              ) : null
            }
          >
            <ShoppingCart size={17} style={{ color: 'var(--text-primary)' }} />
          </HeaderIconButton>
        }
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Search bar */}
        <form action="/produk" method="GET">
          {kategori && <input type="hidden" name="kategori" value={kategori} />}
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
          >
            <input
              type="text"
              name="q"
              defaultValue={query ?? ''}
              placeholder="Cari produk..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
            <button type="submit" aria-label="Cari" style={{ color: 'var(--text-muted)' }}>
              <Search size={17} />
            </button>
          </div>
        </form>

        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {tabs.map((tab) => {
            const active = tab.slug === activeTab
            return (
              <Link
                key={tab.slug}
                href={tab.slug === 'semua' ? '/produk' : `/produk?kategori=${tab.slug}`}
                className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  background: active ? '#2563eb' : 'var(--bg-card)',
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  border: `1px solid ${active ? '#2563eb' : 'var(--border)'}`,
                }}
              >
                {tab.name}
              </Link>
            )
          })}
        </div>

        {/* Produk populer / hasil */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {query
                ? `Hasil untuk "${query}"`
                : serviceLabel
                  ? `Pilih Nominal — ${serviceLabel}`
                  : 'Produk Populer'}
            </h2>
            {!query && !serviceLabel && (
              <Link
                href="/produk"
                className="flex items-center gap-0.5 text-xs font-medium"
                style={{ color: '#2563eb' }}
              >
                Lihat Semua <ChevronRight size={13} />
              </Link>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {query
                  ? `Tidak ada produk untuk "${query}"`
                  : serviceLabel
                    ? `Produk ${serviceLabel} segera hadir. Hubungi admin untuk info lebih lanjut.`
                    : 'Belum ada produk di kategori ini'}
              </p>
              {serviceLabel && (
                <Link
                  href="/ppob"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-semibold"
                  style={{ color: '#2563eb' }}
                >
                  <ChevronRight size={13} className="rotate-180" /> Kembali ke PPOB
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredProducts.map((p) => {
                const hasDiscount = p.base_cost > 0 && p.base_cost > p.selling_price
                return (
                  <Link
                    key={p.id}
                    href={`/produk/${p.slug}`}
                    className="flex items-center gap-3 rounded-2xl p-3"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <ProductLogo imageUrl={p.image_url} name={p.name} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </p>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                        {p.short_description ?? '1 Bulan'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: '#2563eb' }}>
                          {formatCurrency(p.selling_price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[11px] line-through" style={{ color: 'var(--text-muted)' }}>
                            {formatCurrency(p.base_cost)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={11} fill="#ca8a04" style={{ color: '#ca8a04' }} />
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          4.9
                        </span>
                      </div>
                    </div>
                    <span
                      className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                      style={{ background: '#2563eb' }}
                    >
                      <ShoppingCart size={16} className="text-white" />
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Kategori produk (grid icons) */}
        {!query && !serviceLabel && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Kategori Produk
              </h2>
              <Link
                href="/produk"
                className="flex items-center gap-0.5 text-xs font-medium"
                style={{ color: '#2563eb' }}
              >
                Lihat Semua <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {((categories ?? []) as Category[]).slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/produk?kategori=${cat.slug}`}
                  className="flex flex-col items-center gap-1.5"
                  aria-label={cat.name}
                >
                  <span
                    className="flex items-center justify-center w-full aspect-square rounded-2xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <CategoryIcon slug={cat.slug} color={cat.color} />
                  </span>
                  <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

async function getCartCount(): Promise<number> {
  return 0
}
