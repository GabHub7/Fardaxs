import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { getCurrentUserProfile, getWalletBalance } from '@/lib/supabase/server'
import { TopUpClient } from './topup-client'

export const metadata: Metadata = { title: 'Top Up Saldo' }
export const dynamic = 'force-dynamic'

interface RecentMutation {
  id: string
  type: string
  amount: number
  description: string | null
  created_at: string
}

export default async function TopUpPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun/topup')

  const [balance, { data: recentData }] = await Promise.all([
    getWalletBalance(session.serviceClient, session.profile.id),
    session.serviceClient
      .from('wallet_mutations')
      .select('id, type, amount, description, created_at')
      .eq('user_id', session.profile.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

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
        <h1 className="text-base font-bold" style={{ color: MOCK.foreground }}>Top Up Saldo</h1>
      </header>

      <TopUpClient balance={balance} recent={(recentData ?? []) as RecentMutation[]} />
    </div>
  )
}
