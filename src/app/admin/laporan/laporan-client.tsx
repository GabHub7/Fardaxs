'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface ReportRow {
  date: string
  orders: number
  revenue: number
  profit: number
  refunds: number
}

type ReportPeriod = '7d' | '30d' | '90d'
type ReportType = 'revenue' | 'orders' | 'products' | 'payment_methods'

export function LaporanClient({ allRows }: { allRows: ReportRow[] }) {
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const [reportType, setReportType] = useState<ReportType>('revenue')
  const [exporting, setExporting] = useState(false)

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  // allRows is sorted ascending by date; take the last `days` entries.
  const rows = useMemo(() => allRows.slice(-days), [allRows, days])

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0)
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0)
  const totalRefunds = rows.reduce((s, r) => s + r.refunds, 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const topDays = [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const hasData = rows.some((r) => r.orders > 0 || r.revenue > 0)

  async function handleExport(format: 'csv' | 'json') {
    setExporting(true)
    await new Promise((r) => setTimeout(r, 400))

    if (format === 'csv') {
      const header = 'Tanggal,Pesanan,Pendapatan,Profit,Refund\n'
      const body = rows.map((r) => `${r.date},${r.orders},${r.revenue},${r.profit},${r.refunds}`).join('\n')
      downloadBlob(header + body, `laporan-${period}.csv`, 'text/csv')
    } else {
      downloadBlob(JSON.stringify(rows, null, 2), `laporan-${period}.json`, 'application/json')
    }
    setExporting(false)
  }

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Laporan</h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Analisis pendapatan &amp; performa toko (data real)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-3 py-1.5 rounded-[12px] text-xs font-medium press-effect hover-fade disabled:opacity-60"
            style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
          >
            {exporting ? 'Mengekspor...' : '↓ CSV'}
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="px-3 py-1.5 rounded-[12px] text-xs font-medium press-effect hover-fade disabled:opacity-60"
            style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
          >
            {exporting ? '...' : '↓ JSON'}
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="rounded-[20px] border p-4" style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground-muted))' }}>Periode:</span>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1 rounded-[10px] text-xs font-medium transition-all press-effect"
                style={{
                  background: period === p ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))',
                  color: period === p ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground-muted))',
                }}
              >
                {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : '90 Hari'}
              </button>
            ))}
          </div>

          <span className="text-xs ml-auto" style={{ color: 'hsl(var(--foreground-muted))' }}>Jenis Laporan:</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="px-2 py-1 rounded-[10px] text-xs border"
            style={{ background: 'hsl(var(--background-muted))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            <option value="revenue">Pendapatan</option>
            <option value="orders">Pesanan</option>
            <option value="products">Produk</option>
            <option value="payment_methods">Metode Bayar</option>
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Pendapatan', value: formatCurrency(totalRevenue), color: 'hsl(var(--primary))' },
          { label: 'Total Profit', value: formatCurrency(totalProfit), color: 'hsl(var(--success))' },
          { label: 'Total Pesanan', value: totalOrders.toLocaleString('id-ID'), color: 'hsl(var(--foreground))' },
          { label: 'Rata-rata per Pesanan', value: formatCurrency(avgOrderValue), color: 'hsl(var(--foreground))' },
          { label: 'Total Refund', value: totalRefunds.toString(), color: 'hsl(var(--destructive))' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[16px] border p-4" style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs mb-1" style={{ color: 'hsl(var(--foreground-muted))' }}>{stat.label}</p>
            <p className="text-base font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {!hasData && (
        <div className="rounded-[16px] border p-8 text-center text-sm" style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground-muted))' }}>
          Belum ada transaksi pada periode ini.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main table */}
        <div className="lg:col-span-2 rounded-[20px] border overflow-hidden" style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}>
          <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Detail Harian</h2>
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: 'hsl(var(--background-card))' }}>
                <tr style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                  {['Tanggal', 'Pesanan', 'Pendapatan', 'Profit', 'Refund'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'hsl(var(--foreground-muted))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice().reverse().map((row, i) => (
                  <tr key={row.date} style={{ borderBottom: i < rows.length - 1 ? '1px solid hsl(var(--border-subtle))' : 'none' }}>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--foreground))' }}>{formatDate(row.date)}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--foreground))' }}>{row.orders}</td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--success))' }}>{formatCurrency(row.profit)}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: row.refunds > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--foreground-muted))' }}>{row.refunds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-5">
          <div className="rounded-[20px] border p-5" style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Hari Terbaik</h2>
            <div className="space-y-3">
              {topDays.filter((d) => d.revenue > 0).length === 0 ? (
                <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>Belum ada data.</p>
              ) : (
                topDays.map((d, i) => {
                  const pct = topDays[0].revenue > 0 ? Math.round((d.revenue / topDays[0].revenue) * 100) : 0
                  return (
                    <div key={d.date}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>#{i + 1} {formatDate(d.date)}</span>
                        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(d.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--background-muted))' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'hsl(var(--primary))' }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-[20px] border p-5" style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Ringkasan Margin</h2>
            <div className="space-y-3">
              {[
                { label: 'Margin Profit', value: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%', color: 'hsl(var(--success))' },
                { label: 'Hari Tertinggi', value: formatCurrency(rows.length ? Math.max(...rows.map((r) => r.revenue)) : 0), color: 'hsl(var(--primary))' },
                { label: 'Hari Terendah', value: formatCurrency(rows.length ? Math.min(...rows.map((r) => r.revenue)) : 0), color: 'hsl(var(--foreground-muted))' },
                { label: 'Rata-rata/Hari', value: formatCurrency(rows.length ? totalRevenue / rows.length : 0), color: 'hsl(var(--foreground))' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>{item.label}</span>
                  <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
