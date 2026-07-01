import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Smartphone, Wifi, Zap, Droplet, Users, Tv, Globe, Wallet,
  Gamepad2, CalendarClock, Receipt, ShieldCheck, Hotel as HotelIcon,
  TrainFront, Plane, FileText, MoreHorizontal,
} from 'lucide-react'
import { PageHeader } from '@/components/store/page-header'
import { MOCK } from '@/lib/mockup-colors'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'PPOB',
  description: 'Bayar tagihan dan beli pulsa, token listrik, paket data, dan layanan PPOB lainnya.',
}
export const dynamic = 'force-dynamic'

interface PpobService {
  label: string
  slug: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; color?: string }>
  iconColor: string
  tileBg: string
}

const SERVICES: PpobService[] = [
  { label: 'Pulsa', slug: 'pulsa', icon: Smartphone, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Paket Data', slug: 'paket-data', icon: Wifi, iconColor: '#A78BFA', tileBg: '#211B3D' },
  { label: 'PLN Token', slug: 'pln-token', icon: Zap, iconColor: '#FACC15', tileBg: '#332A12' },
  { label: 'PDAM', slug: 'pdam', icon: Droplet, iconColor: '#38BDF8', tileBg: '#102230' },
  { label: 'BPJS', slug: 'bpjs', icon: Users, iconColor: '#4ADE80', tileBg: '#102818' },
  { label: 'Telkom', slug: 'telkom', icon: Globe, iconColor: '#F87171', tileBg: '#301414' },
  { label: 'TV Kabel', slug: 'tv-kabel', icon: Tv, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Internet', slug: 'internet', icon: Globe, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'e-Wallet', slug: 'e-wallet', icon: Wallet, iconColor: '#818CF8', tileBg: '#1C1F3D' },
  { label: 'Voucher Game', slug: 'voucher-game', icon: Gamepad2, iconColor: '#A78BFA', tileBg: '#211B3D' },
  { label: 'Angsuran', slug: 'angsuran', icon: CalendarClock, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Pajak', slug: 'pajak', icon: Receipt, iconColor: '#4ADE80', tileBg: '#102818' },
  { label: 'Asuransi', slug: 'asuransi', icon: ShieldCheck, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Hotel', slug: 'hotel', icon: HotelIcon, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Tiket Kereta', slug: 'tiket-kereta', icon: TrainFront, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Tiket Pesawat', slug: 'tiket-pesawat', icon: Plane, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Pascabayar', slug: 'pascabayar', icon: FileText, iconColor: '#60A5FA', tileBg: '#16233D' },
  { label: 'Lainnya', slug: 'lainnya', icon: MoreHorizontal, iconColor: '#9CA3AF', tileBg: '#1A1F2B' },
]

export default async function PPOBPage() {
  const serviceClient = createServiceClient()

  // Used to know which services actually have purchasable products, so we
  // can quietly skip linking to an empty category page.
  const { data: ppobCategory } = await serviceClient
    .from('categories')
    .select('id')
    .eq('slug', 'ppob')
    .maybeSingle()

  return (
    <div className="pb-6">
      <PageHeader
        left={
          <h1 className="text-xl font-bold" style={{ color: MOCK.foreground }}>
            PPOB
          </h1>
        }
      />

      <div className="px-4 pt-4 space-y-5">
        {/* Hero banner */}
        <div
          className="relative overflow-hidden rounded-[20px] px-5 py-6"
          style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #1D4ED8)` }}
        >
          <PhoneIllustration />
          <div className="relative max-w-[62%]">
            <p className="text-lg leading-snug font-bold text-white">
              Bayar Tagihan Jadi Lebih Mudah &amp; Praktis
            </p>
          </div>
        </div>

        {/* Kategori Layanan */}
        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: MOCK.foreground }}>
            Kategori Layanan
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {SERVICES.map((service) => (
              <Link
                key={service.slug}
                href={
                  ppobCategory
                    ? `/produk?kategori=ppob&layanan=${service.slug}`
                    : '/produk?kategori=ppob'
                }
                className="flex flex-col items-center justify-center gap-2 rounded-[16px] py-4"
                style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
              >
                <span
                  className="flex items-center justify-center w-11 h-11 rounded-[12px]"
                  style={{ background: service.tileBg }}
                >
                  <service.icon size={20} color={service.iconColor} strokeWidth={2} />
                </span>
                <span className="text-[11px] text-center leading-tight" style={{ color: MOCK.foregroundMuted }}>
                  {service.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function PhoneIllustration() {
  return (
    <svg
      viewBox="0 0 140 140"
      className="absolute right-3 top-1/2 -translate-y-1/2 w-32 h-32 opacity-95"
      aria-hidden="true"
    >
      <g fill="white" opacity="0.06">
        <circle cx="70" cy="70" r="62" />
      </g>
      {/* sparkles */}
      <g fill="white" opacity="0.6">
        <path d="M22 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
        <path d="M118 90 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
      </g>
      {/* phone body */}
      <rect x="40" y="18" width="56" height="100" rx="10" fill="#E8EFFE" stroke="#BFD3FB" strokeWidth="1.5" />
      <rect x="46" y="28" width="44" height="62" rx="3" fill="#C9D9FB" />
      {/* line placeholders */}
      <rect x="50" y="34" width="20" height="5" rx="2.5" fill="#9FB7F2" />
      <rect x="50" y="44" width="36" height="4" rx="2" fill="#A9C0F4" />
      <rect x="50" y="52" width="30" height="4" rx="2" fill="#A9C0F4" />
      <rect x="50" y="60" width="33" height="4" rx="2" fill="#A9C0F4" />
      {/* home indicator */}
      <rect x="58" y="106" width="20" height="4" rx="2" fill="#9FB7F2" />
      {/* check badge */}
      <circle cx="100" cy="55" r="14" fill="#22C55E" stroke="#16A34A" strokeWidth="1.5" />
      <path d="M94 55 l4 4 8 -8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
