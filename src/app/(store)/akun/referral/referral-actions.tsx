'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { MOCK } from '@/lib/mockup-colors'

export function ReferralActions({ code, shareUrl }: { code: string; shareUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function share() {
    const text = `Yuk belanja di Fardax Store pakai kode referral aku: ${code} — ${shareUrl}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Fardax Store', text, url: shareUrl })
        return
      } catch {
        // user cancelled — fall through to copy
      }
    }
    copy(text)
  }

  return (
    <div className="space-y-3">
      {/* Code box with copy */}
      <button
        onClick={() => copy(code)}
        className="w-full flex items-center gap-3 rounded-[14px] p-4 press-effect transition-all"
        style={{ background: MOCK.bgCard, border: `1.5px dashed ${MOCK.primary}` }}
      >
        <div className="flex-1 text-left">
          <p className="text-[11px] mb-0.5" style={{ color: MOCK.foregroundMuted }}>Kode Referral</p>
          <p className="text-xl font-extrabold tracking-widest" style={{ color: MOCK.primaryLight }}>
            {code}
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-[10px] transition-all"
          style={{
            background: copied ? MOCK.successBg : `${MOCK.primary}1a`,
            color: copied ? MOCK.success : MOCK.primaryLight,
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Tersalin' : 'Salin'}
        </span>
      </button>

      {/* Share button */}
      <button
        onClick={share}
        className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-semibold text-white press-effect transition-transform"
        style={{ background: `linear-gradient(135deg, ${MOCK.primary}, #6366F1)` }}
      >
        <Share2 size={16} />
        Bagikan ke Teman
      </button>
    </div>
  )
}
