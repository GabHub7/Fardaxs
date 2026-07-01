'use client'

import { usePathname } from 'next/navigation'

/**
 * Re-mounts its children whenever the pathname changes (via the `key`), which
 * restarts the CSS enter animation on every navigation. Lightweight — no JS
 * animation loop, just a keyed fade-up handed to the GPU.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}
