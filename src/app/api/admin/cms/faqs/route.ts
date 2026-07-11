import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import type { ApiResponse } from '@/types'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await auth.serviceClient
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.question?.trim() || !body.answer?.trim()) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pertanyaan dan jawaban wajib diisi.' }, { status: 400 })
  }

  const { data, error } = await auth.serviceClient
    .from('faqs')
    .insert({
      question: body.question.trim(),
      answer: body.answer.trim(),
      category: body.category?.trim() || null,
      sort_order: body.sort_order ?? 1,
      status: body.status ?? 'ACTIVE',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data }, { status: 201 })
}
