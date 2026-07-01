import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

const BUCKET = 'product-images'
const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

/**
 * POST /api/admin/upload — admin-only image upload.
 * Accepts multipart/form-data with a `file` field, stores it in the public
 * `product-images` bucket via the service role, and returns the public URL.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Akses ditolak' }, { status: 403 })
  }

  let file: File | null = null
  try {
    const formData = await request.formData()
    const f = formData.get('file')
    if (f instanceof File) file = f
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Form tidak valid' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'File tidak ditemukan' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Format harus PNG, JPG, WEBP, atau GIF' },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Ukuran gambar maksimal 5MB' },
      { status: 400 }
    )
  }

  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await auth.serviceClient.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    const hint = /bucket/i.test(uploadError.message)
      ? ' — pastikan migrasi 011 (bucket product-images) sudah dijalankan.'
      : ''
    return NextResponse.json<ApiResponse>(
      { success: false, message: 'Gagal mengunggah: ' + uploadError.message + hint },
      { status: 500 }
    )
  }

  const { data } = auth.serviceClient.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json<ApiResponse<{ url: string }>>({
    success: true,
    message: 'Gambar berhasil diunggah',
    data: { url: data.publicUrl },
  })
}
