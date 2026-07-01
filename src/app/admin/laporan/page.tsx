import { createServiceClient } from '@/lib/supabase/server'
import { LaporanClient, type ReportRow } from './laporan-client'

export const dynamic = 'force-dynamic'

async function fetchReportRows(): Promise<ReportRow[]> {
  // Build an empty 90-day skeleton (oldest → newest) so days with no orders
  // still appear in the table.
  const map: Record<string, ReportRow> = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    map[key] = { date: key, orders: 0, revenue: 0, profit: 0, refunds: 0 }
  }

  try {
    const supabase = createServiceClient()
    const since = new Date(today)
    since.setDate(since.getDate() - 89)

    const { data } = await supabase
      .from('orders')
      .select('price, profit, status, created_at')
      .gte('created_at', since.toISOString())

    for (const o of (data ?? []) as { price: number; profit: number; status: string; created_at: string }[]) {
      const key = o.created_at.slice(0, 10)
      const row = map[key]
      if (!row) continue
      if (o.status === 'SUCCESS' || o.status === 'PAID') {
        row.orders += 1
        row.revenue += o.price ?? 0
        row.profit += o.profit ?? 0
      } else if (o.status === 'REFUNDED') {
        row.refunds += 1
      }
    }
  } catch {
    // On failure, return the empty skeleton (the client shows "no data").
  }

  return Object.values(map)
}

export default async function LaporanPage() {
  const rows = await fetchReportRows()
  return <LaporanClient allRows={rows} />
}
