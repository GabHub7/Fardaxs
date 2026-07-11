import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getInitials,
  getStatusColor,
  getStatusLabel,
} from '@/lib/utils'
import type { UserStatus } from '@/types'
import { UserActions } from './user-actions'
import { SaldoAdjustForm } from './saldo-adjust-form'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetail {
  id: string
  email: string
  username: string | null
  full_name: string | null
  phone: string | null
  email_verified: boolean
  status: UserStatus
  theme_preference: string | null
  last_login_at: string | null
  created_at: string
  role_id: string | null
  roles: { id: string; name: string } | { id: string; name: string }[] | null
}

interface RoleOption {
  id: string
  name: string
}

interface OrderRow {
  id: string
  order_number: string
  status: string
  price: number
  created_at: string
  products: { name: string } | { name: string }[] | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function PenggunaDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceClient()

  const [userResult, ordersResult, walletResult, rolesResult] = await Promise.all([
    supabase
      .from('users')
      .select(
        'id, email, username, full_name, phone, email_verified, status, theme_preference, last_login_at, created_at, role_id, roles(id, name)'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('orders')
      .select('id, order_number, status, price, created_at, products(name)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('wallets').select('balance').eq('user_id', id).maybeSingle(),
    supabase.from('roles').select('id, name').order('name'),
  ])

  if (userResult.error || !userResult.data) {
    notFound()
  }

  const user = userResult.data as unknown as UserDetail
  const orders = (ordersResult.data as unknown as OrderRow[]) ?? []
  const walletBalance = (walletResult.data as { balance: number } | null)?.balance ?? 0
  const roleOptions = (rolesResult.data as RoleOption[]) ?? []

  const roleRelation = user.roles
  const roleRecord = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation
  const roleName = roleRecord?.name ?? 'MEMBER'
  const isBanned = user.status === 'BANNED' || user.status === 'SUSPENDED'
  const statusColor = getStatusColor(user.status)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pengguna"
            className="px-3 py-1.5 rounded-[12px] text-xs font-medium press-effect hover-fade"
            style={{
              background: 'hsl(var(--background-muted))',
              color: 'hsl(var(--foreground-muted))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            ← Kembali
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              Detail Pengguna
            </h1>
            <p className="text-sm mt-0.5 break-all" style={{ color: 'hsl(var(--foreground-muted))' }}>
              {user.email}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusColor}`}>
          {getStatusLabel(user.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <div
            className="rounded-[20px] border p-5"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
              >
                {getInitials(user.full_name ?? user.email)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                  {user.full_name ?? '-'}
                </p>
                <p className="text-xs truncate" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  @{user.username ?? '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Email" value={user.email} mono />
              <InfoRow label="Telepon" value={user.phone ?? '-'} />
              <InfoRow label="Role" value={roleName} />
              <InfoRow
                label="Email Terverifikasi"
                value={user.email_verified ? 'Ya' : 'Belum'}
              />
              <InfoRow label="Bergabung" value={formatDateTime(user.created_at)} />
              <InfoRow
                label="Login Terakhir"
                value={user.last_login_at ? formatDateTime(user.last_login_at) : '-'}
              />
              <InfoRow label="Saldo Wallet" value={formatCurrency(walletBalance)} />
              <InfoRow label="User ID" value={user.id} mono />
            </div>
          </div>

          {/* Recent orders */}
          <div
            className="rounded-[20px] border p-5"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
              Pesanan Terakhir
            </h2>
            {orders.length === 0 ? (
              <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                Belum ada pesanan.
              </p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const productRelation = order.products
                  const product = Array.isArray(productRelation) ? productRelation[0] : productRelation
                  return (
                    <Link
                      key={order.id}
                      href={`/admin/pesanan/${order.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-[14px] hover-fade press-effect"
                      style={{ background: 'hsl(var(--background-muted))' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                          {product?.name ?? order.order_number}
                        </p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          {order.order_number} · {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {formatCurrency(order.price)}
                        </p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${getStatusColor(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-5">
          <div
            className="rounded-[20px] border p-5 space-y-4"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Aksi Admin
            </h2>
            <UserActions
              userId={user.id}
              isBanned={isBanned}
              currentRole={roleName}
              roleOptions={roleOptions.map((r) => r.name)}
            />
          </div>

          <div
            className="rounded-[20px] border p-5 space-y-4"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Tambah / Kurangi Saldo
            </h2>
            <SaldoAdjustForm userId={user.id} balance={walletBalance} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs mb-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
        {label}
      </p>
      <p
        className={`text-sm font-medium break-all ${mono ? 'font-mono' : ''}`}
        style={{ color: 'hsl(var(--foreground))' }}
      >
        {value}
      </p>
    </div>
  )
}
