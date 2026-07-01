import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, QrCode, Landmark, Wallet, Store, Info } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { getCurrentUserProfile } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Metode Pembayaran' }
export const dynamic = 'force-dynamic'

const CHANNEL_GROUPS = [
  {
    title: 'QRIS',
    icon: QrCode,
    color: '#2563eb',
    desc: 'Scan & bayar dari semua aplikasi e-wallet/m-banking',
    items: ['QRIS (semua bank & e-wallet)'],
  },
  {
    title: 'Virtual Account',
    icon: Landmark,
    color: '#16a34a',
    desc: 'Transfer ke nomor VA, otomatis terverifikasi',
    items: ['BCA', 'BRI', 'BNI', 'Mandiri', 'Permata', 'CIMB Niaga'],
  },
  {
    title: 'E-Wallet',
    icon: Wallet,
    color: '#7c3aed',
    desc: 'Bayar langsung dari saldo dompet digital',
    items: ['DANA', 'OVO', 'GoPay', 'ShopeePay', 'LinkAja'],
  },
  {
    title: 'Gerai Retail',
    icon: Store,
    color: '#ea580c',
    desc: 'Bayar tunai di kasir minimarket terdekat',
    items: ['Alfamart', 'Indomaret'],
  },
]

export default async function MetodePembayaranPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun/metode-pembayaran')

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
        <h1 className="text-base font-bold" style={{ color: MOCK.foreground }}>Metode Pembayaran</h1>
      </header>

      <div className="px-4 py-5 space-y-4 animate-fade-in-up">
        <div
          className="flex items-start gap-3 rounded-[14px] p-4"
          style={{ background: `${MOCK.primary}12`, border: `1px solid ${MOCK.primary}33` }}
        >
          <Info size={18} style={{ color: MOCK.primaryLight }} className="flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: MOCK.foregroundMuted }}>
            Berikut metode pembayaran yang tersedia. Kamu dapat memilih metode saat checkout —
            semua pembayaran diproses aman melalui payment gateway resmi.
          </p>
        </div>

        {CHANNEL_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-[16px] overflow-hidden"
            style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${MOCK.border}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${group.color}22` }}>
                <group.icon size={20} style={{ color: group.color }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: MOCK.foreground }}>{group.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: MOCK.foregroundMuted }}>{group.desc}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="text-xs font-medium px-3 py-1.5 rounded-[10px]"
                  style={{ background: MOCK.bgCard, color: MOCK.foreground, border: `1px solid ${MOCK.border}` }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
