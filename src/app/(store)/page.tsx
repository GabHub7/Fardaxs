import Link from 'next/link'
import Image from 'next/image'
import {
  Bell, ChevronRight, Plus, ShieldCheck, Star,
  Smartphone, Wifi, Zap, Droplet, Gamepad2, Wallet, Tv, MoreHorizontal,
} from 'lucide-react'
import { PageHeader, HeaderIconButton } from '@/components/store/page-header'
import { PromoBanner, type PromoSlide } from '@/components/store/promo-banner'
import { FlashSaleCountdown } from '@/components/store/flash-sale-countdown'
import { CategoryIcon } from '@/components/store/category-icon'
import { ProductLogo } from '@/components/store/product-logo'
import { formatCurrency } from '@/lib/utils'
import {
  createClient,
  createServiceClient,
  getCurrentUserProfile,
  getWalletBalance,
} from '@/lib/supabase/server'
import type { Category, Product } from '@/types'

export const dynamic = 'force-dynamic'

/** Top PPOB services surfaced on the homepage for one-tap access. */
const PPOB_QUICK = [
  { label: 'Pulsa', slug: 'pulsa', icon: Smartphone, color: '#60A5FA', bg: 'rgba(37,99,235,0.12)' },
  { label: 'Paket Data', slug: 'paket-data', icon: Wifi, color: '#A78BFA', bg: 'rgba(124,58,237,0.12)' },
  { label: 'PLN Token', slug: 'pln-token', icon: Zap, color: '#FACC15', bg: 'rgba(234,179,8,0.14)' },
  { label: 'PDAM', slug: 'pdam', icon: Droplet, color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  { label: 'e-Wallet', slug: 'e-wallet', icon: Wallet, color: '#818CF8', bg: 'rgba(99,102,241,0.12)' },
  { label: 'Voucher Game', slug: 'voucher-game', icon: Gamepad2, color: '#F472B6', bg: 'rgba(236,72,153,0.12)' },
  { label: 'TV Kabel', slug: 'tv-kabel', icon: Tv, color: '#34D399', bg: 'rgba(16,185,129,0.12)' },
  { label: 'Lainnya', slug: 'lainnya', icon: MoreHorizontal, color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' },
] as const

export default async function BerandaPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()

  const session = authUser ? await getCurrentUserProfile() : null

  const [{ data: categories }, { data: featured }] = await Promise.all([
    serviceClient
      .from('categories')
      .select('id, name, slug, color, sort_order, icon_url, banner_url')
      .eq('status', 'ACTIVE')
      .neq('slug', 'ppob')
      .order('sort_order', { ascending: true })
      .limit(5),
    serviceClient
      .from('products')
      .select('id, name, slug, image_url, selling_price, reseller_price, is_featured, status')
      .eq('status', 'ACTIVE')
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(6),
  ])

  let walletBalance = 0
  let unreadCount = 0

  if (session) {
    const [balance, notifResult] = await Promise.all([
      getWalletBalance(session.serviceClient, session.profile.id),
      serviceClient
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.profile.id)
        .neq('status', 'READ'),
    ])
    walletBalance = balance
    unreadCount = notifResult.count ?? 0
  }

  const bestSellers: Product[] = (featured ?? []).slice(0, 3) as unknown as Product[]
  const popularProducts: Product[] = (featured ?? []) as unknown as Product[]

  const promoSlides: PromoSlide[] = [
    {
      id: 'cashback-20',
      tag: 'SPESIAL PROMO',
      title: 'CASHBACK 20%',
      subtitle: 'Untuk semua produk',
      ctaText: 'Belanja Sekarang',
      ctaHref: '/produk',
    },
  ]

  return (
    <div className="pb-6">
      <PageHeader
        left={
          /* Logo only shown on mobile — desktop sidebar already has it */
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <Image src="/logo.png" alt="FardaxStore" width={30} height={30} priority style={{ objectFit: 'contain' }} />
            <span className="brand-wordmark text-base">FardaxStore</span>
          </Link>
        }
        right={
          <HeaderIconButton
            ariaLabel="Notifikasi"
            href="/akun/notifikasi"
            badge={
              unreadCount > 0 ? (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ background: '#dc2626', border: '1.5px solid var(--bg-secondary)' }}
                />
              ) : null
            }
          >
            <Bell size={17} style={{ color: 'var(--text-primary)' }} />
          </HeaderIconButton>
        }
      />

      <div className="px-4 pt-4 space-y-5">
        {/* Balance card */}
        {session ? (
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 52%, #ec4899 100%)',
            }}
          >
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-white/70">Saldo Anda</p>
              <Link
                href="/akun/topup"
                aria-label="Top up saldo"
                className="flex items-center justify-center w-8 h-8 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <Plus size={16} className="text-white" />
              </Link>
            </div>
            <p className="text-2xl font-bold text-white mb-3">
              {formatCurrency(walletBalance)}
            </p>
            <Link href="/akun/membership" className="flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
              >
                <ShieldCheck size={13} style={{ color: session.profile.membershipTier?.badgeColor ?? '#ffffff' }} />
                Member {session.profile.membershipTier?.name ?? 'Bronze'}
              </span>
              <ChevronRight size={16} className="text-white/70" />
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="block rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 52%, #ec4899 100%)',
            }}
          >
            <p className="text-sm font-semibold text-white mb-1">
              Masuk untuk melihat saldo Anda
            </p>
            <p className="text-xs text-white/70">
              Login atau daftar untuk mulai belanja →
            </p>
          </Link>
        )}

        {/* Promo banner */}
        <PromoBanner slides={promoSlides} />

        {/* Layanan PPOB — quick access (client request: PPOB tampil di beranda) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Layanan PPOB
            </h2>
            <Link
              href="/ppob"
              className="flex items-center gap-0.5 text-xs font-medium"
              style={{ color: '#7c3aed' }}
            >
              Lihat Semua <ChevronRight size={13} />
            </Link>
          </div>
          <div
            className="grid grid-cols-4 md:grid-cols-8 gap-2.5 rounded-2xl p-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            {PPOB_QUICK.map((s) => (
              <Link
                key={s.slug}
                href={`/produk?kategori=ppob&layanan=${s.slug}`}
                className="group flex flex-col items-center gap-1.5 press-effect"
              >
                <span
                  className="flex items-center justify-center w-12 h-12 rounded-2xl transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
                  style={{ background: s.bg }}
                >
                  <s.icon size={20} color={s.color} strokeWidth={2} />
                </span>
                <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>
                  {s.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Kategori Populer */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Kategori Populer
            </h2>
            <Link
              href="/produk"
              className="flex items-center gap-0.5 text-xs font-medium"
              style={{ color: '#2563eb' }}
            >
              Lihat Semua <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {((categories ?? []) as Category[]).map((cat) => {
              const cover = cat.icon_url ?? cat.banner_url
              const hasCover = !!cover && (cover.startsWith('http') || cover.startsWith('/'))
              return (
                <Link
                  key={cat.id}
                  href={`/produk?kategori=${cat.slug}`}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className="relative flex items-center justify-center w-full aspect-square md:w-16 md:h-16 md:aspect-auto rounded-2xl overflow-hidden hover-lift press-effect"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    {hasCover ? (
                      <Image
                        src={cover}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 768px) 20vw, 180px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <CategoryIcon slug={cat.slug} color={cat.color} size={30} />
                    )}
                  </span>
                  <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>
                    {cat.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Produk Populer — horizontal scroll */}
        {popularProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Produk Populer
              </h2>
              <Link
                href="/produk"
                className="flex items-center gap-0.5 text-xs font-medium"
                style={{ color: '#2563eb' }}
              >
                Lihat Semua <ChevronRight size={13} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
              {popularProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/produk/${p.slug}`}
                  className="flex-none w-28 rounded-2xl p-3 hover-lift press-effect"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                >
                  <ProductLogo imageUrl={p.image_url} name={p.name} size={44} className="mb-2 mx-auto" />
                  <p className="text-[11px] font-semibold leading-tight line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: '#2563eb' }}>
                    {formatCurrency(p.selling_price)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Produk Terlaris — list cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Produk Terlaris
            </h2>
            <Link
              href="/produk"
              className="flex items-center gap-0.5 text-xs font-medium"
              style={{ color: '#2563eb' }}
            >
              Lihat Semua <ChevronRight size={13} />
            </Link>
          </div>

          {bestSellers.length === 0 ? (
            <EmptyProductsHint />
          ) : (
            <div className="space-y-2.5">
              {bestSellers.map((p) => (
                <Link
                  key={p.id}
                  href={`/produk/${p.slug}`}
                  className="flex items-center gap-3 rounded-2xl p-3 hover-lift press-effect"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                >
                  <ProductLogo imageUrl={p.image_url} name={p.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Mulai dari
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#2563eb' }}>
                      {formatCurrency(p.selling_price)}
                    </p>
                  </div>
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
                    style={{ background: 'var(--accent-light)' }}
                  >
                    <ChevronRight size={15} style={{ color: '#2563eb' }} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function EmptyProductsHint() {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <Star size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Belum ada produk unggulan saat ini
      </p>
    </div>
  )
}
