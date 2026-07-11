import { createServiceClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils'

interface NotifRow {
  id: string
  user_id: string
  title: string
  message: string
  channel: string
  status: string
  read_at: string | null
  created_at: string
  users: { email: string; full_name: string | null } | null
}

interface SearchParams {
  channel?: string
  status?: string
  page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

const PAGE_SIZE = 25

export const dynamic = 'force-dynamic'

export default async function NotifikasiPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const channel = sp.channel ?? ''
  const status = sp.status ?? ''
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = createServiceClient()

  let query = supabase
    .from('notifications')
    .select('id, user_id, title, message, channel, status, read_at, created_at, users(email, full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (channel) query = query.eq('channel', channel)
  if (status) query = query.eq('status', status)

  const { data, count } = await query
  const rows = (data ?? []) as unknown as NotifRow[]
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Notifikasi
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          {(count ?? 0).toLocaleString('id-ID')} total notifikasi terkirim
        </p>
      </div>

      {/* Filters */}
      <div
        className="rounded-[20px] border p-4 flex flex-wrap gap-3"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        {(['', 'SYSTEM', 'EMAIL', 'WHATSAPP', 'PUSH'] as const).map((c) => {
          const label = c === '' ? 'Semua' : c
          const active = channel === c
          return (
            <a
              key={c}
              href={`?channel=${c}&status=${status}`}
              className="px-3 py-1 rounded-[10px] text-xs font-medium"
              style={{
                background: active ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))',
                color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground-muted))',
              }}
            >
              {label}
            </a>
          )
        })}
        <div className="ml-auto flex gap-2">
          {(['', 'SENT', 'FAILED', 'PENDING'] as const).map((s) => {
            const label = s === '' ? 'Semua Status' : s
            const active = status === s
            return (
              <a
                key={s}
                href={`?channel=${channel}&status=${s}`}
                className="px-3 py-1 rounded-[10px] text-xs font-medium"
                style={{
                  background: active ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))',
                  color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground-muted))',
                }}
              >
                {label}
              </a>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                {['Pengguna', 'Judul', 'Channel', 'Status', 'Dibuat'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold"
                    style={{ color: 'hsl(var(--foreground-muted))' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    Tidak ada notifikasi ditemukan.
                  </td>
                </tr>
              ) : rows.map((n, i) => (
                <tr
                  key={n.id}
                  style={{ borderBottom: i < rows.length - 1 ? '1px solid hsl(var(--border-subtle))' : 'none' }}
                >
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                      {n.users?.full_name ?? '—'}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      {n.users?.email ?? n.user_id.slice(0, 8) + '…'}
                    </p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                      {n.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      {n.message}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <ChannelBadge channel={n.channel} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={n.status} />
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    {formatDateTime(n.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-xs border-t"
            style={{ borderColor: 'hsl(var(--border-subtle))', color: 'hsl(var(--foreground-muted))' }}
          >
            <span>Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`?channel=${channel}&status=${status}&page=${page - 1}`}
                  className="px-3 py-1 rounded-[8px]"
                  style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))' }}
                >
                  ← Sebelumnya
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`?channel=${channel}&status=${status}&page=${page + 1}`}
                  className="px-3 py-1 rounded-[8px]"
                  style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))' }}
                >
                  Berikutnya →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    SYSTEM: { bg: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' },
    EMAIL: { bg: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' },
    WHATSAPP: { bg: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' },
    PUSH: { bg: 'hsl(var(--foreground) / 0.1)', color: 'hsl(var(--foreground-muted))' },
  }
  const s = map[channel] ?? { bg: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {channel}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    SENT: { bg: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' },
    FAILED: { bg: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' },
    PENDING: { bg: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' },
  }
  const s = map[status] ?? { bg: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}
