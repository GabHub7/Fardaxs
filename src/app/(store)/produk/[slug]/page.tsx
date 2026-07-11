import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ProductOrderForm } from './product-order-form'
import { ProductLogo } from '@/components/store/product-logo'
import { ChevronRight, Star, Shield, Zap, Clock } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, short_description, image_url, seo_title, seo_description')
    .eq('slug', slug)
    .eq('status', 'ACTIVE')
    .single()

  if (!product) return { title: 'Produk Tidak Ditemukan' }

  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.short_description ?? '',
    openGraph: {
      title: product.seo_title ?? product.name,
      description: product.seo_description ?? product.short_description ?? '',
      images: product.image_url && !product.image_url.startsWith('logo:') ? [product.image_url] : [],
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      faqs:product_faqs(question, answer, sort_order),
      variants:product_variants(id, name, selling_price, reseller_price, base_cost, provider_product_code, sort_order)
    `)
    .eq('slug', slug)
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)
    .single()

  if (!product) notFound()

  const faqs = Array.isArray(product.faqs)
    ? [...product.faqs].sort((a, b) => a.sort_order - b.sort_order)
    : []

  type Variant = { id: string; name: string; selling_price: number; reseller_price: number; base_cost: number; provider_product_code: string | null; sort_order: number }
  const variants: Variant[] = Array.isArray(product.variants)
    ? [...product.variants].sort((a, b) => a.sort_order - b.sort_order)
    : []

  // When variants exist, show "mulai dari" the lowest price
  const lowestVariantPrice = variants.length > 0
    ? Math.min(...variants.map((v) => v.selling_price))
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'hsl(var(--foreground-muted))' }}>
        <Link href="/" className="hover:text-current transition-colors">Beranda</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/kategori/${product.category?.slug}`} className="hover:text-current transition-colors">
          {product.category?.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span style={{ color: 'hsl(var(--foreground))' }}>{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Image */}
        <div>
          <div
            className="relative aspect-square rounded-[20px] overflow-hidden"
            style={{ background: 'hsl(var(--background-card))' }}
          >
            {product.image_url && !product.image_url.startsWith('logo:') ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : product.image_url?.startsWith('logo:') ? (
              <div className="w-full h-full flex items-center justify-center">
                <ProductLogo imageUrl={product.image_url} name={product.name} size={140} />
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-6xl font-black"
                style={{ color: 'hsl(var(--primary))' }}
              >
                {product.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: Zap, label: 'Proses Cepat', color: '#f59e0b' },
              { icon: Shield, label: 'Transaksi Aman', color: '#10b981' },
              { icon: Clock, label: 'Support 24/7', color: '#3b82f6' },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="rounded-[14px] p-3 text-center border"
                style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
              >
                <Icon className="h-5 w-5 mx-auto mb-1" style={{ color }} />
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Product Info + Order Form */}
        <div className="space-y-5">
          <div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold mb-3"
              style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}
            >
              {product.category?.name}
            </div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {product.name}
            </h1>
            {product.short_description && (
              <p className="mt-2 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
                {product.short_description}
              </p>
            )}
          </div>

          {/* Price */}
          <div
            className="rounded-[20px] p-4 border"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              {lowestVariantPrice !== null ? (
                <>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    Mulai dari
                  </span>
                  <span className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                    {formatCurrency(lowestVariantPrice)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                    {formatCurrency(product.selling_price)}
                  </span>
                  {product.base_cost > 0 && product.base_cost > product.selling_price && (
                    <>
                      <span className="text-sm line-through" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {formatCurrency(product.base_cost)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}
                      >
                        -{Math.round(((product.base_cost - product.selling_price) / product.base_cost) * 100)}%
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              {lowestVariantPrice !== null ? `${variants.length} pilihan varian tersedia` : 'Harga sudah termasuk biaya layanan'}
            </p>
            <div
              className="mt-3 pt-3 border-t flex items-center gap-2"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                4.9 • 1.200+ transaksi
              </span>
            </div>
          </div>

          {/* Order Form */}
          <ProductOrderForm
            productId={product.id}
            productName={product.name}
            price={product.selling_price}
            targetType={product.target_type ?? 'PHONE'}
            targetLabel={product.target_label ?? 'Nomor Tujuan'}
            targetPlaceholder={product.target_placeholder ?? 'Masukkan nomor tujuan'}
            targetValidation={product.target_validation}
            variants={variants}
          />
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="mt-8">
          <h2
            className="text-lg font-bold mb-4"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Deskripsi Produk
          </h2>
          <div
            className="rounded-[20px] border p-5 text-sm prose prose-invert max-w-none"
            style={{
              background: 'hsl(var(--background-card))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground-muted))',
              lineHeight: '1.7',
            }}
          >
            {product.description}
          </div>
        </div>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <div className="mt-8">
          <h2
            className="text-lg font-bold mb-4"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Pertanyaan Umum
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="rounded-[14px] border group"
                style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
              >
                <summary
                  className="px-5 py-4 text-sm font-medium cursor-pointer flex items-center justify-between"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {faq.question}
                  <ChevronRight
                    className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
                    style={{ color: 'hsl(var(--foreground-muted))' }}
                  />
                </summary>
                <div
                  className="px-5 pb-4 text-sm"
                  style={{ color: 'hsl(var(--foreground-muted))' }}
                >
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
