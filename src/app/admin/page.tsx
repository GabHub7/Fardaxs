import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'
import type { Order } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProducts: number
  homeProducts: number
  premiumProducts: number
  totalTransactions: number
  totalRevenue: number
  providerBalance: number
  providerName: string
  profitToday: number
  ordersToday: number
  totalServices: number
  serviceOrdersToday: number
  serviceRevenue: number
}

export interface SalesChartPoint {
  day: string
  orders: number
  revenue: number
}

export interface TopProduct {
  rank: number
  name: string
  count: number
  maxCount: number
}

export interface RecentOrder {
  id: string
  orderNumber: string
  product: string
  customer: string
  status: string
  amount: number
}

// ─── Fallback dummy data ──────────────────────────────────────────────────────

function getFallbackStats(): DashboardStats {
  return {
    totalProducts: 22,
    homeProducts: 1,
    premiumProducts: 21,
    totalTransactions: 25,
    totalRevenue: 1106000,
    providerBalance: 2103000,
    providerName: 'premku',
    profitToday: 256000,
    ordersToday: 22,
    totalServices: 1,
    serviceOrdersToday: 3,
    serviceRevenue: 2000,
  }
}

function getFallbackChart(): SalesChartPoint[] {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  return days.map((day, i) => ({
    day,
    orders: [4, 7, 3, 9, 6, 5, 8][i],
    revenue: [120000, 210000, 95000, 310000, 185000, 150000, 256000][i],
  }))
}

function getFallbackTopProducts(): TopProduct[] {
  return [
    { rank: 1, name: 'Home Slider Vol.4', count: 67, maxCount: 67 },
    { rank: 2, name: 'Premium Banner Pack', count: 45, maxCount: 67 },
    { rank: 3, name: 'Logo Design Kit', count: 31, maxCount: 67 },
    { rank: 4, name: 'UI Component Set', count: 24, maxCount: 67 },
    { rank: 5, name: 'Social Media Pack', count: 18, maxCount: 67 },
  ]
}

