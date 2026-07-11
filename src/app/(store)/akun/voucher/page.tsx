import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Ticket } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { getCurrentUserProfile } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Voucher Saya' }
export const dynamic = 'force-dynamic'

export default async function VoucherPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun/voucher')

  const { data: vouchers } = await session.serviceClient
    .from('user_vouchers')
    .select('id, status, vouchers(code, discount_type, discount_value, min_purchase, expired_at)')
    .eq('user_id', session.profile.id)
    .eq('status', 'AVAILABLE')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen" style={{ background: MOCK.bg }}>
      <header
        className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3"
        style={{ background: MOCK.bg, borderBottom: `1px solid ${MOCK.borderSubtle}` }}
      >
        <Link href="/akun" className="flex items-center justify-center w-10 h-10 rounded-full" style={{ background: MOCK.bgCard }}>
          <ArrowLeft size={18} style={{ color: MOCK.foreground }} />
        </Link>
        <h1 className="text-base font-bold" style={{ color: MOCK.foreground }}>Voucher Saya</h1>
      </header>

      <div className="px-4 py-4 space-y-3">
        {(!vouchers || vouchers.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: MOCK.bgMuted }}>
              <Ticket size={28} style={{ color: MOCK.foregroundFaint }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: MOCK.foreground }}>Belum Ada Voucher</p>
            <p className="text-xs text-center" style={{ color: MOCK.foregroundMuted }}>
              Voucher akan muncul di sini setelah kamu mendapatkannya
            </p>
          </div>
        ) : (
          vouchers.map((uv) => {
            const raw = uv.vouchers
            const v = (Array.isArray(raw) ? raw[0] : raw) as { code: string; discount_type: string; discount_value: number; min_purchase: number; expired_at: string } | null
            if (!v) return null
            const discLabel = v.discount_type === 'PERCENTAGE' ? `${v.discount_value}%` : `Rp ${v.discount_value.toLocaleString('id-ID')}`
            const expiry = new Date(v.expired_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <div
                key={uv.id}
                className="rounded-[16px] p-4 flex items-center gap-4"
                style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}>
                  <Ticket size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: MOCK.foreground }}>{v.code}</p>
                  <p className="text-xs mt-0.5" style={{ color: MOCK.primaryLight }}>Diskon {discLabel}</p>
                  <p className="text-xs mt-0.5" style={{ color: MOCK.foregroundMuted }}>
                    Min. Rp {v.min_purchase.toLocaleString('id-ID')} · s/d {expiry}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
