import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fardax.store'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/ppob`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${APP_URL}/cari`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${APP_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${APP_URL}/daftar`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  // Products
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map(p => ({
    url: `${APP_URL}/produk/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('status', 'ACTIVE')

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map(c => ({
    url: `${APP_URL}/kategori/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...productRoutes, ...categoryRoutes]
}
