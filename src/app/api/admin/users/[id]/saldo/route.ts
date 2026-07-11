import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { formatCurrency } from '@/lib/utils'
import type { ApiResponse } from '@/types'

const MAX_ADJUSTMENT = 100_000_000

// POST /api/admin/users/[id]/saldo — admin-only wallet balance adjustment.
// Positive amount credits the user, negative amount deducts (blocked by
// apply_wallet_mutation() if it would take the balance below zero).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient } = auth

  const { id } = await params
  const body = await request.json().catch(() => ({})) as { amount?: number; description?: string }

  const amount = Math.trunc(Number(body.amount))
  if (!amount || !Number.isFinite(amount)) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Jumlah saldo tidak valid.' }, { status: 400 })
  }
  if (Math.abs(amount) > MAX_ADJUSTMENT) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: `Maksimal penyesuaian saldo Rp${MAX_ADJUSTMENT.toLocaleString('id-ID')} per transaksi.` },
      { status: 400 }
    )
  }

  const { data: targetUser } = await serviceClient
    .from('users')
    .select('id, email, full_name')
    .eq('id', id)
    .single()

  if (!targetUser) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 })
  }

  const description = (body.description ?? '').trim() ||
    (amount > 0 ? 'Penambahan saldo oleh admin' : 'Pengurangan saldo oleh admin')

  const { data: mutation, error } = await serviceClient.rpc('apply_wallet_mutation', {
    p_user_id: id,
    p_type: 'ADJUSTMENT',
    p_amount: amount,
    p_reference_type: 'admin_adjustment',
    p_reference_id: auth.profileId,
    p_description: description,
    p_created_by: auth.profileId,
  })

  if (error) {
    // apply_wallet_mutation() raises when the deduction would leave a
    // negative balance — surface that as a 400, everything else as 500.
    const insufficientBalance = error.message?.includes('Saldo tidak mencukupi')
    return NextResponse.json<ApiResponse>(
      { success: false, message: insufficientBalance ? error.message : 'Gagal menyesuaikan saldo.' },
      { status: insufficientBalance ? 400 : 500 }
    )
  }

  await serviceClient.from('notifications').insert({
    user_id: id,
    title: amount > 0 ? 'Saldo Ditambahkan' : 'Saldo Dikurangi',
    message:
      amount > 0
        ? `Admin menambahkan ${formatCurrency(amount)} ke saldo Anda. ${description}`
        : `Admin mengurangi ${formatCurrency(Math.abs(amount))} dari saldo Anda. ${description}`,
    channel: 'SYSTEM',
    status: 'SENT',
  })

  await serviceClient.from('audit_logs').insert({
    user_id: auth.profileId,
    action: 'WALLET_ADJUSTED_BY_ADMIN',
    resource_type: 'wallet',
    resource_id: id,
    new_data: { amount, description, target_user: targetUser.email },
  })

  return NextResponse.json<ApiResponse>({
    success: true,
    message: `Saldo ${targetUser.full_name ?? targetUser.email} berhasil ${amount > 0 ? 'ditambahkan' : 'dikurangi'}.`,
    data: { after_balance: (mutation as { after_balance?: number } | null)?.after_balance },
  })
}
