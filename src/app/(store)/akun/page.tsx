import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
  ChevronRight, Settings, Ticket, ClipboardList, MapPin, CreditCard,
  ShieldCheck, Users, Bell, HelpCircle, Fingerprint, LogOut,
} from 'lucide-react'
import { PageHeader, HeaderIconButton } from '@/components/store/page-header'
import { MOCK } from '@/lib/mockup-colors'
import { formatCurrency } from '@/lib/utils'
import { getCurrentUserProfile, getWalletBalance } from '@/lib/supabase/server'
import { logoutAction } from '@/features/auth/actions'

export const metadata: Metadata = { title: 'Akun' }
export const dynamic = 'force-dynamic'

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; color?: string }>
  trailing?: string
  trailingColor?: string
}

export default async function AkunPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun')

  const { profile, serviceClient } = session

  const [walletBalance, { count: voucherCount }] = await Promise.all([
    getWalletBalance(serviceClient, profile.id),
    serviceClient
      .from('user_vouchers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'AVAILABLE'),
  ])

  const tierName = profile.membershipTier?.name ?? 'Bronze'
  const memberId = `FDX${profile.id.slice(0, 5).toUpperCase()}`

  const menuGroup1: MenuItem[] = [
    {
      label: 'Voucher Saya',
      href: '/akun/voucher',
      icon: Ticket,
      trailing: voucherCount && voucherCount > 0 ? `${voucherCount} Voucher` : undefined,
    },
    { label: 'Riwayat Pesanan', href: '/riwayat', icon: ClipboardList },
    { label: 'Daftar Alamat', href: '/akun/alamat', icon: MapPin },
    { label: 'Metode Pembayaran', href: '/akun/metode-pembayaran', icon: CreditCard },
    { label: 'Membership', href: '/akun/membership', icon: ShieldCheck, trailing: tierName },
  ]

  const menuGroup2: MenuItem[] = [
    { label: 'Referral Program', href: '/akun/referral', icon: Users, trailing: 'Dapatkan Komisi' },
    { label: 'Notifikasi', href: '/akun/notifikasi', icon: Bell },
    { label: 'Bantuan & CS', href: '/akun/bantuan', icon: HelpCircle },
  ]

  const menuGroup3: MenuItem[] = [
    { label: 'Pengaturan', href: '/akun/pengaturan', icon: Settings },
    { label: 'Keamanan Akun', href: '/akun/keamanan', icon: Fingerprint },
  ]

  return (
    <div className="pb-6">
      <PageHeader
        left={<span />}
        right={
          <HeaderIconButton ariaLabel="Pengaturan" href="/akun/pengaturan">
            <Settings size={18} style={{ color: MOCK.foreground }} />
          </HeaderIconButton>
        }
      />

      <div className="px-4 pt-1 space-y-5">
        {/* Profile card */}
        <Link href="/akun/profil" className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-14 h-14 rounded-full shrink-0"
            style={{ background: `linear-gradient(135deg, ${MOCK.gradientFrom}, ${MOCK.gradientTo})`, padding: 2 }}
          >
            <span
              className="flex items-center justify-center w-full h-full rounded-full"
              style={{ background: MOCK.bg }}
            >
              <FardaxMark />
            </span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold truncate" style={{ color: MOCK.foreground }}>
              {profile.fullName ?? 'Pengguna Fardax'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: MOCK.foregroundMuted }}>
              ID Member: {memberId}
            </p>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1.5"
              style={{ background: MOCK.bgMuted, color: MOCK.foregroundMuted }}
            >
              <ShieldCheck size={11} style={{ color: profile.membershipTier?.badgeColor ?? MOCK.primaryLight }} />
              {tierName} Member
            </span>
          </div>
          <ChevronRight size={18} style={{ color: MOCK.foregroundMuted }} />
        </Link>

        {/* Saldo card */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
        >
          <p className="text-xs mb-1" style={{ color: MOCK.foregroundMuted }}>
            Saldo Anda
          </p>
          <p className="text-2xl font-bold mb-4" style={{ color: MOCK.foreground }}>
            {formatCurrency(walletBalance)}
          </p>
          <Link
            href="/akun/topup"
            className="block text-center py-3 rounded-[12px] text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
          >
            Top Up Saldo
          </Link>
        </div>

        {/* Menu Akun */}
        <section>
          <h2 className="text-sm font-bold mb-2.5" style={{ color: MOCK.foreground }}>
            Menu Akun
          </h2>
          <MenuGroup items={menuGroup1} />
        </section>

        <MenuGroup items={menuGroup2} />
        <MenuGroup items={menuGroup3} />

        {/* Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-semibold"
            style={{ border: `1.5px solid ${MOCK.destructive}`, color: MOCK.destructive }}
          >
            <LogOut size={16} />
            Keluar
          </button>
        </form>
      </div>
    </div>
  )
}

function MenuGroup({ items }: { items: MenuItem[] }) {
  return (
    <div
      className="rounded-[16px] overflow-hidden"
      style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
    >
      {items.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderTop: i > 0 ? `1px solid ${MOCK.border}` : 'none' }}
        >
          <item.icon size={18} color={MOCK.foregroundMuted} strokeWidth={1.8} />
          <span className="flex-1 text-sm" style={{ color: MOCK.foreground }}>
            {item.label}
          </span>
          {item.trailing && (
            <span className="text-xs" style={{ color: item.trailingColor ?? MOCK.foregroundFaint }}>
              {item.trailing}
            </span>
          )}
          <ChevronRight size={16} style={{ color: MOCK.foregroundFaint }} />
        </Link>
      ))}
    </div>
  )
}

function FardaxMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="fardaxMarkGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#fardaxMarkGradient)"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M12 8 V24" />
        <path d="M12 8 H22" />
        <path d="M12 15.5 H20" />
      </g>
    </svg>
  )
}
