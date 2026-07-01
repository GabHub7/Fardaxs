import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ProductLogo } from '@/components/store/product-logo'
import { formatCurrency } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!cat) return { title: 'Kategori Tidak Ditemukan' }
  return {
    title: `${cat.name} — Fardax Store`,
    description: cat.description ?? `Produk kategori ${cat.name}`,
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { sort } = await searchParams
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, description, color')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, short_description, selling_price, image_url, is_featured, sort_order
    `)
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)

  // Filter by category — join approach
  const { data: categoryWithProducts } = await supabase
    .from('categories')
    .select(`
      id, name, slug,
      products:products(
        id, name, slug, short_description, selling_price, image_url, is_featured, sort_order
      )
    `)
    .eq('slug', slug)
    .eq('products.status', 'ACTIVE')
    .is('products.deleted_at', null)
    .single()

  let products = (categoryWithProducts?.products ?? []) as {
    id: string
    name: string
    slug: string
    short_description: string | null
    selling_price: number
    image_url: string | null
    is_featured: boolean
    sort_order: number
  }[]

  // Client-side sort since we can't easily chain sort with embedded joins
  switch (sort) {
    case 'price_asc':
      products = [...products].sort((a, b) => a.selling_price - b.selling_price)
      break
    case 'price_desc':
      products = [...products].sort((a, b) => b.selling_price - a.selling_price)
      break
    default:
      products = [...products].sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
        return a.sort_order - b.sort_order
      })
  }

  const sortOptions = [
    { value: 'popular', label: 'Terpopuler' },
    { value: 'price_asc', label: 'Harga Terendah' },
    { value: 'price_desc', label: 'Harga Tertinggi' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs mb-5" style={{ color: 'hsl(var(--foreground-muted))' }}>
        <Link href="/" className="hover:text-current transition-colors">Beranda</Link>
        <ChevronRight className="h-3 w-3" />
        <span style={{ color: 'hsl(var(--foreground))' }}>{category.name}</span>
      </nav>

      {/* Category header */}
      <div
        className="rounded-[20px] border p-5 mb-5"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center text-xl font-black"
            style={{
              background: category.color ? `${category.color}20` : 'hsl(var(--primary)/0.15)',
              color: category.color ?? 'hsl(var(--primary))',
            }}
          >
            {category.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              {category.name}
            </h1>
            {category.description && (
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Header with count and sort */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{products.length}</span> produk
        </p>
        <form method="GET" action={`/kategori/${slug}`}>
          <select
            name="sort"
            defaultValue={sort ?? 'popular'}
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

      {/* Products grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map(product => (
            <Link
              key={product.id}
              href={`/produk/${product.slug}`}
              className="rounded-[16px] border overflow-hidden transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-lg"
              style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
            >
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
                    style={{ color: category.color ? `${category.color}60` : 'hsl(var(--primary)/0.4)' }}
                  >
                    {product.name.charAt(0)}
                  </div>
                )}
                {product.is_featured && (
                  <span
                    className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                  >
                    Populer
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold line-clamp-2" style={{ color: 'hsl(var(--foreground))' }}>
                  {product.name}
                </p>
                {product.short_description && (
                  <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    {product.short_description}
                  </p>
                )}
                <p className="text-sm font-bold mt-2" style={{ color: 'hsl(var(--primary))' }}>
                  {formatCurrency(product.selling_price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="rounded-[20px] border p-10 text-center"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Belum ada produk di kategori ini
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Produk sedang dalam persiapan. Cek kembali nanti.
          </p>
          <Link
            href="/"
            className="inline-block rounded-[10px] px-4 py-2 text-xs font-semibold"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            Kembali ke Beranda
          </Link>
        </div>
      )}
    </div>
  )
}
