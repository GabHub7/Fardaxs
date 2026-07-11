import { createServiceClient, type SupabaseServiceClient } from '@/lib/supabase/server'
import { okeConnectAdapter } from '@/lib/providers/okeconnect'
import { smmPanelAdapter } from '@/lib/providers/smm-panel'
import type { ProviderAdapter, FulfillmentResult } from '@/lib/providers/adapter'
import { decrypt } from '@/lib/encryption'
import { sendOrderSuccessEmail } from '@/lib/email'

interface OrderForFulfillment {
  id: string
  order_number: string
  product_id: string
  user_id: string
  target: string
  customer_input: Record<string, unknown>
  quantity: number
  provider_id: string | null
  provider_reference: string | null
  products: {
    fulfillment_type: string
    provider_product_code: string | null
    name: string
  } | null
  users: {
    email: string
    full_name: string | null
  } | null
}

export type FulfillmentOutcome = 'SUCCESS' | 'FAILED' | 'PENDING' | 'SKIPPED'

export async function fulfillOrder(orderId: string): Promise<FulfillmentOutcome> {
  const serviceClient = createServiceClient()

  // Load the order with product and user info
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id, order_number, product_id, user_id, target, customer_input, quantity, provider_id, provider_reference, products(fulfillment_type, provider_product_code, name), users(email, full_name)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return 'FAILED'
  }

  // Supabase returns to-one joins as an array unless the FK is declared 1:1 —
  // normalize both shapes (see src/lib/auth-guard.ts for the same pattern).
  // Getting this wrong here is critical: every order would silently fall
  // through to MANUAL and never auto-fulfill.
  const rawOrder = order as unknown as Record<string, unknown>
  const productsRel = rawOrder.products
  const usersRel = rawOrder.users
  const o: OrderForFulfillment = {
    ...(rawOrder as Omit<OrderForFulfillment, 'products' | 'users'>),
    products: (Array.isArray(productsRel) ? productsRel[0] : productsRel) as OrderForFulfillment['products'],
    users: (Array.isArray(usersRel) ? usersRel[0] : usersRel) as OrderForFulfillment['users'],
  }
  const fulfillmentType = o.products?.fulfillment_type ?? 'MANUAL'

  if (fulfillmentType === 'PROVIDER' || fulfillmentType === 'AUTO_PPOB') {
    return fulfillViaProvider(serviceClient, o, okeConnectAdapter)
  }

  // SMM panel (social-media services: followers/likes/views). Uses the same
  // provider flow but routes to the SMM adapter and passes the order quantity.
  if (fulfillmentType === 'SMM') {
    return fulfillViaProvider(serviceClient, o, smmPanelAdapter)
  }

  if (fulfillmentType === 'INVENTORY') {
    return fulfillViaInventory(serviceClient, o)
  }

  // MANUAL — leave as PROCESSING for admin to handle
  return 'PENDING'
}

async function fulfillViaProvider(
  serviceClient: SupabaseServiceClient,
  order: OrderForFulfillment,
  adapter: ProviderAdapter
): Promise<FulfillmentOutcome> {
  const productCode = order.products?.provider_product_code
  if (!productCode) {
    await failOrder(serviceClient, order, 'Kode produk provider tidak dikonfigurasi')
    return 'FAILED'
  }

  let result: FulfillmentResult
  try {
    result = await adapter.fulfill({
      orderId: order.id,
      providerProductCode: productCode,
      target: order.target,
      quantity: order.quantity,
      customerInput: order.customer_input as Record<string, unknown>,
    })
  } catch (err) {
    // adapter.fulfill() is awaited from a fire-and-forget call (the webhook
    // does `void fulfillOrder(...)` so it doesn't block the gateway
    // response) — an uncaught throw here becomes a silent unhandled
    // rejection and the order is left stuck in PROCESSING forever with no
    // trace. Always resolve to a clean FAILED state instead.
    const message = err instanceof Error ? err.message : 'Provider mengembalikan error tak terduga'
    await failOrder(serviceClient, order, message)
    return 'FAILED'
  }

  if (result.success) {
    await completeOrder(serviceClient, order, {
      providerReference: result.providerTransactionId,
      serialNumber: result.serialNumber,
    })
    return 'SUCCESS'
  }

  // Provider returned pending — keep as PROCESSING, will be re-checked
  if (result.message?.toLowerCase().includes('proses') || result.message?.toLowerCase().includes('pending')) {
    await serviceClient
      .from('orders')
      .update({ provider_reference: result.providerTransactionId ?? null })
      .eq('id', order.id)
    return 'PENDING'
  }

  await failOrder(serviceClient, order, result.message ?? 'Provider gagal memproses')
  return 'FAILED'
}

