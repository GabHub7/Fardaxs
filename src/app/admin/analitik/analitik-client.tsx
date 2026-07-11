'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ChartPoint {
  date: string
  revenue: number
  orders: number
}

interface TopProduct {
  name: string
  count: number
}

interface Props {
  chartData: ChartPoint[]
  topProducts: TopProduct[]
}

export default function AnalitikClient({ chartData, topProducts }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Revenue Chart */}
      <div
        className="lg:col-span-2 rounded-[20px] border p-5"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Pendapatan & Pesanan (30 Hari)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground-muted))' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground-muted))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v)
              }
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground-muted))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background-card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value, name) => [
                name === 'revenue' ? formatCurrency(value as number) : value,
                name === 'revenue' ? 'Pendapatan' : 'Pesanan',
              ]}
            />
            <Legend
              formatter={(value) => (value === 'revenue' ? 'Pendapatan' : 'Pesanan')}
              wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--foreground-muted))' }}
            />
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
            <Line
              yAxisId="orders"
              type="monotone"
              dataKey="orders"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--success))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div
        className="rounded-[20px] border p-5"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Produk Terlaris
        </h2>
        {topProducts.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Belum ada data pesanan
          </p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, i) => {
              const maxCount = topProducts[0]?.count ?? 1
              const pct = Math.round((product.count / maxCount) * 100)
              return (
                <div key={product.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-medium truncate flex-1 mr-2"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      <span style={{ color: 'hsl(var(--foreground-muted))' }}>{i + 1}. </span>
                      {product.name}
                    </span>
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: 'hsl(var(--primary))' }}>
                      {product.count}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'hsl(var(--background-muted))' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: 'hsl(var(--primary))' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Mini bar chart */}
        {topProducts.length > 0 && (
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart
                data={topProducts.map((p) => ({ name: p.name.slice(0, 12), count: p.count }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--foreground-muted))' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--background-card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
