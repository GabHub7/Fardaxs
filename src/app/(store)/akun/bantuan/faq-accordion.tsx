'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'

interface Faq {
  id: string
  question: string
  answer: string
}

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: MOCK.bgMuted, border: `1px solid ${MOCK.border}` }}>
      {faqs.map((faq, i) => {
        const open = openId === faq.id
        return (
          <div key={faq.id} style={{ borderTop: i > 0 ? `1px solid ${MOCK.border}` : 'none' }}>
            <button
              onClick={() => setOpenId(open ? null : faq.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover-fade press-effect"
              aria-expanded={open}
            >
              <span className="flex-1 text-sm font-medium" style={{ color: MOCK.foreground }}>
                {faq.question}
              </span>
              <ChevronDown
                size={18}
                style={{
                  color: MOCK.foregroundMuted,
                  transition: 'transform 0.25s ease',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>
            <div
              style={{
                display: 'grid',
                gridTemplateRows: open ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.28s ease',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <p className="px-4 pb-4 text-xs leading-relaxed" style={{ color: MOCK.foregroundMuted }}>
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
