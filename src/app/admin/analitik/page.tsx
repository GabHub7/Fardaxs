import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import AnalitikClient from './analitik-client'

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function fetchAnalyticsData() {
  const supabase = createServiceClient()

  const now = new Date()
  const startOf30Days = new Date(now)
  startOf30Days.setDate(now.getDate() - 29)
  startOf30Days.setHours(0, 0, 0, 0)

  const [ordersRes, revenueRes, usersRes, topProductsRes] = await Promise.allSettled([
    // Orders per day (last 30 days)
    supabase
      .from('orders')
      .select('created_at, price, status')
      .gte('created_at', startOf30Days.toISOString())
      .order('created_at', { ascending: true }),

    // Total revenue (all time, SUCCESS orders)
    supabase
      .from('orders')
      .select('price')
      .eq('status', 'SUCCESS'),

    // New users last 30 days
    supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startOf30Days.toISOString()),

    // Top 5 products by order count
    supabase
      .from('orders')
      .select('product_id, products(name)')
      .eq('status', 'SUCCESS')
      .limit(500),
  ])

  const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data ?? []) : []
  const allRevenue = revenueRes.status === 'fulfilled' ? (revenueRes.value.data ?? []) : []
  const newUsers = usersRes.status === 'fulfilled' ? (usersRes.value.data ?? []) : []
  const topOrdersRaw = topProductsRes.status === 'fulfilled' ? (topProductsRes.value.data ?? []) : []

  // Build daily chart data
  const dailyMap = new Map<string, { revenue: number; orders: number }>()
  for (let d = 0; d < 30; d++) {
    const date = new Date(startOf30Days)
    date.setDate(startOf30Days.getDate() + d)
    const key = date.toISOString().slice(0, 10)
    dailyMap.set(key, { revenue: 0, orders: 0 })
  }

  for (const order of orders as { created_at: string; price: number; status: string }[]) {
    const key = order.created_at.slice(0, 10)
    const existing = dailyMap.get(key)
    if (existing) {
      existing.orders += 1
      if (order.status === 'SUCCESS') existing.revenue += order.price
    }
  }

  const chartData = Array.from(dailyMap.entries()).map(([date, vals]) => ({
    date: date.slice(5), // MM-DD
    revenue: vals.revenue,
    orders: vals.orders,
  }))

  // Top products
  const productCountMap = new Map<string, { name: string; count: number }>()
  for (const row of topOrdersRaw as unknown as { product_id: string; products: { name: string } | null }[]) {
    if (!row.product_id) continue
    const existing = productCountMap.get(row.product_id)
    if (existing) {
      existing.count++
    } else {
      productCountMap.set(row.product_id, { name: row.products?.name ?? 'Produk', count: 1 })
    }
  }

  const topProducts = Array.from(productCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const totalRevenue = (allRevenue as { price: number }[]).reduce((sum, r) => sum + r.price, 0)
  const totalOrdersMonth = (orders as { status: string }[]).length
  const successOrdersMonth = (orders as { status: string }[]).filter((o) => o.status === 'SUCCESS').length
  const revenueMonth = (orders as { price: number; status: string }[])
    .filter((o) => o.status === 'SUCCESS')
    .reduce((sum, o) => sum + o.price, 0)

  return {
    chartData,
    topProducts,
    totalRevenue,
    totalOrdersMonth,
    successOrdersMonth,
    revenueMonth,
    newUsersMonth: newUsers.length,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function AnalitikPage() {
  const data = await fetchAnalyticsData()

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Analitik
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Data performa toko 30 hari terakhir
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pendapatan', value: formatCurrency(data.totalRevenue), colorVar: '--primary' },
          { label: 'Pendapatan Bulan Ini', value: formatCurrency(data.revenueMonth), colorVar: '--success' },
          { label: 'Pesanan Bulan Ini', value: String(data.totalOrdersMonth), colorVar: '--warning' },
          { label: 'Pengguna Baru', value: String(data.newUsersMonth), colorVar: '--primary' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[20px] border p-4"
            style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
          >
            <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
              {stat.label}
            </p>
            <p className="text-xl font-bold" style={{ color: `hsl(var(${stat.colorVar}))` }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart + Top Products */}
      <AnalitikClient chartData={data.chartData} topProducts={data.topProducts} />
    </div>
  )
}
