import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { fulfillOrder } from '@/lib/fulfillment'
import type { ApiResponse } from '@/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { data, error } = await auth.serviceClient
    .from('payments')
    .select(`
      id, gateway, gateway_transaction_id, amount, status, paid_at, created_at, updated_at,
      invoices(
        id, invoice_number, amount, expired_at, status,
        orders(
          id, order_number, target, quantity, price, status, payment_method, provider_reference,
          paid_at, created_at,
          products(name, slug),
          users(email, full_name, phone)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pembayaran tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json<ApiResponse>({ success: false, message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['status', 'gateway_transaction_id', 'paid_at']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Load current payment + invoice/order linkage before updating, so we know
  // what to cascade and can stay idempotent if it's already in that state.
  const { data: current } = await auth.serviceClient
    .from('payments')
    .select('id, status, invoice_id, invoices(id, order_id, amount, status)')
    .eq('id', id)
    .single()

  if (!current) {
    return NextResponse.json<ApiResponse>({ success: false, message: 'Pembayaran tidak ditemukan.' }, { status: 404 })
  }

  const invoiceRel = current.invoices
  const invoice = (Array.isArray(invoiceRel) ? invoiceRel[0] : invoiceRel) as
    | { id: string; order_id: string; amount: number; status: string }
    | null

  const newStatus = updates.status as string | undefined
  const alreadyPaid = current.status === 'PAID'

  const { data, error } = await auth.serviceClient
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json<ApiResponse>({ success: false, message: error.message }, { status: 500 })

  // Cascade the status change down to invoice/order — a payment-only update
  // would otherwise leave the order stuck in PENDING_PAYMENT forever, since
  // fulfillment is only ever triggered off of order.status transitions.
  if (newStatus && invoice) {
    if (newStatus === 'PAID' && !alreadyPaid) {
      const now = new Date().toISOString()
      await auth.serviceClient.from('invoices').update({ status: 'PAID' }).eq('id', invoice.id)
      await auth.serviceClient
        .from('orders')
        .update({ status: 'PAID', paid_at: now })
        .eq('id', invoice.order_id)
        .eq('status', 'PENDING_PAYMENT')
      await auth.serviceClient
        .from('orders')
        .update({ status: 'PROCESSING' })
        .eq('id', invoice.order_id)
        .eq('status', 'PAID')
      await auth.serviceClient.from('order_status_logs').insert({
        order_id: invoice.order_id,
        old_status: 'PENDING_PAYMENT',
        new_status: 'PROCESSING',
        reason: 'Konfirmasi pembayaran manual oleh admin',
      })
      await auth.serviceClient.from('audit_logs').insert({
        action: 'PAYMENT_MANUALLY_CONFIRMED',
        resource_type: 'payment',
        resource_id: id,
        new_data: { order_id: invoice.order_id },
      })
      void fulfillOrder(invoice.order_id)
    } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(newStatus) && invoice.status === 'PENDING') {
      await auth.serviceClient.from('invoices').update({ status: newStatus }).eq('id', invoice.id)
      await auth.serviceClient
        .from('orders')
        .update({ status: newStatus })
        .eq('id', invoice.order_id)
        .eq('status', 'PENDING_PAYMENT')
      await auth.serviceClient.from('order_status_logs').insert({
        order_id: invoice.order_id,
        old_status: 'PENDING_PAYMENT',
        new_status: newStatus,
        reason: 'Pembayaran ditandai gagal/batal oleh admin',
      })
    }
  }

  return NextResponse.json({ success: true, data })
}
