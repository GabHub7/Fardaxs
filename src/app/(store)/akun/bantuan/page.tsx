import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Mail, HelpCircle } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'
import { getCurrentUserProfile } from '@/lib/supabase/server'
import { FaqAccordion } from './faq-accordion'

export const metadata: Metadata = { title: 'Bantuan & CS' }
export const dynamic = 'force-dynamic'

interface Faq { id: string; question: string; answer: string }

function settingValue(rows: { key: string; value: unknown }[] | null, key: string, fallback: string): string {
  const row = rows?.find((r) => r.key === key)
  if (!row || row.value == null) return fallback
  return typeof row.value === 'string' ? row.value : String(row.value)
}

export default async function BantuanPage() {
  const session = await getCurrentUserProfile()
  if (!session) redirect('/login?redirect=/akun/bantuan')

  const { serviceClient } = session

  const [{ data: faqsData }, { data: settingsData }] = await Promise.all([
    serviceClient
      .from('faqs')
      .select('id, question, answer')
      .eq('status', 'ACTIVE')
      .order('sort_order', { ascending: true })
      .limit(30),
    serviceClient.from('site_settings').select('key, value'),
  ])

  const faqs = (faqsData ?? []) as Faq[]
  const settings = (settingsData ?? null) as { key: string; value: unknown }[] | null

  const waNumber = settingValue(settings, 'whatsapp_number', '6281234567890').replace(/[^0-9]/g, '')
  const supportEmail = settingValue(settings, 'support_email', 'support@fardax.store')
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo CS Fardax Store, saya butuh bantuan.')}`

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
        <h1 className="text-base font-bold" style={{ color: MOCK.foreground }}>Bantuan & CS</h1>
      </header>

      <div className="px-4 py-5 space-y-5 animate-fade-in-up">
        {/* Contact CS */}
        <div>
          <h2 className="text-sm font-bold mb-2.5" style={{ color: MOCK.foreground }}>Hubungi Kami</h2>
          <div className="grid grid-cols-1 gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-[16px] p-4 press-effect hover-lift"
              style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#22c55e22' }}>
                <MessageCircle size={22} style={{ color: '#22c55e' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: MOCK.foreground }}>Chat WhatsApp CS</p>
                <p className="text-xs mt-0.5" style={{ color: MOCK.foregroundMuted }}>Respon cepat di jam operasional</p>
              </div>
            </a>

            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3 rounded-[16px] p-4 press-effect hover-lift"
              style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `${MOCK.primary}22` }}>
                <Mail size={22} style={{ color: MOCK.primaryLight }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: MOCK.foreground }}>Email Support</p>
                <p className="text-xs mt-0.5" style={{ color: MOCK.foregroundMuted }}>{supportEmail}</p>
              </div>
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-sm font-bold mb-2.5" style={{ color: MOCK.foreground }}>Pertanyaan Umum (FAQ)</h2>
          {faqs.length > 0 ? (
            <FaqAccordion faqs={faqs} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-[16px]" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: MOCK.bgCard }}>
                <HelpCircle size={26} style={{ color: MOCK.foregroundFaint }} />
              </div>
              <p className="text-xs text-center" style={{ color: MOCK.foregroundMuted }}>
                Belum ada FAQ. Hubungi CS kami untuk bantuan langsung.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
