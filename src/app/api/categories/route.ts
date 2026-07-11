import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, icon_url, banner_url, color, sort_order')
    .eq('status', 'ACTIVE')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, message: 'Gagal memuat kategori' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}
