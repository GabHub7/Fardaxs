import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, PaginatedResponse, Product } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const sort = searchParams.get('sort') ?? 'sort_order'
  const featured = searchParams.get('featured') === 'true'

  const offset = (page - 1) * limit

  let query = supabase
    .from('products')
    .select(
      `
      id, name, slug, short_description, image_url, thumbnail_url,
      selling_price, reseller_price, status, is_featured, sort_order,
      category:categories(id, name, slug, color),
      created_at
    `,
      { count: 'exact' }
    )
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)

  if (category) {
    query = query.eq('categories.slug', category)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (featured) {
    query = query.eq('is_featured', true)
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      query = query.order('selling_price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('selling_price', { ascending: false })
      break
    case 'popular':
      query = query.order('is_featured', { ascending: false }).order('sort_order', { ascending: true })
      break
    default:
      query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal memuat produk' },
      { status: 500 }
    )
  }

  const total = count ?? 0
  const total_pages = Math.ceil(total / limit)

  return NextResponse.json<PaginatedResponse<Product>>({
    success: true,
    message: 'Success',
    data: (data as unknown as Product[]) ?? [],
    meta: { page, limit, total, total_pages },
  })
}
