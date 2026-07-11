import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Gift, Wallet, UserCheck } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { formatCurrency } from '@/lib/utils'
import { getCurrentUserProfile } from '@/lib/supabase/server'
import { ReferralActions } from './referral-actions'

export const metadata: Metadata = { title: 'Referral Program' }
export const dynamic = 'force-dynamic'

function makeCode(userId: string): string {
  return ('FDX' + userId.replace(/-/g, '').slice(0, 6)).toUpperCase()
}

export default async function ReferralPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun/referral')

  const { profile, serviceClient } = session

  // Ensure the user has a referral code (create one on first visit).
  let code = makeCode(profile.id)
  const { data: existing } = await serviceClient
    .from('referral_codes')
    .select('code')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing?.code) {
    code = existing.code as string
  } else {
    const { data: inserted } = await serviceClient
      .from('referral_codes')
      .insert({ user_id: profile.id, code })
      .select('code')
      .maybeSingle()
    if (inserted?.code) code = inserted.code as string
  }

  // Referral stats
  const { data: referrals } = await serviceClient
    .from('referrals')
    .select('id, status, commission_amount, created_at, referred_user_id')
    .eq('referrer_user_id', profile.id)
    .order('created_at', { ascending: false })

  const list = referrals ?? []
  const totalInvited = list.length
  const totalQualified = list.filter(
    (r) => (r as { status: string }).status === 'QUALIFIED' || (r as { status: string }).status === 'REWARDED'
  ).length
  const totalCommission = list.reduce(
    (s, r) => s + ((r as { commission_amount: number }).commission_amount ?? 0),
    0
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fardax.store'
  const shareUrl = `${appUrl}/daftar?ref=${code}`

  const stats = [
    { label: 'Total Diajak', value: totalInvited.toString(), icon: Users, color: MOCK.primaryLight },
    { label: 'Berhasil', value: totalQualified.toString(), icon: UserCheck, color: MOCK.success },
    { label: 'Total Komisi', value: formatCurrency(totalCommission), icon: Wallet, color: '#EAB308' },
  ]

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
        <h1 className="text-base font-bold" style={{ color: MOCK.foreground }}>Referral Program</h1>
      </header>

      <div className="px-4 py-5 space-y-5 animate-fade-in-up">
        {/* Hero */}
        <div
          className="rounded-[22px] p-5 text-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
        >
          <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
            <Gift size={26} className="text-white" />
          </div>
          <p className="text-lg font-extrabold text-white">Ajak Teman, Dapat Komisi</p>
          <p className="text-xs text-white/85 mt-1 max-w-xs mx-auto">
            Bagikan kode referralmu. Setiap teman yang mendaftar & bertransaksi, kamu dapat komisi ke saldo.
          </p>
        </div>

        {/* Code + share actions (client) */}
        <ReferralActions code={code} shareUrl={shareUrl} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-[14px] p-3 text-center"
              style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
            >
              <s.icon size={18} style={{ color: s.color }} className="mx-auto mb-1.5" />
              <p className="text-sm font-bold" style={{ color: MOCK.foreground }}>{s.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: MOCK.foregroundMuted }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-[16px] p-4" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: MOCK.foreground }}>Cara Kerja</p>
          <ol className="space-y-2.5">
            {[
              'Bagikan kode referral kamu ke teman.',
              'Teman mendaftar memakai kode tersebut.',
              'Teman menyelesaikan transaksi pertama.',
              'Komisi otomatis masuk ke saldo kamu.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: MOCK.primary }}
                >
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed" style={{ color: MOCK.foregroundMuted }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Invited friends list */}
        {totalInvited > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-2.5" style={{ color: MOCK.foreground }}>Teman yang Diajak</h2>
            <div className="rounded-[16px] overflow-hidden" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
              {list.map((r, i) => {
                const status = (r as { status: string }).status
                const statusLabel =
                  status === 'REWARDED' ? 'Komisi Diberikan' : status === 'QUALIFIED' ? 'Memenuhi Syarat' : 'Menunggu'
                const statusColor =
                  status === 'REWARDED' ? MOCK.success : status === 'QUALIFIED' ? MOCK.primaryLight : MOCK.warning
                return (
                  <div
                    key={(r as { id: string }).id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: i > 0 ? `1px solid ${MOCK.border}` : 'none' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: MOCK.bgCard }}>
                        <Users size={15} style={{ color: MOCK.foregroundMuted }} />
                      </div>
                      <span className="text-xs" style={{ color: MOCK.foreground }}>
                        Teman #{totalInvited - i}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
