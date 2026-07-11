import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { sanitizeSearchTerm } from '@/lib/utils'
import type { ApiResponse } from '@/types'

// GET /api/admin/orders — paginated order list + optional CSV export
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const format = searchParams.get('format') ?? 'json'
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const offset = (page - 1) * limit

  let query = auth.serviceClient
    .from('orders')
    .select(
      'id, order_number, target, price, gateway_fee, profit, status, payment_method, created_at, updated_at, users(email, full_name), products(name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (search) {
    const safeSearch = sanitizeSearchTerm(search)
    if (safeSearch) query = query.or(`order_number.ilike.%${safeSearch}%,target.ilike.%${safeSearch}%`)
  }
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z')

  if (format === 'csv') {
    // For CSV export, fetch up to 10k rows without pagination
    const { data } = await query.limit(10000)
    const rows = (data ?? []) as Record<string, unknown>[]

    const header = 'No. Pesanan,Target,Produk,Harga,Fee,Profit,Status,Metode Bayar,Tanggal\n'
    const body = rows.map((r) => {
      const user = r.users as { email: string } | null
      const product = r.products as { name: string } | null
      return [
        r.order_number,
        r.target,
        product?.name ?? '',
        r.price,
        r.gateway_fee ?? 0,
        r.profit ?? 0,
        r.status,
        r.payment_method ?? '',
        r.created_at,
      ].join(',')
    }).join('\n')

    return new Response(header + body, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const { data, count } = await query.range(offset, offset + limit - 1)

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  })
}
