import type { ReactNode } from 'react'
import Link from 'next/link'

interface PageHeaderProps {
  left: ReactNode
  right?: ReactNode
}

export function PageHeader({ left, right }: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 px-4 py-3"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{left}</div>
        {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
      </div>
    </header>
  )
}

export function HeaderIconButton({
  children,
  badge,
  ariaLabel,
  href,
}: {
  children: ReactNode
  badge?: ReactNode
  ariaLabel: string
  href?: string
}) {
  const content = (
    <span
      className="relative flex items-center justify-center w-9 h-9 rounded-full"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
    >
      {children}
      {badge}
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" aria-label={ariaLabel}>
      {content}
    </button>
  )
}
