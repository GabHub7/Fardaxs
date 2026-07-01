import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { encrypt } from '@/lib/encryption'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth

  const body = await request.json() as { product_id?: string; credentials?: string[] }

  if (!body.product_id) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'product_id wajib diisi' }, { status: 400 })
  }

  const rawCredentials = (body.credentials ?? []).map((c) => c.trim()).filter(Boolean)
  if (rawCredentials.length === 0) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Minimal 1 credential diperlukan' }, { status: 400 })
  }

  // Check product exists
  const { data: product } = await serviceClient
    .from('products')
    .select('id')
    .eq('id', body.product_id)
    .single()

  if (!product) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 })
  }

  // Fetch existing credentials to detect duplicates
  const { data: existing } = await serviceClient
    .from('inventories')
    .select('credential')
    .eq('product_id', body.product_id)

  const existingSet = new Set(
    (existing ?? []).map((e: { credential: string | null }) => e.credential ?? '')
  )

  const toInsert: { product_id: string; credential: string; status: string }[] = []
  let skipped = 0

  for (const raw of rawCredentials) {
    const encrypted = encrypt(raw)
    if (existingSet.has(encrypted)) {
      skipped++
      continue
    }
    toInsert.push({
      product_id: body.product_id,
      credential: encrypted,
      status: 'AVAILABLE',
    })
    existingSet.add(encrypted)
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      success: true,
      message: `${skipped} credential dilewati (semua duplikat)`,
      data: { imported: 0, skipped },
    })
  }

  // Insert in batches of 100
  const BATCH = 100
  let totalImported = 0
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    const { error } = await serviceClient.from('inventories').insert(batch)
    if (!error) totalImported += batch.length
  }

  return NextResponse.json({
    success: true,
    message: `${totalImported} credential berhasil diimport`,
    data: { imported: totalImported, skipped },
  })
}