async function fulfillViaInventory(
  serviceClient: SupabaseServiceClient,
  order: OrderForFulfillment
): Promise<FulfillmentOutcome> {
  // Pick AVAILABLE inventory item candidates
  const { data: candidates } = await serviceClient
    .from('inventories')
    .select('id')
    .eq('product_id', order.product_id)
    .eq('status', 'AVAILABLE')
    .limit(order.quantity)

  if (!candidates || candidates.length < order.quantity) {
    await failOrder(serviceClient, order, 'Stok inventory tidak tersedia')
    return 'FAILED'
  }

  const candidateIds = (candidates as { id: string }[]).map((i) => i.id)

  // Mark inventory as SOLD and link to this order — the `.eq('status', 'AVAILABLE')`
  // guard plus `.select()` on the result is what makes this safe under
  // concurrency: if another fulfillment already claimed one of these rows
  // between our SELECT and this UPDATE, that row simply won't be in the
  // returned set, and `claimed.length` will come up short below. We must
  // not trust `candidateIds` as "ours" until we've seen them come back here.
  const { data: claimed, error: updateError } = await serviceClient
    .from('inventories')
    .update({ status: 'SOLD', assigned_order_id: order.id })
    .in('id', candidateIds)
    .eq('status', 'AVAILABLE')
    .select('id, credential')

  if (updateError) {
    await failOrder(serviceClient, order, 'Gagal mengambil inventory')
    return 'FAILED'
  }

  const claimedItems = (claimed ?? []) as { id: string; credential: string }[]

  if (claimedItems.length < order.quantity) {
    // Lost the race on some items — release whatever we did manage to claim
    // so they don't get stuck assigned to a failed order, then fail clean.
    if (claimedItems.length > 0) {
      await serviceClient
        .from('inventories')
        .update({ status: 'AVAILABLE', assigned_order_id: null })
        .in('id', claimedItems.map((i) => i.id))
    }
    await failOrder(serviceClient, order, 'Stok inventory habis diambil pesanan lain — silakan coba lagi')
    return 'FAILED'
  }

  // Decrypt credentials to store in order (for delivery to customer)
  const decryptedCredentials = claimedItems.map((item) => {
    try {
      return decrypt(item.credential)
    } catch {
      return item.credential
    }
  })

  await completeOrder(serviceClient, order, {
    serialNumber: decryptedCredentials.join('\n'),
  })

  return 'SUCCESS'
}

async function completeOrder(
  serviceClient: SupabaseServiceClient,
  order: OrderForFulfillment,
  extra: { providerReference?: string; serialNumber?: string }
) {
  const now = new Date().toISOString()

  await serviceClient
    .from('orders')
    .update({
      status: 'SUCCESS',
      completed_at: now,
      provider_reference: extra.providerReference ?? order.provider_reference ?? null,
      provider_status: 'SUCCESS',
    })
    .eq('id', order.id)

  await serviceClient.from('order_status_logs').insert({
    order_id: order.id,
    old_status: 'PROCESSING',
    new_status: 'SUCCESS',
    reason: 'Fulfillment completed',
  })

  await serviceClient.from('audit_logs').insert({
    action: 'ORDER_COMPLETED',
    resource_type: 'order',
    resource_id: order.id,
    new_data: { provider_reference: extra.providerReference },
  })

  // Create in-app notification for user
  await serviceClient.from('notifications').insert({
    user_id: order.user_id,
    title: 'Pesanan Selesai!',
    message: `Pesanan ${order.products?.name ?? 'produk'} untuk ${order.target} berhasil diproses.${extra.serialNumber ? ' Lihat detail pesanan untuk informasi akun.' : ''}`,
    channel: 'SYSTEM',
    status: 'SENT',
  })

  // Send email confirmation
  if (order.users?.email) {
    try {
      await sendOrderSuccessEmail({
        to: order.users.email,
        name: order.users.full_name ?? order.users.email,
        orderNumber: order.order_number,
        productName: order.products?.name ?? 'Produk',
        orderId: order.id,
      })
    } catch {
      // Non-fatal — order is still complete
    }
  }
}

async function failOrder(
  serviceClient: SupabaseServiceClient,
  order: OrderForFulfillment,
  reason: string
) {
  await serviceClient
    .from('orders')
    .update({
      status: 'FAILED',
      provider_status: 'FAILED',
    })
    .eq('id', order.id)

  await serviceClient.from('order_status_logs').insert({
    order_id: order.id,
    old_status: 'PROCESSING',
    new_status: 'FAILED',
    reason,
  })

  await serviceClient.from('audit_logs').insert({
    action: 'ORDER_FAILED',
    resource_type: 'order',
    resource_id: order.id,
    new_data: { reason },
  })

  // Notify user
  await serviceClient.from('notifications').insert({
    user_id: order.user_id,
    title: 'Pesanan Gagal',
    message: `Pesanan ${order.products?.name ?? 'produk'} gagal diproses. Tim kami akan segera menghubungi Anda atau melakukan refund.`,
    channel: 'SYSTEM',
    status: 'SENT',
  })

}
