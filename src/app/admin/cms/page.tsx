import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Banner, Testimonial, FAQ } from '@/types'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

const TABS = [
  { label: 'Banner', value: 'banner' },
  { label: 'Testimoni', value: 'testimoni' },
  { label: 'FAQ', value: 'faq' },
]

export const dynamic = 'force-dynamic'

export default async function CmsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const activeTab = params.tab ?? 'banner'

  const supabase = createServiceClient()

  const [bannersRes, testimonialsRes, faqsRes] = await Promise.allSettled([
    supabase.from('banners').select('*').order('sort_order', { ascending: true }),
    supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
    supabase.from('faqs').select('*').order('sort_order', { ascending: true }),
  ])

  const banners = (bannersRes.status === 'fulfilled' ? bannersRes.value.data ?? [] : []) as Banner[]
  const testimonials = (testimonialsRes.status === 'fulfilled' ? testimonialsRes.value.data ?? [] : []) as Testimonial[]
  const faqs = (faqsRes.status === 'fulfilled' ? faqsRes.value.data ?? [] : []) as FAQ[]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Manajemen Konten
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Banner, testimoni, dan FAQ
          </p>
        </div>
        {activeTab === 'banner' && (
          <Link
            href="/admin/cms/banner/baru"
            className="px-4 py-2 rounded-[12px] text-sm font-semibold"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground, 0 0% 100%))',
            }}
          >
            + Tambah Banner
          </Link>
        )}
        {activeTab === 'testimoni' && (
          <Link
            href="/admin/cms/testimoni/baru"
            className="px-4 py-2 rounded-[12px] text-sm font-semibold"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground, 0 0% 100%))',
            }}
          >
            + Tambah Testimoni
          </Link>
        )}
        {activeTab === 'faq' && (
          <Link
            href="/admin/cms/faq/baru"
            className="px-4 py-2 rounded-[12px] text-sm font-semibold"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground, 0 0% 100%))',
            }}
          >
            + Tambah FAQ
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex gap-1 p-3">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value
            return (
              <Link
                key={tab.value}
                href={`/admin/cms?tab=${tab.value}`}
                className="px-4 py-2 rounded-[12px] text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--background-muted))',
                  color: isActive ? 'hsl(var(--primary-foreground, 0 0% 100%))' : 'hsl(var(--foreground-muted))',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Banner Tab */}
      {activeTab === 'banner' && (
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          {banners.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Belum ada banner. <Link href="/admin/cms/banner/baru" className="underline" style={{ color: 'hsl(var(--primary))' }}>Tambah sekarang →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Urutan', 'Judul', 'Gambar', 'Link', 'Status', 'Aksi'].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {banners.map((banner, i) => (
                    <tr
                      key={banner.id}
                      className="hover:opacity-80"
                      style={{ borderBottom: i < banners.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined }}
                    >
                      <td className="px-4 py-3 text-center font-mono text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {banner.sort_order}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {banner.title}
                      </td>
                      <td className="px-4 py-3">
                        {banner.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={banner.image_url} alt={banner.title} className="h-10 w-20 object-cover rounded-[8px]" />
                        ) : <span style={{ color: 'hsl(var(--foreground-muted))' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {banner.link_url ? `${banner.link_url.slice(0, 30)}…` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={banner.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/cms/banner/${banner.id}/edit`}
                          className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                          style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Testimoni Tab */}
      {activeTab === 'testimoni' && (
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          {testimonials.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Belum ada testimoni.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Pelanggan', 'Pesan', 'Rating', 'Aksi'].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testimonials.map((t, i) => (
                    <tr
                      key={t.id}
                      className="hover:opacity-80"
                      style={{ borderBottom: i < testimonials.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined }}
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>{t.customer_name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[300px]" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        <span className="line-clamp-2">{t.message}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--warning))' }}>
                          {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/cms/testimoni/${t.id}/edit`}
                          className="px-3 py-1.5 rounded-[12px] text-xs font-medium"
                          style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          {faqs.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
              Belum ada FAQ.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border-subtle))' }}>
              {faqs.map((faq, i) => (
                <div
                  key={faq.id}
                  className="px-5 py-4 flex items-start justify-between gap-4 hover:opacity-80"
                  style={{ borderBottom: i < faqs.length - 1 ? '1px solid hsl(var(--border-subtle))' : undefined }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                      <span className="font-mono text-xs mr-2" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        {faq.sort_order}.
                      </span>
                      {faq.question}
                    </p>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'hsl(var(--foreground-muted))' }}>
                      {faq.answer}
                    </p>
                  </div>
                  <Link
                    href={`/admin/cms/faq/${faq.id}/edit`}
                    className="px-3 py-1.5 rounded-[12px] text-xs font-medium flex-shrink-0"
                    style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: isActive ? 'hsl(var(--success) / 0.15)' : 'hsl(var(--foreground-muted) / 0.15)',
        color: isActive ? 'hsl(var(--success))' : 'hsl(var(--foreground-muted))',
      }}
    >
      {isActive ? 'Aktif' : 'Tidak Aktif'}
    </span>
  )
}
