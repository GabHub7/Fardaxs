import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

const variantSchema = z.object({
  name: z.string().min(1, 'Nama varian wajib diisi').max(255),
  selling_price: z.number().min(0, 'Harga jual tidak boleh negatif'),
  reseller_price: z.number().min(0).optional().default(0),
  base_cost: z.number().min(0).optional().default(0),
  provider_product_code: z.string().max(255).optional(),
  sort_order: z.number().int().min(0).optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/products/[id]/variants
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth
  const { id } = await params

  const { data, error } = await serviceClient
    .from('product_variants')
    .select('id, name, selling_price, reseller_price, base_cost, provider_product_code, sort_order, status, metadata')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'OK', data: data ?? [] })
}

// POST /api/admin/products/[id]/variants
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth
  const { id: productId } = await params

  let body: z.infer<typeof variantSchema>
  try {
    const raw: unknown = await req.json()
    body = variantSchema.parse(raw)
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: 'Data tidak valid',
        errors: err instanceof z.ZodError ? err.issues.map((e) => e.message) : ['Invalid request'],
      },
      { status: 400 }
    )
  }

  const { data, error } = await serviceClient
    .from('product_variants')
    .insert({
      product_id: productId,
      name: body.name,
      selling_price: body.selling_price,
      reseller_price: body.reseller_price ?? 0,
      base_cost: body.base_cost ?? 0,
      provider_product_code: body.provider_product_code ?? null,
      sort_order: body.sort_order ?? 0,
      status: body.status ?? 'ACTIVE',
      metadata: body.metadata ?? {},
    })
    .select('id, name, selling_price')
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal membuat varian: ' + (error?.message ?? 'Unknown error') },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<typeof data>>(
    { success: true, message: 'Varian berhasil dibuat', data },
    { status: 201 }
  )
}
