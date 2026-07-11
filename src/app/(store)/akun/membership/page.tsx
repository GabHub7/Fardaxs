import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Crown, Check, TrendingUp } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { formatCurrency } from '@/lib/utils'
import { getCurrentUserProfile } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Membership' }
export const dynamic = 'force-dynamic'

interface Tier {
  id: string
  name: string
  slug: string
  min_spend: number
  cashback_percent: number
  badge_color: string
  sort_order: number
}

export default async function MembershipPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun/membership')

  const { profile, serviceClient } = session

  // All tiers (public reference data) + the user's cumulative paid spend.
  const [{ data: tiersData }, { data: paidOrders }] = await Promise.all([
    serviceClient
      .from('membership_tiers')
      .select('id, name, slug, min_spend, cashback_percent, badge_color, sort_order')
      .order('sort_order', { ascending: true }),
    serviceClient
      .from('orders')
      .select('price')
      .eq('user_id', profile.id)
      .in('status', ['SUCCESS', 'PAID']),
  ])

  const tiers = (tiersData ?? []) as Tier[]
  const totalSpend = (paidOrders ?? []).reduce(
    (sum, o) => sum + ((o as { price: number }).price ?? 0),
    0
  )

  // Determine current tier from spend (highest tier whose threshold is met).
  const currentTier =
    [...tiers].reverse().find((t) => totalSpend >= t.min_spend) ?? tiers[0] ?? null
  const currentIndex = currentTier ? tiers.findIndex((t) => t.id === currentTier.id) : -1
  const nextTier = currentIndex >= 0 && currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null

  const progressPct = nextTier
    ? Math.min(
        100,
        Math.round(
          ((totalSpend - (currentTier?.min_spend ?? 0)) /
            (nextTier.min_spend - (currentTier?.min_spend ?? 0))) *
            100
        )
      )
    : 100
  const remaining = nextTier ? Math.max(0, nextTier.min_spend - totalSpend) : 0

  return (
    <div className="min-h-screen" style={{ background: MOCK.bg }}>
      <header
        className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3"
        style={{ background: MOCK.bg, borderBottom: `1px solid ${MOCK.borderSubtle}` }}
      >
        <Link
          href="/akun"
          className="flex items-center justify-center w-10 h-10 rounded-full press-effect hover-fade"
          style={{ background: MOCK.bgCard }}
        >
          <ArrowLeft size={18} style={{ color: MOCK.foreground }} />
        </Link>
        <h1 className="text-base font-bold" style={{ color: MOCK.foreground }}>Membership</h1>
      </header>

      <div className="px-4 py-5 space-y-5 animate-fade-in-up">
        {/* Current tier hero card */}
        <div
          className="rounded-[22px] p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${currentTier?.badge_color ?? MOCK.primary}, #1e1b4b)`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Crown size={20} className="text-white" />
            <span className="text-sm font-semibold text-white/90">Tier Kamu Saat Ini</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{currentTier?.name ?? 'Bronze'}</p>
          <p className="text-xs text-white/80 mt-1">
            Cashback {currentTier?.cashback_percent ?? 0}% setiap transaksi
          </p>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between text-xs text-white/90 mb-1.5">
              <span>Total belanja: {formatCurrency(totalSpend)}</span>
              {nextTier && <span>{progressPct}%</span>}
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {nextTier ? (
              <p className="text-xs text-white/85 mt-2 flex items-center gap-1">
                <TrendingUp size={12} />
                {formatCurrency(remaining)} lagi menuju <strong>{nextTier.name}</strong>
              </p>
            ) : (
              <p className="text-xs text-white/85 mt-2">🎉 Kamu sudah di tier tertinggi!</p>
            )}
          </div>
        </div>

        {/* All tiers */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: MOCK.foreground }}>
            Semua Tier & Keuntungan
          </h2>
          <div className="space-y-3">
            {tiers.map((tier) => {
              const isCurrent = tier.id === currentTier?.id
              const unlocked = totalSpend >= tier.min_spend
              return (
                <div
                  key={tier.id}
                  className="rounded-[16px] p-4 flex items-center gap-4 transition-all hover-lift"
                  style={{
                    background: MOCK.bgMuted,
                    border: `1.5px solid ${isCurrent ? tier.badge_color : MOCK.border}`,
                    opacity: unlocked ? 1 : 0.7,
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${tier.badge_color}22` }}
                  >
                    <ShieldCheck size={22} style={{ color: tier.badge_color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: MOCK.foreground }}>
                        {tier.name}
                      </p>
                      {isCurrent && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ background: tier.badge_color }}
                        >
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: MOCK.foregroundMuted }}>
                      Cashback {tier.cashback_percent}% · Min. belanja {formatCurrency(tier.min_spend)}
                    </p>
                  </div>
                  {unlocked && (
                    <Check size={18} style={{ color: MOCK.success }} className="flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
