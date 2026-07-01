'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Power } from 'lucide-react'
import { applyTheme, getStoredTheme, type ThemeName } from '@/lib/theme'

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeName>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTheme(getStoredTheme()); setMounted(true) }, [])

  function toggle() {
    const next: ThemeName = theme === 'light' ? 'dark' : 'light'
    applyTheme(next); setTheme(next)
  }

  if (!mounted) return <div className={`w-9 h-9 ${className ?? ''}`} />
  return (
    <button type="button" onClick={toggle}
      className={`press-effect flex items-center justify-center w-9 h-9 rounded-full ${className ?? ''}`}
      style={{ background:'var(--bg-tertiary)', border:'1px solid var(--border)', color:'var(--text-secondary)' }}
      aria-label={theme === 'light' ? 'Mode gelap' : 'Mode terang'}>
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}

/**
 * Theme control rendered as an on/off SAKLAR (switch) — not a sun/moon button.
 * Light = ON (knob right, brand-gradient track); Dark = OFF (knob left, grey).
 * Default is light, so the switch starts in the ON position.
 */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeName>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTheme(getStoredTheme()); setMounted(true) }, [])

  function toggle() {
    const next: ThemeName = theme === 'light' ? 'dark' : 'light'
    applyTheme(next); setTheme(next)
  }

  if (!mounted) return <div className="h-[52px]" />

  const isOn = theme === 'light' // light = ON

  return (
    <div
      className="flex items-center justify-between rounded-[14px] px-4 py-3"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {isOn ? 'Mode Terang' : 'Mode Gelap'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Saklar {isOn ? 'ON — tampilan terang' : 'OFF — tampilan gelap'}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label="Ganti tema terang/gelap"
        onClick={toggle}
        className="press-effect relative flex-shrink-0"
        style={{
          width: 64, height: 34, borderRadius: 999,
          background: isOn
            ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 52%, #ec4899 100%)'
            : 'var(--border)',
          transition: 'background 0.3s ease',
          boxShadow: isOn ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
        }}
      >
        {/* ON / OFF label */}
        <span
          className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wide"
          style={{
            left: isOn ? 9 : 'auto',
            right: isOn ? 'auto' : 9,
            color: isOn ? 'rgba(255,255,255,0.95)' : 'var(--text-muted)',
          }}
        >
          {isOn ? 'ON' : 'OFF'}
        </span>
        {/* Sliding knob */}
        <span
          className="absolute top-1/2 flex items-center justify-center rounded-full bg-white"
          style={{
            width: 28, height: 28,
            left: isOn ? 33 : 3,
            transform: 'translateY(-50%)',
            transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          }}
        >
          <Power size={13} style={{ color: isOn ? '#7c3aed' : 'var(--text-muted)' }} strokeWidth={2.5} />
        </span>
      </button>
    </div>
  )
}
