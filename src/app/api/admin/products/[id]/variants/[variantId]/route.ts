import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  selling_price: z.number().min(0).optional(),
  reseller_price: z.number().min(0).optional(),
  base_cost: z.number().min(0).optional(),
  provider_product_code: z.string().max(255).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

interface RouteParams {
  params: Promise<{ id: string; variantId: string }>
}

// PATCH /api/admin/products/[id]/variants/[variantId]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth
  const { id: productId, variantId } = await params

  let body: z.infer<typeof patchSchema>
  try {
    const raw: unknown = await req.json()
    body = patchSchema.parse(raw)
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
    .update({ ...body })
    .eq('id', variantId)
    .eq('product_id', productId)
    .select('id, name, selling_price')
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal memperbarui varian: ' + (error?.message ?? 'Not found') },
      { status: error ? 500 : 404 }
    )
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, message: 'Varian diperbarui', data })
}

// DELETE /api/admin/products/[id]/variants/[variantId]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth
  const { id: productId, variantId } = await params

  const { error } = await serviceClient
    .from('product_variants')
    .delete()
    .eq('id', variantId)
    .eq('product_id', productId)

  if (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal hapus varian: ' + error.message },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse>({ success: true, message: 'Varian dihapus' })
}