function getFallbackRecentOrders(): RecentOrder[] {
  return [
    { id: '1', orderNumber: 'FDX20240618001', product: 'Home Slider Vol.4', customer: 'Budi S.', status: 'SUCCESS', amount: 75000 },
    { id: '2', orderNumber: 'FDX20240618002', product: 'Premium Banner Pack', customer: 'Ani W.', status: 'PROCESSING', amount: 120000 },
    { id: '3', orderNumber: 'FDX20240618003', product: 'Logo Design Kit', customer: 'Rudi H.', status: 'PENDING_PAYMENT', amount: 95000 },
    { id: '4', orderNumber: 'FDX20240618004', product: 'UI Component Set', customer: 'Siti M.', status: 'SUCCESS', amount: 85000 },
    { id: '5', orderNumber: 'FDX20240618005', product: 'Social Media Pack', customer: 'Doni K.', status: 'FAILED', amount: 60000 },
  ]
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchDashboardData() {
  try {
    const supabase = createServiceClient()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    const sevenDaysISO = sevenDaysAgo.toISOString()

    // Parallel queries
    const [
      productsResult,
      ordersResult,
      ordersChartResult,
      providerResult,
    ] = await Promise.allSettled([
      supabase.from('products').select('id, status, category:categories(slug)').eq('status', 'ACTIVE'),
      supabase
        .from('orders')
        .select('id, order_number, price, profit, status, created_at, target, product:products(name, category:categories(slug))')
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('price, profit, status, created_at')
        .gte('created_at', sevenDaysISO)
        .in('status', ['SUCCESS', 'PAID']),
      supabase.from('providers').select('name, balance').order('balance', { ascending: false }).limit(1),
    ])

    // Social-media ("Jasa"/SMM) services are products in the `social-media`
    // category. A to-one Supabase relation can come back as an object or a
    // single-element array depending on typing, so normalise both.
    const SERVICE_CATEGORY_SLUG = 'social-media'
    type CategoryRel = { slug: string } | { slug: string }[] | null | undefined
    const catSlug = (c: CategoryRel) => (Array.isArray(c) ? c[0]?.slug : c?.slug)

    // Products stats
    type ProductRow = { id: string; status: string; category?: CategoryRel }
    const products =
      productsResult.status === 'fulfilled' && productsResult.value.data
        ? (productsResult.value.data as unknown as ProductRow[])
        : []
    const totalProducts = products.length
    const totalServices = products.filter((p) => catSlug(p.category) === SERVICE_CATEGORY_SLUG).length

    // Orders stats
    type OrderRow = Pick<Order, 'id' | 'price' | 'profit' | 'status' | 'created_at' | 'order_number' | 'target'> & {
      product?: { name: string; category?: CategoryRel } | null
    }
    const allOrders =
      ordersResult.status === 'fulfilled' && ordersResult.value.data
        ? (ordersResult.value.data as unknown as OrderRow[])
        : null

    let stats: DashboardStats = getFallbackStats()

    if (allOrders) {
      const successOrders = allOrders.filter((o) => o.status === 'SUCCESS' || o.status === 'PAID')
      const totalRevenue = successOrders.reduce((s, o) => s + (o.price ?? 0), 0)

      const todayOrders = allOrders.filter((o) => o.created_at >= todayISO)
      const todaySuccess = todayOrders.filter((o) => o.status === 'SUCCESS' || o.status === 'PAID')
      const profitToday = todaySuccess.reduce((s, o) => s + (o.profit ?? 0), 0)

      // Jasa (SMM / social-media) — derived from orders whose product is in the
      // `social-media` category, instead of hardcoded demo numbers.
      const serviceOrdersToday = todayOrders.filter(
        (o) => catSlug(o.product?.category) === SERVICE_CATEGORY_SLUG
      )
      const serviceRevenue = serviceOrdersToday
        .filter((o) => o.status === 'SUCCESS' || o.status === 'PAID')
        .reduce((s, o) => s + (o.price ?? 0), 0)

      const providerData =
        providerResult.status === 'fulfilled' && providerResult.value.data?.[0]
          ? providerResult.value.data[0]
          : null

      stats = {
        totalProducts: totalProducts || getFallbackStats().totalProducts,
        homeProducts: 1,
        premiumProducts: (totalProducts || 22) - 1,
        totalTransactions: allOrders.length,
        totalRevenue: totalRevenue || getFallbackStats().totalRevenue,
        providerBalance: providerData?.balance ?? getFallbackStats().providerBalance,
        providerName: providerData?.name ?? getFallbackStats().providerName,
        profitToday: profitToday || getFallbackStats().profitToday,
        ordersToday: todayOrders.length || getFallbackStats().ordersToday,
        totalServices,
        serviceOrdersToday: serviceOrdersToday.length,
        serviceRevenue,
      }
    }

    // Chart data
    let chartData: SalesChartPoint[] = getFallbackChart()
    const chartOrders =
      ordersChartResult.status === 'fulfilled' && ordersChartResult.value.data
        ? ordersChartResult.value.data
        : null

    if (chartOrders && chartOrders.length > 0) {
      const dayMap: Record<string, { orders: number; revenue: number }> = {}
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        dayMap[key] = { orders: 0, revenue: 0 }
      }

      for (const order of chartOrders) {
        const key = (order.created_at as string).slice(0, 10)
        if (dayMap[key]) {
          dayMap[key].orders += 1
          dayMap[key].revenue += order.price ?? 0
        }
      }

      chartData = Object.entries(dayMap).map(([dateStr, val]) => {
        const d = new Date(dateStr)
        return { day: dayNames[d.getDay()], ...val }
      })
    }

    // Top products
    let topProducts: TopProduct[] = getFallbackTopProducts()
    if (allOrders) {
      const productCounts: Record<string, { name: string; count: number }> = {}
      for (const order of allOrders) {
        if (order.status === 'SUCCESS' || order.status === 'PAID') {
          const name = order.product?.name ?? 'Unknown'
          if (!productCounts[name]) productCounts[name] = { name, count: 0 }
          productCounts[name].count++
        }
      }
      const sorted = Object.values(productCounts).sort((a, b) => b.count - a.count).slice(0, 5)
      if (sorted.length > 0) {
        const maxCount = sorted[0].count
        topProducts = sorted.map((p, i) => ({
          rank: i + 1,
          name: p.name,
          count: p.count,
          maxCount,
        }))
      }
    }

    // Recent orders
    let recentOrders: RecentOrder[] = getFallbackRecentOrders()
    if (allOrders) {
      recentOrders = allOrders.slice(0, 5).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        product: o.product?.name ?? 'Unknown',
        customer: o.target ?? '-',
        status: o.status,
        amount: o.price,
      }))
    }

    return { stats, chartData, topProducts, recentOrders }
  } catch {
    return {
      stats: getFallbackStats(),
      chartData: getFallbackChart(),
      topProducts: getFallbackTopProducts(),
      recentOrders: getFallbackRecentOrders(),
    }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const data = await fetchDashboardData()

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient {...data} />
    </Suspense>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl shimmer"
            style={{ height: '100px', background: 'hsl(var(--background-card))' }}
          />
        ))}
      </div>
      <div
        className="rounded-xl shimmer"
        style={{ height: '280px', background: 'hsl(var(--background-card))' }}
      />
    </div>
  )
}
