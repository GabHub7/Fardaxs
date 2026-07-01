import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

// GET /api/admin/products/options?type=categories|providers
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'categories') {
    const { data, error } = await serviceClient
      .from('categories')
      .select('id, name')
      .order('name')

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ id: string; name: string }[]>>({
      success: true,
      message: 'OK',
      data: (data as { id: string; name: string }[]) ?? [],
    })
  }

  if (type === 'providers') {
    const { data, error } = await serviceClient
      .from('providers')
      .select('id, name')
      .eq('status', 'ACTIVE')
      .order('name')

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ id: string; name: string }[]>>({
      success: true,
      message: 'OK',
      data: (data as { id: string; name: string }[]) ?? [],
    })
  }

  return NextResponse.json<ApiResponse>(
    { success: false, message: 'Parameter type tidak valid. Gunakan: categories atau providers' },
    { status: 400 }
  )
}
