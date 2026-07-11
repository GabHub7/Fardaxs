import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate, getStatusLabel, getStatusColor, getInitials, sanitizeSearchTerm } from '@/lib/utils'
import type { UserStatus } from '@/types'
import { BanToggleButton } from './ban-toggle-button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  email: string
  full_name: string | null
  email_verified: boolean
  status: UserStatus
  created_at: string
  roles: { name: string }[] | { name: string } | null
}

interface RoleOption {
  id: string
  name: string
}

interface PageProps {
  searchParams: Promise<{
    search?: string
    role?: string
    status?: string
    page?: string
  }>
}

const LIMIT = 25

const USER_STATUSES: { label: string; value: string }[] = [
  { label: 'Semua Status', value: '' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Banned', value: 'BANNED' },
  { label: 'Disuspend', value: 'SUSPENDED' },
  { label: 'Tidak Aktif', value: 'INACTIVE' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function PenggunaPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search ?? ''
  const roleFilter = params.role ?? ''
  const statusFilter = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * LIMIT

  const supabase = createServiceClient()

  // Fetch roles for filter dropdown
  const { data: rolesData } = await supabase
    .from('roles')
    .select('id, name')
    .order('name')

  const roleOptions = (rolesData as RoleOption[]) ?? []

  // Build user query
  let query = supabase
    .from('users')
    .select('id, email, full_name, email_verified, status, created_at, roles(name)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + LIMIT - 1)

  if (search) {
    const safeSearch = sanitizeSearchTerm(search)
    if (safeSearch) query = query.or(`email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter as UserStatus)
  }
  if (roleFilter) {
    // Filter by role name via join
    query = query.eq('roles.name', roleFilter)
  }

  const { data: users, count, error } = await query
  const rows = (users as unknown as UserRow[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / LIMIT)

  const buildPageHref = (targetPage: number) => {
    const qp = new URLSearchParams()
    if (search) qp.set('search', search)
    if (roleFilter) qp.set('role', roleFilter)
    if (statusFilter) qp.set('status', statusFilter)
    qp.set('page', String(targetPage))
    return `/admin/pengguna?${qp.toString()}`
  }

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Pengguna
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {count ?? 0} total pengguna terdaftar
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <form
        method="GET"
        action="/admin/pengguna"
        className="rounded-[20px] border p-4 flex flex-wrap gap-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <input
          name="search"
          type="text"
          defaultValue={search}
          placeholder="Cari email atau nama pengguna..."
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        />

        <select
          name="role"
          defaultValue={roleFilter}
          className="px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          <option value="">Semua Role</option>
          {roleOptions.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={statusFilter}
          className="px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          {USER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="px-4 py-2 rounded-[12px] text-sm font-medium"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground, 0 0% 100%))',
          }}
        >
          Filter
        </button>

        {(search || roleFilter || statusFilter) && (
          <Link
            href="/admin/pengguna"
            className="px-4 py-2 rounded-[12px] text-sm font-medium"
            style={{
              background: 'hsl(var(--background-muted))',
              color: 'hsl(var(--foreground-muted))',
            }}
          >
            Reset
          </Link>
        )}
      </form>

      {/* List */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        {error ? (
          <div className="p-8 text-center text-sm" style={{ color: 'hsl(var(--destructive))' }}>
            Gagal memuat data: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Tidak ada pengguna ditemukan.
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards — avoids the cramped, edge-to-edge table
                on small screens where "Lihat"/"Ban" used to butt up against
                the container border and needed horizontal scrolling. */}
            <div className="md:hidden divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {rows.map((user) => {
                const roleRelation = user.roles
                const roleRecord = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation
                const roleName = roleRecord?.name ?? 'MEMBER'
                const isBanned = user.status === 'BANNED' || user.status === 'SUSPENDED'
                return (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
                      >
                        {getInitials(user.full_name ?? user.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                          {user.full_name ?? '-'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: roleName === 'SUPER_ADMIN' ? 'hsl(var(--primary) / 0.15)' : roleName === 'ADMIN' ? 'hsl(var(--warning) / 0.15)' : 'hsl(var(--background-muted))',
                          color: roleName === 'SUPER_ADMIN' ? 'hsl(var(--primary))' : roleName === 'ADMIN' ? 'hsl(var(--warning))' : 'hsl(var(--foreground-muted))',
                        }}
                      >
                        {roleName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(user.status)}`}>
                        {getStatusLabel(user.status)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: user.email_verified ? 'hsl(var(--success) / 0.12)' : 'hsl(var(--destructive) / 0.1)',
                          color: user.email_verified ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
                        }}
                      >
                        {user.email_verified ? 'Terverifikasi' : 'Belum Verifikasi'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      Bergabung {formatDate(user.created_at)}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/admin/pengguna/${user.id}`}
                        className="flex-1 text-center px-3 py-1.5 rounded-[12px] text-xs font-medium"
                        style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                      >
                        Lihat
                      </Link>
                      <div className="flex-1">
                        <BanToggleButton userId={user.id} isBanned={isBanned} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Pengguna', 'Role', 'Status', 'Email Verified', 'Bergabung', 'Aksi'].map((col) => (
                    <th
                      key={col}
                      className={`px-4 py-3 text-left text-xs font-semibold whitespace-nowrap ${col === 'Aksi' ? 'pr-6' : ''}`}
                      style={{ color: 'hsl(var(--foreground-muted))' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const statusColor = getStatusColor(user.status)
                  const roleRelation = user.roles
                  const roleRecord = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation
                  const roleName = roleRecord?.name ?? 'MEMBER'
                  const isBanned = user.status === 'BANNED' || user.status === 'SUSPENDED'

                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      className="hover:bg-[hsl(var(--background-muted))] transition-colors"
                    >
                      {/* Avatar + Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: 'hsl(var(--primary) / 0.15)',
                              color: 'hsl(var(--primary))',
                            }}
                          >
                            {getInitials(user.full_name ?? user.email)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-medium truncate"
                              style={{ color: 'hsl(var(--foreground))' }}
                            >
                              {user.full_name ?? '-'}
                            </p>
                            <p
                              className="text-xs truncate"
                              style={{ color: 'hsl(var(--foreground-muted))' }}
                            >
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background:
                              roleName === 'SUPER_ADMIN'
                                ? 'hsl(var(--primary) / 0.15)'
                                : roleName === 'ADMIN'
                                  ? 'hsl(var(--warning) / 0.15)'
                                  : 'hsl(var(--background-muted))',
                            color:
                              roleName === 'SUPER_ADMIN'
                                ? 'hsl(var(--primary))'
                                : roleName === 'ADMIN'
                                  ? 'hsl(var(--warning))'
                                  : 'hsl(var(--foreground-muted))',
                          }}
                        >
                          {roleName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </td>

                      {/* Email Verified */}
                      <td className="px-4 py-3">
                        {user.email_verified ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: 'hsl(var(--success) / 0.12)',
                              color: 'hsl(var(--success))',
                            }}
                          >
                            Terverifikasi
                          </span>
                        ) : (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: 'hsl(var(--destructive) / 0.1)',
                              color: 'hsl(var(--destructive))',
                            }}
                          >
                            Belum
                          </span>
                        )}
                      </td>

                      {/* Join Date */}
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {formatDate(user.created_at)}
                      </td>

                      {/* Actions — pr-6 (not px-4) keeps these off the card's
                          right edge/border; whitespace-nowrap + flex-wrap
                          stop them crowding at narrower desktop widths. */}
                      <td className="pl-4 pr-6 py-3">
                        <div className="flex items-center flex-wrap gap-2">
                          <Link
                            href={`/admin/pengguna/${user.id}`}
                            className="px-3 py-1.5 rounded-[12px] text-xs font-medium whitespace-nowrap"
                            style={{
                              background: 'hsl(var(--background-muted))',
                              color: 'hsl(var(--foreground))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          >
                            Lihat
                          </Link>
                          <BanToggleButton userId={user.id} isBanned={isBanned} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildPageHref(page - 1)}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                style={{
                  background: 'hsl(var(--background-card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildPageHref(page + 1)}
                className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground, 0 0% 100%))',
                }}
              >
                Berikutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
