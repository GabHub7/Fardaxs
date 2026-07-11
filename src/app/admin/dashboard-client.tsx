'use client'

import {
  Package,
  DollarSign,
  TrendingUp,
  Wallet,
  ShoppingCart,
  Briefcase,
  ArrowUpRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import type { DashboardStats, SalesChartPoint, TopProduct, RecentOrder } from './page'

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  trend?: string
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: 'hsl(var(--background-card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0 self-start"
        style={{ width: '40px', height: '40px', background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>

      {/* Value */}
      <div>
        <p
          className="font-bold leading-tight"
          style={{ color: 'hsl(var(--foreground))', fontSize: '22px' }}
        >
          {value}
        </p>
        <p
          className="font-medium mt-0.5"
          style={{ color: 'hsl(var(--foreground-muted))', fontSize: '12px' }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="mt-1 text-xs"
            style={{ color: 'hsl(var(--foreground-muted))', opacity: 0.7 }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Decorative corner */}
      <div
        className="absolute -right-3 -top-3 rounded-full opacity-10"
        style={{ width: '60px', height: '60px', background: iconColor }}
      />
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    SUCCESS: { label: 'Sukses', color: 'hsl(var(--success))', bg: 'hsl(var(--success) / 0.12)' },
    PAID: { label: 'Dibayar', color: 'hsl(var(--success))', bg: 'hsl(var(--success) / 0.12)' },
    PROCESSING: { label: 'Proses', color: 'hsl(var(--primary))', bg: 'hsl(var(--primary) / 0.12)' },
    PENDING_PAYMENT: { label: 'Menunggu', color: 'hsl(var(--warning))', bg: 'hsl(var(--warning) / 0.12)' },
    FAILED: { label: 'Gagal', color: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.12)' },
    REFUNDED: { label: 'Refund', color: 'hsl(var(--warning))', bg: 'hsl(var(--warning) / 0.12)' },
    EXPIRED: { label: 'Kedaluwarsa', color: 'hsl(var(--foreground-muted))', bg: 'hsl(var(--background-muted))' },
    CANCELLED: { label: 'Dibatalkan', color: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.12)' },
  }
  const s = map[status] ?? { label: status, color: 'hsl(var(--foreground-muted))', bg: 'hsl(var(--background-muted))' }

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: 'hsl(var(--background-card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: 'var(--card-shadow-hover)',
        color: 'hsl(var(--foreground))',
      }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.dataKey === 'revenue' ? 'hsl(var(--primary))' : 'hsl(var(--success))' }}>
          {p.dataKey === 'revenue'
            ? `Pendapatan: ${formatCurrency(p.value)}`
            : `Order: ${p.value}`}
        </p>
      ))}
    </div>
  )
}

// ─── Main Dashboard Client ────────────────────────────────────────────────────

interface DashboardClientProps {
  stats: DashboardStats
  chartData: SalesChartPoint[]
  topProducts: TopProduct[]
  recentOrders: RecentOrder[]
}

