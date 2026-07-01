import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  ip_address: string | null
  created_at: string
  users: { email: string; full_name: string | null } | null
}

interface PageProps {
  searchParams: Promise<{
    action?: string
    resource_type?: string
    page?: string
  }>
}

const LIMIT = 50

const ACTION_BADGE_STYLES: Record<string, string> = {
  ORDER_CREATED: 'text-blue-500 bg-blue-500/10',
  PAYMENT_RECEIVED: 'text-green-500 bg-green-500/10',
  ORDER_CANCELLED: 'text-red-500 bg-red-500/10',
  LOGIN: 'text-gray-500 bg-gray-500/10',
}

function getActionBadgeClass(action: string): string {
  return ACTION_BADGE_STYLES[action] ?? 'text-gray-400 bg-gray-400/10'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function AuditPage({ searchParams }: PageProps) {
  const params = await searchParams
  const actionFilter = params.action ?? ''
  const resourceTypeFilter = params.resource_type ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * LIMIT

  const supabase = createServiceClient()

  let query = supabase
    .from('audit_logs')
    .select(
      'id, action, resource_type, resource_id, ip_address, created_at, users(email, full_name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + LIMIT - 1)

  if (actionFilter) {
    query = query.eq('action', actionFilter)
  }
  if (resourceTypeFilter) {
    query = query.eq('resource_type', resourceTypeFilter)
  }

  const { data: logs, count, error } = await query
  const rows = (logs as unknown as AuditLogRow[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / LIMIT)

  // Collect unique actions for filter dropdown
  const { data: actionOptions } = await supabase
    .from('audit_logs')
    .select('action')
    .order('action')

  const uniqueActions = [
    ...new Set(((actionOptions ?? []) as { action: string }[]).map((r) => r.action)),
  ]

  // Collect unique resource types for filter dropdown
  const { data: resourceTypeOptions } = await supabase
    .from('audit_logs')
    .select('resource_type')
    .order('resource_type')

  const uniqueResourceTypes = [
    ...new Set(
      ((resourceTypeOptions ?? []) as { resource_type: string }[]).map((r) => r.resource_type)
    ),
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Audit Log
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            {count ?? 0} entri ditemukan
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <form
        method="GET"
        action="/admin/audit"
        className="rounded-[20px] border p-4 flex flex-wrap gap-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <select
          name="action"
          defaultValue={actionFilter}
          className="px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          <option value="">Semua Aksi</option>
          {uniqueActions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>

        <select
          name="resource_type"
          defaultValue={resourceTypeFilter}
          className="px-3 py-2 text-sm rounded-[12px] border outline-none"
          style={{
            background: 'hsl(var(--background-muted))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          <option value="">Semua Tipe Resource</option>
          {uniqueResourceTypes.map((rt) => (
            <option key={rt} value={rt}>
              {rt}
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

        {(actionFilter || resourceTypeFilter) && (
          <Link
            href="/admin/audit"
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

      {/* Table */}
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
            Tidak ada log audit ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Waktu', 'Pengguna', 'Aksi', 'Tipe Resource', 'Resource ID', 'IP Address'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((log, i) => {
                  const badgeClass = getActionBadgeClass(log.action)
                  return (
                    <tr
                      key={log.id}
                      className="hover:opacity-80 transition-opacity"
                      style={{
                        borderBottom:
                          i < rows.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {log.users ? (
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                              {log.users.full_name ?? log.users.email}
                            </p>
                            <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                              {log.users.email}
                            </p>
                          </div>
                        ) : (
                          <span
                            className="text-xs italic"
                            style={{ color: 'hsl(var(--foreground-muted))' }}
                          >
                            Sistem
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {log.resource_type}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {log.resource_id ? `${log.resource_id.slice(0, 8)}…` : '—'}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'hsl(var(--foreground-muted))' }}
                      >
                        {log.ip_address ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
                href={`/admin/audit?action=${actionFilter}&resource_type=${resourceTypeFilter}&page=${page - 1}`}
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
                href={`/admin/audit?action=${actionFilter}&resource_type=${resourceTypeFilter}&page=${page + 1}`}
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
