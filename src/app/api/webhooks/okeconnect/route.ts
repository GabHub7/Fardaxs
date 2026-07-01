import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { waNotifyOrderSuccess, waNotifyOrderFailed } from '@/lib/whatsapp'

// OkeConnect sends async status callbacks for PROCESSING orders
interface OkeConnectCallback {
  merchant_id: string
  ref_id: string          // our order_id
  trx_id: string          // OkeConnect transaction ID
  product_code: string
  status: string          // 'SUCCESS' | 'GAGAL' | 'PROSES'
  message: string
  sn: string | null       // serial number for voucher products
  sign: string            // md5(merchant_id + ref_id + trx_id + secret)
}

function validateSign(payload: OkeConnectCallback, secret: string): boolean {
  const expected = crypto
    .createHash('md5')
    .update(payload.merchant_id + payload.ref_id + payload.trx_id + secret)
    .digest('hex')

  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(payload.sign ?? '', 'hex')
  if (expectedBuf.length !== receivedBuf.length) return false

  try {
    return crypto.timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const serviceClient = createServiceClient()
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

  let payload: OkeConnectCallback
  try {
    payload = await request.json() as OkeConnectCallback
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
  }

  // 1. Validate merchant ID (OkeConnect "Member ID" — accept either env name)
  const merchantId = process.env.OKECONNECT_MERCHANT_ID ?? process.env.OKECONNECT_MEMBER_ID ?? ''
  if (!merchantId || payload.merchant_id !== merchantId) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // 2. Validate signature
  const secret = process.env.OKECONNECT_SECRET_KEY ?? ''
  if (!validateSign(payload, secret)) {
    await serviceClient.from('audit_logs').insert({
      action: 'OKECONNECT_INVALID_CALLBACK',
      resource_type: 'webhook',
      resource_id: payload.ref_id ?? 'unknown',
      new_data: { ip, merchant_id: payload.merchant_id, status: payload.status },
    })
    return NextResponse.json({ success: false }, { status: 400 })
  }

  // 3. Find the order with user info for WA notification
  const orderId = payload.ref_id
  const { data: order } = await serviceClient
    .from('orders')
    .select('id, status, user_id, order_number, target, products(name), users(phone, full_name)')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
  }

  // Idempotency — skip if already terminal
  const terminalStatuses = ['SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED']
  if (terminalStatuses.includes(order.status as string)) {
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  const now = new Date().toISOString()
  const isSuccess = payload.status === 'SUCCESS'
  const isGagal = payload.status === 'GAGAL'

  if (isSuccess) {
    // Mark order SUCCESS
    await serviceClient
      .from('orders')
      .update({
        status: 'SUCCESS',
        completed_at: now,
        provider_reference: payload.trx_id,
        provider_status: 'SUCCESS',
      })
      .eq('id', orderId)

    await serviceClient.from('order_status_logs').insert({
      order_id: orderId,
      old_status: order.status,
      new_status: 'SUCCESS',
      reason: `OkeConnect callback: ${payload.message}`,
      metadata: { trx_id: payload.trx_id, sn: payload.sn },
    })

    await serviceClient.from('audit_logs').insert({
      action: 'ORDER_COMPLETED_VIA_CALLBACK',
      resource_type: 'order',
      resource_id: orderId,
      new_data: { trx_id: payload.trx_id, sn: payload.sn, message: payload.message },
    })

    // Notify user (system + WA)
    const productsRel = order.products
    const usersRel = order.users
    const productName = ((Array.isArray(productsRel) ? productsRel[0] : productsRel) as { name: string } | null)?.name ?? 'produk'
    const userInfo = (Array.isArray(usersRel) ? usersRel[0] : usersRel) as { phone?: string; full_name?: string } | null
    await serviceClient.from('notifications').insert({
      user_id: order.user_id,
      title: 'Pesanan Selesai!',
      message: `Pesanan ${productName} berhasil diproses.${payload.sn ? ' Lihat detail pesanan untuk informasi akun/serial.' : ''}`,
      channel: 'SYSTEM',
      status: 'SENT',
    })
    if (userInfo?.phone) {
      waNotifyOrderSuccess({
        phone: userInfo.phone,
        name: userInfo.full_name ?? 'Pelanggan',
        order_number: order.order_number,
        product_name: productName,
        target: order.target,
      }).catch(() => {})
    }
  } else if (isGagal) {
    // Mark order FAILED
    await serviceClient
      .from('orders')
      .update({
        status: 'FAILED',
        provider_reference: payload.trx_id,
        provider_status: 'FAILED',
      })
      .eq('id', orderId)

    await serviceClient.from('order_status_logs').insert({
      order_id: orderId,
      old_status: order.status,
      new_status: 'FAILED',
      reason: `OkeConnect callback: ${payload.message}`,
      metadata: { trx_id: payload.trx_id },
    })

    await serviceClient.from('audit_logs').insert({
      action: 'ORDER_FAILED_VIA_CALLBACK',
      resource_type: 'order',
      resource_id: orderId,
      new_data: { trx_id: payload.trx_id, message: payload.message },
    })

    const productsRel2 = order.products
    const usersRel2 = order.users
    const productName = ((Array.isArray(productsRel2) ? productsRel2[0] : productsRel2) as { name: string } | null)?.name ?? 'produk'
    const userInfo = (Array.isArray(usersRel2) ? usersRel2[0] : usersRel2) as { phone?: string; full_name?: string } | null
    await serviceClient.from('notifications').insert({
      user_id: order.user_id,
      title: 'Pesanan Gagal',
      message: `Pesanan ${productName} gagal diproses. Tim kami akan segera menangani. (${payload.message})`,
      channel: 'SYSTEM',
      status: 'SENT',
    })
    if (userInfo?.phone) {
      waNotifyOrderFailed({
        phone: userInfo.phone,
        name: userInfo.full_name ?? 'Pelanggan',
        order_number: order.order_number,
        reason: payload.message,
      }).catch(() => {})
    }
  }
  // status === 'PROSES' — still processing, do nothing (will get another callback later)

  return NextResponse.json({ success: true })
}