export function DashboardClient({
  stats,
  chartData,
  topProducts,
  recentOrders,
}: DashboardClientProps) {
  // Stat cards config
  const statCards: StatCardProps[] = [
    {
      title: 'Total Produk',
      value: String(stats.totalProducts),
      subtitle: `${stats.homeProducts} home • ${stats.premiumProducts} premium`,
      icon: Package,
      iconColor: 'hsl(var(--primary))',
      iconBg: 'hsl(var(--primary) / 0.15)',
    },
    {
      title: 'Total Transaksi',
      value: String(stats.totalTransactions),
      icon: DollarSign,
      iconColor: 'hsl(var(--warning))',
      iconBg: 'hsl(var(--warning) / 0.15)',
    },
    {
      title: 'Total Pendapatan',
      value: formatCurrencyShort(stats.totalRevenue),
      icon: TrendingUp,
      iconColor: 'hsl(var(--success))',
      iconBg: 'hsl(var(--success) / 0.15)',
    },
    {
      title: 'Saldo Provider',
      value: formatCurrencyShort(stats.providerBalance),
      subtitle: stats.providerName,
      icon: Wallet,
      iconColor: 'hsl(270 80% 65%)',
      iconBg: 'hsl(270 80% 65% / 0.15)',
    },
    {
      title: 'Profit Hari Ini',
      value: formatCurrencyShort(stats.profitToday),
      icon: TrendingUp,
      iconColor: 'hsl(var(--success))',
      iconBg: 'hsl(var(--success) / 0.15)',
    },
    {
      title: 'Order Hari Ini',
      value: String(stats.ordersToday),
      icon: ShoppingCart,
      iconColor: 'hsl(var(--warning))',
      iconBg: 'hsl(var(--warning) / 0.15)',
    },
    {
      title: 'Total Jasa',
      value: String(stats.totalServices),
      subtitle: `${stats.serviceOrdersToday} pesanan hari ini`,
      icon: Briefcase,
      iconColor: 'hsl(var(--primary))',
      iconBg: 'hsl(var(--primary) / 0.15)',
    },
    {
      title: 'Pesanan Jasa',
      value: String(stats.serviceOrdersToday),
      subtitle: `${formatCurrencyShort(stats.serviceRevenue)} pendapatan`,
      icon: Package,
      iconColor: 'hsl(var(--success))',
      iconBg: 'hsl(var(--success) / 0.15)',
    },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* ── Sales Chart — full width ── */}
      <div
        className="rounded-xl p-5"
        style={{
          background: 'hsl(var(--background-card))',
          border: '1px solid hsl(var(--border))',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2
              className="font-semibold"
              style={{ color: 'hsl(var(--foreground))', fontSize: '15px' }}
            >
              Grafik Penjualan
            </h2>
            <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '12px' }}>
              Pendapatan &amp; order 7 hari terakhir
            </p>
          </div>
          <div
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap"
            style={{
              background: 'hsl(var(--background-muted))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground-muted))',
            }}
          >
            7 hari terakhir
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(222 30% 14%)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(215 16% 55%)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(215 16% 55%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}jt`
                if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`
                return String(v)
              }}
              width={42}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(217 91% 60%)', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'hsl(217 91% 60%)', stroke: 'hsl(222 47% 8%)', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="orders"
              stroke="hsl(142 71% 45%)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: 'hsl(142 71% 45%)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'hsl(142 71% 45%)', stroke: 'hsl(222 47% 8%)', strokeWidth: 2 }}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: 'hsl(217 91% 60%)' }} />
            <span style={{ color: 'hsl(var(--foreground-muted))', fontSize: '11px' }}>Pendapatan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: 'hsl(142 71% 45%)' }} />
            <span style={{ color: 'hsl(var(--foreground-muted))', fontSize: '11px' }}>Order</span>
          </div>
        </div>
      </div>

      {/* ── Secondary Charts: Visitor Activity & Top Products ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visitor Activity */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'hsl(var(--background-card))',
            border: '1px solid hsl(var(--border))',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="mb-5">
            <h2
              className="font-semibold"
              style={{ color: 'hsl(var(--foreground))', fontSize: '15px' }}
            >
              Aktivitas Pengunjung
            </h2>
            <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '12px' }}>
              Berdasarkan transaksi 7 hari
            </p>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: 'hsl(var(--foreground-muted))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--foreground-muted))', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background-card))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'hsl(var(--background-card))',
            border: '1px solid hsl(var(--border))',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2
                className="font-semibold"
                style={{ color: 'hsl(var(--foreground))', fontSize: '15px' }}
              >
                Produk Terlaris
              </h2>
              <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '12px' }}>
                Berdasarkan total order
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {topProducts.map((product) => {
              const pct = Math.round((product.count / product.maxCount) * 100)
              return (
                <div key={product.rank} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex-shrink-0 flex items-center justify-center rounded-md font-bold"
                        style={{
                          width: '22px',
                          height: '22px',
                          background:
                            product.rank === 1
                              ? 'hsl(var(--primary) / 0.2)'
                              : 'hsl(var(--background-muted))',
                          color:
                            product.rank === 1
                              ? 'hsl(var(--primary))'
                              : 'hsl(var(--foreground-muted))',
                          fontSize: '11px',
                        }}
                      >
                        {product.rank}
                      </span>
                      <span
                        className="truncate text-sm font-medium"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {product.name}
                      </span>
                    </div>
                    <span
                      className="flex-shrink-0 text-xs font-semibold"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      {product.count}x
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'hsl(var(--background-muted))' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background:
                          product.rank === 1
                            ? 'hsl(var(--primary))'
                            : 'hsl(var(--primary) / 0.5)',
                        transition: 'width 600ms ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Recent Orders Table ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'hsl(var(--background-card))',
          border: '1px solid hsl(var(--border))',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          <div>
            <h2
              className="font-semibold"
              style={{ color: 'hsl(var(--foreground))', fontSize: '15px' }}
            >
              Order Terbaru
            </h2>
            <p style={{ color: 'hsl(var(--foreground-muted))', fontSize: '12px' }}>
              5 transaksi terakhir
            </p>
          </div>
          <a
            href="/admin/pesanan"
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'hsl(var(--primary))', textDecoration: 'none' }}
          >
            Lihat semua <ArrowUpRight size={12} />
          </a>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                {['Order #', 'Produk', 'Customer', 'Status', 'Jumlah'].map((col) => (
                  <th
                    key={col}
                    className="text-left px-5 py-3 font-semibold"
                    style={{ color: 'hsl(var(--foreground-muted))', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, idx) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom:
                      idx < recentOrders.length - 1
                        ? '1px solid hsl(var(--border-subtle))'
                        : 'none',
                  }}
                  className="transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'hsl(var(--background-muted))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <td className="px-5 py-3">
                    <span
                      className="font-mono text-xs"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      {order.orderNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="font-medium"
                      style={{ color: 'hsl(var(--foreground))', fontSize: '13px' }}
                    >
                      {order.product}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span style={{ color: 'hsl(var(--foreground-muted))', fontSize: '13px' }}>
                      {order.customer}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="font-semibold"
                      style={{ color: 'hsl(var(--foreground))', fontSize: '13px' }}
                    >
                      {formatCurrency(order.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}jt`
  }
  if (amount >= 1_000) {
    return `Rp${Math.round(amount / 1_000).toLocaleString('id-ID')}`
  }
  return `Rp${amount}`
}
