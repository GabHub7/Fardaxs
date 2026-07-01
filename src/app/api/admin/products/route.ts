import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

// ─── Validation schema ────────────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  slug: z
    .string()
    .min(1, 'Slug wajib diisi')
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung'),
  short_description: z.string().max(500).optional(),
  description: z.string().optional(),
  // Accept a real URL, a root-relative path, or a "logo:xxx" brand slug
  image_url: z
    .string()
    .max(1000)
    .refine(
      (v) => !v || /^https?:\/\//.test(v) || v.startsWith('/') || v.startsWith('logo:'),
      'Gambar harus berupa URL valid atau slug logo'
    )
    .optional(),
  selling_price: z.number({ error: 'Harga jual wajib diisi' }).min(0),
  reseller_price: z.number({ error: 'Harga reseller wajib diisi' }).min(0),
  // Harga normal sebelum diskon (dicoret di storefront jika > selling_price)
  base_cost: z.number().min(0).optional().default(0),
  category_id: z.string().uuid('ID kategori tidak valid'),
  provider_id: z.string().uuid('ID provider tidak valid').optional(),
  provider_product_code: z.string().max(255).optional(),
  fulfillment_type: z.enum(['AUTO_PPOB', 'SMM', 'INVENTORY', 'MANUAL']),
  target_type: z.enum(['PHONE', 'USERNAME', 'GAME_ID', 'EMAIL', 'URL', 'CUSTOM']),
  target_label: z.string().min(1, 'Label target wajib diisi').max(100),
  target_placeholder: z.string().max(200).optional(),
  target_validation: z.string().max(500).optional(),
  is_featured: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

type CreateProductInput = z.infer<typeof createProductSchema>

// ─── GET /api/admin/products ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth

  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '50'))
  const status = searchParams.get('status') ?? ''

  let query = serviceClient
    .from('products')
    .select('id, name, slug, status, selling_price, category_id')
    .order('name', { ascending: true })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'OK', data: data ?? [] })
}

// ─── POST /api/admin/products ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Authenticate + verify admin role
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Akses ditolak — hanya Admin yang dapat membuat produk' },
      { status: 403 }
    )
  }
  const { serviceClient, profileId } = auth

  // 3. Parse and validate body
  let body: CreateProductInput
  try {
    const raw: unknown = await request.json()
    body = createProductSchema.parse(raw)
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: 'Data tidak valid',
        errors:
          err instanceof z.ZodError
            ? err.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
            : ['Request body tidak valid'],
      },
      { status: 400 }
    )
  }

  // 4. Check slug uniqueness
  const { data: existing } = await serviceClient
    .from('products')
    .select('id')
    .eq('slug', body.slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Slug "${body.slug}" sudah digunakan produk lain` },
      { status: 409 }
    )
  }

  // 5. Insert product
  const { data: newProduct, error: insertError } = await serviceClient
    .from('products')
    .insert({
      name: body.name,
      slug: body.slug,
      short_description: body.short_description ?? null,
      description: body.description ?? null,
      image_url: body.image_url ?? null,
      selling_price: body.selling_price,
      reseller_price: body.reseller_price,
      base_cost: body.base_cost ?? 0,
      category_id: body.category_id,
      provider_id: body.provider_id ?? null,
      provider_product_code: body.provider_product_code ?? null,
      fulfillment_type: body.fulfillment_type,
      target_type: body.target_type,
      target_label: body.target_label,
      target_placeholder: body.target_placeholder ?? null,
      target_validation: body.target_validation ?? null,
      is_featured: body.is_featured ?? false,
      sort_order: body.sort_order ?? 0,
      status: body.status,
    })
    .select('id, name, slug')
    .single()

  if (insertError || !newProduct) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal membuat produk: ' + (insertError?.message ?? 'Unknown error') },
      { status: 500 }
    )
  }

  // 6. Audit log
  await serviceClient.from('audit_logs').insert({
    user_id: profileId,
    action: 'PRODUCT_CREATED',
    resource_type: 'product',
    resource_id: newProduct.id,
    new_data: { name: newProduct.name, slug: newProduct.slug },
    ip_address: request.headers.get('x-forwarded-for') ?? 'unknown',
  })

  return NextResponse.json<ApiResponse<{ id: string; name: string; slug: string }>>(
    {
      success: true,
      message: 'Produk berhasil dibuat',
      data: { id: newProduct.id, name: newProduct.name, slug: newProduct.slug },
    },
    { status: 201 }
  )
}

// ─── GET /api/admin/products/options ─────────────────────────────────────────
// Note: options endpoint is at /api/admin/products/options/route.ts
// This route only handles POST for create
